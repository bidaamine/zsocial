import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ThreatDetectionService } from './threat-detection.service';

@Injectable()
export class ZeroTrustGuard implements CanActivate {
  private readonly logger = new Logger(ZeroTrustGuard.name);

  private cachedPublicKey: string | null = null;
  private cacheExpiry: number = 0;

  private readonly AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4100';

  constructor(private readonly threatDetectionService: ThreatDetectionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('Zero-Trust Violation: Missing Authorization Header');
      throw new UnauthorizedException('Zero-Trust Policy: Missing Authorization Header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      this.logger.warn('Zero-Trust Violation: Invalid token type');
      throw new UnauthorizedException('Zero-Trust Policy: Invalid token format');
    }

    try {
      const publicKey = await this.getPublicKey();
      
      // Verify using RS256
      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;
      const userId = payload.sub;

      // Extract client IP and action name (controller path / method)
      const ip = request.ip || request.headers['x-forwarded-for'] || '127.0.0.1';
      const action = `${request.method} ${request.route?.path || request.url}`;

      // Query threat risk
      const riskScore = await this.threatDetectionService.assessRisk(ip, action, userId);
      if (riskScore >= 70) {
        this.logger.error(`Zero-Trust block: Denied access for user ${userId} from IP ${ip} due to risk score ${riskScore}`);
        throw new ForbiddenException(`Zero-Trust Policy Block: Request blocked due to high threat risk score (${riskScore})`);
      }

      // Attach user details to request
      request.user = {
        sub: payload.sub,
        email: payload.email,
        archetype: payload.archetype,
        roles: payload.roles || []
      };
      
      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.warn(`Zero-Trust Violation: Invalid or expired token: ${err.message}`);
      throw new UnauthorizedException('Zero-Trust Policy: Invalid or expired token');
    }
  }

  private async getPublicKey(): Promise<string> {
    if (this.cachedPublicKey && this.cacheExpiry > Date.now()) {
      return this.cachedPublicKey;
    }

    try {
      this.logger.log(`Fetching public key from auth service at ${this.AUTH_SERVICE_URL}`);
      const response = await fetch(`${this.AUTH_SERVICE_URL}/api/auth/public-key`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (text && text.trim().startsWith('-----BEGIN PUBLIC KEY-----')) {
        this.cachedPublicKey = text.trim();
        this.cacheExpiry = Date.now() + 24 * 60 * 60 * 1000; // Cache for 24 hours
        return this.cachedPublicKey;
      }
      throw new Error('Key format is invalid');
    } catch (error: any) {
      this.logger.error(`Failed to fetch public key from auth service: ${error.message}`);
      if (this.cachedPublicKey) {
        this.logger.warn('Using expired cached public key as fallback');
        return this.cachedPublicKey;
      }
      throw new UnauthorizedException('Zero-Trust Policy: Secure identity provider key store unavailable');
    }
  }
}
