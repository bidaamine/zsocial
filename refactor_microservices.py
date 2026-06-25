import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"

targets = [
    "apps/api",
    "services/platform-services/security-agent",
    "services/platform-services/notification-service",
    "services/platform-services/audit-observability-service",
    "services/platform-services/media-file-service",
    "services/platform-services/consent-service",
]

# 1. Update package.json
for target in targets:
    pkg_path = os.path.join(base_dir, target, "package.json")
    if os.path.exists(pkg_path):
        with open(pkg_path, "r") as f:
            pkg = json.load(f)
        if "dependencies" not in pkg:
            pkg["dependencies"] = {}
        pkg["dependencies"]["@nexus/core-infra"] = "workspace:*"
        with open(pkg_path, "w") as f:
            json.dump(pkg, f, indent=2)

# 2. Refactor API Gateway (apps/api)
api_app_module_path = os.path.join(base_dir, "apps/api/src/app.module.ts")
api_app_module = """import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayRouterService } from './gateway-router.service';
import { APP_GUARD } from '@nestjs/core';
import { RateLimiterGuard } from './rate-limiter.guard';
import { RedisModule } from '@nexus/core-infra';

@Module({
  imports: [
    RedisModule.forRoot({ host: 'localhost', port: 6379 })
  ],
  controllers: [GatewayController],
  providers: [
    GatewayRouterService,
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
})
export class AppModule {}
"""
with open(api_app_module_path, "w") as f:
    f.write(api_app_module)

api_rate_limiter_path = os.path.join(base_dir, "apps/api/src/rate-limiter.guard.ts")
api_rate_limiter = """import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@nexus/core-infra';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly limit = 100;
  private readonly windowMs = 60000;

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || '127.0.0.1';
    
    const key = `rate-limit:${ip}`;
    const current = await this.redisService.get(key);
    
    let count = current ? parseInt(current, 10) : 0;
    count++;
    
    if (count === 1) {
      await this.redisService.set(key, count.toString(), this.windowMs / 1000);
    } else {
      await this.redisService.getClient().incr(key);
    }

    if (count > this.limit) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    
    return true;
  }
}
"""
with open(api_rate_limiter_path, "w") as f:
    f.write(api_rate_limiter)


# 3. Refactor Security Agent (services/platform-services/security-agent)
sa_app_module_path = os.path.join(base_dir, "services/platform-services/security-agent/src/app.module.ts")
sa_app_module = """import { Module } from '@nestjs/common';
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
"""
with open(sa_app_module_path, "w") as f:
    f.write(sa_app_module)


# 4. Refactor Notification Service (services/platform-services/notification-service)
ns_app_module_path = os.path.join(base_dir, "services/platform-services/notification-service/src/app.module.ts")
ns_app_module = """import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { KafkaModule } from '@nexus/core-infra';

@Module({
  imports: [
    KafkaModule.registerClient('NOTIFICATION_CLIENT', ['localhost:9092'], 'notification-service')
  ],
  controllers: [NotificationController],
  providers: [
    NotificationDispatcherService,
    EmailProvider,
    PushProvider,
  ],
})
export class AppModule {}
"""
with open(ns_app_module_path, "w") as f:
    f.write(ns_app_module)

ns_controller_path = os.path.join(base_dir, "services/platform-services/notification-service/src/notification.controller.ts")
ns_controller = """import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Controller('notify')
export class NotificationController {
  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  @EventPattern('dispatch_notification')
  async handleNotification(@Payload() data: any) {
    return this.dispatcher.dispatch(data);
  }
}
"""
with open(ns_controller_path, "w") as f:
    f.write(ns_controller)


# 5. Refactor Audit Observability (services/platform-services/audit-observability-service)
ao_app_module_path = os.path.join(base_dir, "services/platform-services/audit-observability-service/src/app.module.ts")
ao_app_module = """import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { AuditLogService } from './audit-log.service';
import { WormStorageAdapter } from './worm-storage.adapter';
import { KafkaModule } from '@nexus/core-infra';

@Module({
  imports: [
    KafkaModule.registerClient('AUDIT_CLIENT', ['localhost:9092'], 'audit-service')
  ],
  controllers: [TelemetryController],
  providers: [
    AuditLogService,
    WormStorageAdapter,
  ],
})
export class AppModule {}
"""
with open(ao_app_module_path, "w") as f:
    f.write(ao_app_module)


# 6. Refactor Media File Service (services/platform-services/media-file-service)
mf_app_module_path = os.path.join(base_dir, "services/platform-services/media-file-service/src/app.module.ts")
mf_app_module = """import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { StorageProviderService } from './storage-provider.service';
import { MediaAccessGuard } from './media-access.guard';
import { MinioModule } from '@nexus/core-infra';

@Module({
  imports: [
    MinioModule.forRoot({
      config: {
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'nexus',
          secretAccessKey: 'password123',
        },
        forcePathStyle: true,
      },
      bucket: 'nexus-media'
    })
  ],
  controllers: [MediaController],
  providers: [
    StorageProviderService,
    MediaAccessGuard,
  ],
})
export class AppModule {}
"""
with open(mf_app_module_path, "w") as f:
    f.write(mf_app_module)

mf_storage_provider_path = os.path.join(base_dir, "services/platform-services/media-file-service/src/storage-provider.service.ts")
mf_storage_provider = """import { Injectable } from '@nestjs/common';
import { MinioService } from '@nexus/core-infra';

@Injectable()
export class StorageProviderService {
  constructor(private readonly minioService: MinioService) {}

  async generateUploadUrl(filename: string): Promise<string> {
    return this.minioService.getPresignedUploadUrl(filename);
  }

  async generateDownloadUrl(fileId: string): Promise<string> {
    return this.minioService.getPresignedDownloadUrl(fileId);
  }
}
"""
with open(mf_storage_provider_path, "w") as f:
    f.write(mf_storage_provider)


# 7. Refactor Consent Service (services/platform-services/consent-service)
cs_app_module_path = os.path.join(base_dir, "services/platform-services/consent-service/src/app.module.ts")
cs_app_module = """import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { ConsentEnforcementGuard } from './consent-enforcement.guard';
import { PostgresModule } from '@nexus/core-infra';

@Module({
  imports: [
    PostgresModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'nexus',
      password: 'password',
      database: 'nexus_db',
      autoLoadEntities: true,
      synchronize: true, // Only for dev
    })
  ],
  controllers: [ConsentController],
  providers: [
    ConsentService,
    ConsentEnforcementGuard,
  ],
  exports: [ConsentEnforcementGuard],
})
export class AppModule {}
"""
with open(cs_app_module_path, "w") as f:
    f.write(cs_app_module)

print("All microservices refactored successfully to use @nexus/core-infra")
