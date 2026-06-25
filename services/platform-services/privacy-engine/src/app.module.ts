import { Module } from '@nestjs/common';
import { AnonymizationService } from './anonymization.service';
import { DeletionQueueService } from './deletion-queue.service';

@Module({
  imports: [],
  controllers: [],
  providers: [AnonymizationService, DeletionQueueService],
})
export class AppModule {}
