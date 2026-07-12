import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { HarmonyService } from './harmony.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { Family } from './entities/family.entity';
import { FamilyMember } from './entities/family-member.entity';
import { FamilyMilestone } from './entities/family-milestone.entity';
import { MemberState } from './entities/member-state.entity';
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
    TypeOrmModule.forFeature([Family, FamilyMember, FamilyMilestone, MemberState]),
    KafkaModule.registerClient('FAMILY_CLIENT', ['localhost:9092'], 'family-service'),
  ],
  controllers: [FamilyController],
  providers: [FamilyService, HarmonyService, ZeroTrustGuard],
})
export class AppModule {}
