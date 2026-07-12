import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { JobPosting } from './entities/job-posting.entity';
import { Candidate } from './entities/candidate.entity';
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
    TypeOrmModule.forFeature([JobPosting, Candidate]),
  ],
  controllers: [HrController],
  providers: [HrService, ZeroTrustGuard],
})
export class AppModule {}
