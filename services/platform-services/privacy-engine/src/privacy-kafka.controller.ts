import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DeletionQueueService } from './deletion-queue.service';

@Controller()
export class PrivacyKafkaController {
  private readonly logger = new Logger(PrivacyKafkaController.name);

  constructor(private readonly deletionQueueService: DeletionQueueService) {}

  @EventPattern('auth.user.deleted')
  async handleAuthUserDeleted(@Payload() data: { jobId: string; userId: string }) {
    this.logger.log(`Received auth.user.deleted event for Job: ${data.jobId}`);
    if (data.jobId) {
      await this.deletionQueueService.handleServiceDeletionCompleted(data.jobId, 'auth');
    }
  }

  @EventPattern('consent.user.deleted')
  async handleConsentUserDeleted(@Payload() data: { jobId: string; userId: string }) {
    this.logger.log(`Received consent.user.deleted event for Job: ${data.jobId}`);
    if (data.jobId) {
      await this.deletionQueueService.handleServiceDeletionCompleted(data.jobId, 'consent');
    }
  }
}
