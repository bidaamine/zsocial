import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConsentService } from './consent.service';
export declare class ConsentEnforcementGuard implements CanActivate {
    private readonly consentService;
    constructor(consentService: ConsentService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
//# sourceMappingURL=consent-enforcement.guard.d.ts.map