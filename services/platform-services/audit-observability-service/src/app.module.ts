import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryController } from './telemetry.controller';
import { AuditLogService } from './audit-log.service';
import { WormStorageAdapter } from './worm-storage.adapter';
import { AuditLog } from './entities/audit-log.entity';
import { AiDecision } from './entities/ai-decision.entity';
import { AuditLogWormSubscriber, AiDecisionWormSubscriber } from './subscribers/worm.subscriber';
import { PostgresModule, KafkaModule } from '@nexus/core-infra';

@Module({
  imports: [
    PostgresModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'nexus',
      password: 'password',
      database: 'nexus_db',
      autoLoadEntities: true,
      synchronize: true, // Only for dev
    }),
    TypeOrmModule.forFeature([AuditLog, AiDecision]),
    KafkaModule.registerClient('AUDIT_CLIENT', ['localhost:9092'], 'audit-service'),
  ],
  controllers: [TelemetryController],
  providers: [
    AuditLogService,
    WormStorageAdapter,
    AuditLogWormSubscriber,
    AiDecisionWormSubscriber,
  ],
})
export class AppModule {}
