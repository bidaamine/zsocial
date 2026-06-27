import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class ComplianceRoleGuard implements CanActivate {
  private readonly logger = new Logger(ComplianceRoleGuard.name);
  private cachedPublicKey: string | null = null;
  private cacheExpiry: number = 0;

  private readonly AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4100';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Zero-Trust Policy: Missing Authorization Header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Zero-Trust Policy: Invalid Authorization format');
    }

    try {
      const publicKey = await this.getPublicKey();
      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;
      
      const roles = payload.roles || [];
      const isAuthorized = roles.includes('compliance') || roles.includes('auditor');
      
      if (!isAuthorized) {
        this.logger.warn(`Unauthorized access attempt by user ${payload.sub} with roles: ${JSON.stringify(roles)}`);
        throw new ForbiddenException('Access denied: Compliance or Auditor role required.');
      }

      request.user = {
        sub: payload.sub,
        email: payload.email,
        roles
      };
      
      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.warn(`Zero-Trust validation failed: ${err.message}`);
      throw new UnauthorizedException('Zero-Trust Policy: Invalid or expired token');
    }
  }

  private async getPublicKey(): Promise<string> {
    if (this.cachedPublicKey && this.cacheExpiry > Date.now()) {
      return this.cachedPublicKey;
    }

    try {
      const response = await fetch(`${this.AUTH_SERVICE_URL}/api/auth/public-key`);
      if (!response.ok) throw new Error(`HTTP status: ${response.status}`);
      const text = await response.text();
      if (text && text.trim().startsWith('-----BEGIN PUBLIC KEY-----')) {
        this.cachedPublicKey = text.trim();
        this.cacheExpiry = Date.now() + 24 * 60 * 60 * 1000;
        return this.cachedPublicKey;
      }
      throw new Error('Invalid public key structure');
    } catch (error: any) {
      this.logger.error(`Failed to fetch public key: ${error.message}`);
      if (this.cachedPublicKey) return this.cachedPublicKey;
      throw new UnauthorizedException('Zero-Trust Policy: Secure identity provider key store unavailable');
    }
  }
}
