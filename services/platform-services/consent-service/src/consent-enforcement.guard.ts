import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsentService } from './consent.service';
import { CONSENT_KEY } from './require-consent.decorator';
import { ConsentRecord } from './entities/consent-record.entity';

@Injectable()
export class ConsentEnforcementGuard implements CanActivate {
  constructor(
    private readonly consentService: ConsentService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Retrieve required consent metadata from controller or method
    const requiredConsent = this.reflector.getAllAndOverride<keyof Omit<ConsentRecord, 'id' | 'userId' | 'updatedAt'>>(
      CONSENT_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no specific consent is registered for this route, allow access by default
    if (!requiredConsent) {
      return true;
    }

    // Identify user from header or verified request user context
    const userId = request.headers['x-user-id'] || request.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Access Denied: Missing user identity context');
    }

    const allowed = await this.consentService.verifyConsent(userId, requiredConsent);
    if (!allowed) {
      throw new ForbiddenException(`Access Denied: User has not consented to data use for "${requiredConsent}"`);
    }

    return true;
  }
}
