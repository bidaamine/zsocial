import { Module } from '@nestjs/common';
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
