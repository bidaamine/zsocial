import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { Company } from './entities/company.entity';
import { CompanyMember } from './entities/company-member.entity';
import { Department } from './entities/department.entity';
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
    TypeOrmModule.forFeature([Company, CompanyMember, Department]),
  ],
  controllers: [CompanyController],
  providers: [CompanyService, ZeroTrustGuard],
})
export class AppModule {}
