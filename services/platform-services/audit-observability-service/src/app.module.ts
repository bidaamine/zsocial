import { Module } from '@nestjs/common';
import { WormStorageAdapter } from './worm-storage.adapter';
import { AuditLogService } from './audit-log.service';
import { TelemetryController } from './telemetry.controller';

@Module({
  imports: [],
  controllers: [TelemetryController],
  providers: [WormStorageAdapter, AuditLogService],
})
export class AppModule {}
