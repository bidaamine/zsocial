import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConsentService } from './consent.service';

@Injectable()
export class ConsentEnforcementGuard implements CanActivate {
  constructor(private readonly consentService: ConsentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-user-id'];
    const requiredAction = request.route?.path; // Simplified mapping
    
    if (!userId) return false;

    // A real implementation would map routes to specific consent requirements
    // For now, we assume all actions require some specific check
    const allowed = await this.consentService.verifyConsent(userId, 'allowHealthDataForAI');
    if (!allowed) {
      throw new ForbiddenException('User has not consented to this data usage.');
    }
    
    return true;
  }
}
