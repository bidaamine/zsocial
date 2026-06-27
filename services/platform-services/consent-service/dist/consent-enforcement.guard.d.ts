import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsentService } from './consent.service';
export declare class ConsentEnforcementGuard implements CanActivate {
    private readonly consentService;
    private readonly reflector;
    constructor(consentService: ConsentService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
//# sourceMappingURL=consent-enforcement.guard.d.ts.map