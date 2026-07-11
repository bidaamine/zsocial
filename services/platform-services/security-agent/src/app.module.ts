import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
    // Register the child-data protection interceptor GLOBALLY so it transparently
    // guards every inbound/outbound request. It is a passthrough unless the request
    // carries `x-target-age-group: child`, at which point it enforces the parental
    // key and encrypts/decrypts sensitive fields. Previously this was only a provider
    // (never wired), so the "transparent interceptor" was dead code.
    {
      provide: APP_INTERCEPTOR,
      useExisting: ChildDataProtectionInterceptor,
    },
  ],
  exports: [
    ThreatDetectionService,
    ZeroTrustGuard,
    ZkpService,
  ],
})
export class AppModule {}
