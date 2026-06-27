import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);

  async send(to: string, subject: string, body: string): Promise<{ success: boolean; messageId: string }> {
    this.logger.log(`[EMAIL-PROVIDER] Sending email to ${to} | Subject: ${subject} | Body: ${body}`);
    // Simulate SMTP network call
    return {
      success: true,
      messageId: `email_${Math.random().toString(36).substring(7)}`,
    };
  }
}
