import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ThreatDetectionService } from './threat-detection.service';
export declare class ZeroTrustGuard implements CanActivate {
    private readonly threatDetectionService;
    private readonly logger;
    private cachedPublicKey;
    private cacheExpiry;
    private readonly AUTH_SERVICE_URL;
    constructor(threatDetectionService: ThreatDetectionService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private getPublicKey;
}
//# sourceMappingURL=zero-trust.guard.d.ts.map