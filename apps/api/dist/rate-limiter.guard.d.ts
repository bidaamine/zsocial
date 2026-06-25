import { CanActivate, ExecutionContext } from '@nestjs/common';
import { RedisService } from '@nexus/core-infra';
export declare class RateLimiterGuard implements CanActivate {
    private readonly redisService;
    private readonly limit;
    private readonly windowMs;
    constructor(redisService: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
//# sourceMappingURL=rate-limiter.guard.d.ts.map