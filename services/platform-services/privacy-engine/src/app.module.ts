import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnonymizationService } from './anonymization.service';
import { DeletionQueueService } from './deletion-queue.service';
import { CascadingWipeService } from './cascading-wipe.service';
import { PrivacyController } from './privacy.controller';
import { PrivacyKafkaController } from './privacy-kafka.controller';
import { DeletionJob } from './entities/deletion-job.entity';
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
      synchronize: true, // Only for dev
    }),
    TypeOrmModule.forFeature([DeletionJob]),
  ],
  controllers: [PrivacyController, PrivacyKafkaController],
  providers: [AnonymizationService, DeletionQueueService, CascadingWipeService],
  exports: [DeletionQueueService, AnonymizationService, CascadingWipeService],
})
export class AppModule {}
