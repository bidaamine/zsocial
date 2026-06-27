import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { ComplianceScan } from './entities/compliance-scan.entity';
import { ComplianceReport } from './entities/compliance-report.entity';
import { ComplianceRoleGuard } from './compliance-role.guard';
import { PostgresModule } from '@nexus/core-infra';

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
    TypeOrmModule.forFeature([ComplianceScan, ComplianceReport]),
  ],
  controllers: [ComplianceController],
  providers: [
    ComplianceService,
    ComplianceRoleGuard,
  ],
})
export class AppModule {}
