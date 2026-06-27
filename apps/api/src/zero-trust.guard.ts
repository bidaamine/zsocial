import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class ZeroTrustGuard implements CanActivate {
  private readonly logger = new Logger(ZeroTrustGuard.name);

  private cachedPublicKey: string | null = null;
  private cacheExpiry: number = 0;

  private readonly AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4100';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn(`Zero-Trust Violation: Missing Authorization Header`);
      throw new UnauthorizedException('Zero-Trust Policy: Missing Authorization Header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      this.logger.warn(`Zero-Trust Violation: Invalid token type`);
      throw new UnauthorizedException('Zero-Trust Policy: Invalid token format');
    }

    try {
      const publicKey = await this.getPublicKey();
      
      // Verify using RS256
      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;
      
      // Attach the verified payload to the request object for downstream services
      request.user = {
        sub: payload.sub,
        email: payload.email,
        archetype: payload.archetype,
        role: payload.roles?.[0] || 'user',
        roles: payload.roles || []
      };
      
      // Zero-Trust verification passed
      this.logger.log(`Zero-Trust verification passed for user ${payload.sub}`);
      return true;
    } catch (err: any) {
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
        // Cache for 24 hours
        this.cacheExpiry = Date.now() + 24 * 60 * 60 * 1000;
        return this.cachedPublicKey!;
      }
      throw new Error('Key format is invalid');
    } catch (error: any) {
      this.logger.error(`Failed to fetch public key from auth service: ${error.message}`);
      // Fallback to expired cache if available
      if (this.cachedPublicKey) {
        this.logger.warn('Using expired cached public key as fallback');
        return this.cachedPublicKey;
      }
      throw new UnauthorizedException('Zero-Trust Policy: Secure identity provider key store unavailable');
    }
  }
}
