import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildSafetyController } from './child-safety.controller';
import { ChildSafetyService } from './child-safety.service';
import { ParentDelegate } from './entities/parent-delegate.entity';
import { SafetyIncident } from './entities/safety-incident.entity';
import { WellbeingSnapshot } from './entities/wellbeing-snapshot.entity';
import { ZeroTrustGuard } from './zero-trust.guard';
import { AgeGateGuard } from './age-gate.guard';
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
      synchronize: true, // Dev-only
    }),
    TypeOrmModule.forFeature([ParentDelegate, SafetyIncident, WellbeingSnapshot]),
    KafkaModule.registerClient('SAFETY_CLIENT', ['localhost:9092'], 'child-safety-service')
  ],
  controllers: [ChildSafetyController],
  providers: [
    ChildSafetyService,
    ZeroTrustGuard,
    AgeGateGuard,
  ],
})
export class AppModule {}
