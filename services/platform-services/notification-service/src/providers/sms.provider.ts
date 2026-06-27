import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  async send(to: string, body: string): Promise<{ success: boolean; messageId: string }> {
    this.logger.log(`[SMS-PROVIDER] Dispatching SMS to ${to}: ${body}`);
    return {
      success: true,
      messageId: `sms_${Math.random().toString(36).substring(7)}`,
    };
  }
}
