import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ConsentService } from './consent.service';

@Controller()
export class ConsentKafkaController {
  private readonly logger = new Logger(ConsentKafkaController.name);

  constructor(private readonly consentService: ConsentService) {}

  @EventPattern('auth.user.registered')
  async handleUserRegistered(@Payload() data: { userId: string; email: string }) {
    this.logger.log(`Received auth.user.registered event for user: ${data.userId}`);
    if (data.userId) {
      await this.consentService.seedDefaultConsent(data.userId);
    }
  }

  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletionRequested(@Payload() data: { jobId: string; userId: string }) {
    this.logger.log(`Received gdpr.user.deletion.requested event for user: ${data.userId}, Job: ${data.jobId}`);
    if (data.userId && data.jobId) {
      await this.consentService.deleteConsentAndNotify(data.jobId, data.userId);
    }
  }
}
