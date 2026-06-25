import { Module } from '@nestjs/common';
import { ThreatDetectionService } from './threat-detection.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { ChildDataProtectionInterceptor } from './child-data-protection.interceptor';
import { RedisModule } from '@nexus/core-infra';

@Module({
  imports: [
    RedisModule.forRoot({ host: 'localhost', port: 6379 })
  ],
  providers: [
    ThreatDetectionService,
    ZeroTrustGuard,
    ChildDataProtectionInterceptor,
  ],
  exports: [
    ThreatDetectionService,
    ZeroTrustGuard,
  ],
})
export class AppModule {}
