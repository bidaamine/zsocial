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

  @EventPattern('profile.user.deleted')
  async handleProfileUserDeleted(@Payload() data: { jobId: string; userId: string }) {
    this.logger.log(`Received profile.user.deleted event for Job: ${data.jobId}`);
    if (data.jobId) {
      await this.deletionQueueService.handleServiceDeletionCompleted(data.jobId, 'profile');
    }
  }

  @EventPattern('safety.user.deleted')
  async handleSafetyUserDeleted(@Payload() data: { jobId: string; userId: string }) {
    this.logger.log(`Received safety.user.deleted event for Job: ${data.jobId}`);
    if (data.jobId) {
      await this.deletionQueueService.handleServiceDeletionCompleted(data.jobId, 'safety');
    }
  }

  @EventPattern('social.user.deleted')
  async handleSocialUserDeleted(@Payload() data: { jobId: string; userId: string }) {
    this.logger.log(`Received social.user.deleted event for Job: ${data.jobId}`);
    if (data.jobId) {
      await this.deletionQueueService.handleServiceDeletionCompleted(data.jobId, 'social');
    }
  }
}
