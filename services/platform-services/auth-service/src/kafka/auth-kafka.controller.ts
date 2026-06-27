import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AuthService } from '../auth.service';

@Controller()
export class AuthKafkaController {
  private readonly logger = new Logger(AuthKafkaController.name);

  constructor(private readonly authService: AuthService) {}

  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletionRequested(@Payload() data: { jobId: string; userId: string }) {
    this.logger.log(`Received gdpr.user.deletion.requested event for user: ${data.userId}, Job: ${data.jobId}`);
    if (data.userId && data.jobId) {
      await this.authService.deleteUserAndNotify(data.jobId, data.userId);
    }
  }
}
