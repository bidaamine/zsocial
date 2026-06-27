import { Module } from '@nestjs/common';
import { ThreatDetectionService } from './threat-detection.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { ChildDataProtectionInterceptor } from './child-data-protection.interceptor';
import { RedisModule } from '@nexus/core-infra';
import { ZkpService } from './zkp.service';
import { SecurityController } from './security.controller';

@Module({
  imports: [
    RedisModule.forRoot({ host: 'localhost', port: 6379 })
  ],
  controllers: [SecurityController],
  providers: [
    ThreatDetectionService,
    ZeroTrustGuard,
    ChildDataProtectionInterceptor,
    ZkpService,
  ],
  exports: [
    ThreatDetectionService,
    ZeroTrustGuard,
    ZkpService,
  ],
})
export class AppModule {}
