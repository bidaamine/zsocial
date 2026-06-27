import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class MediaAccessGuard implements CanActivate {
    private readonly logger;
    private cachedPublicKey;
    private cacheExpiry;
    private readonly AUTH_SERVICE_URL;
    canActivate(context: ExecutionContext): Promise<boolean>;
    private getPublicKey;
}
//# sourceMappingURL=media-access.guard.d.ts.map