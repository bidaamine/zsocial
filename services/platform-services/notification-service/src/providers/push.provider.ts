import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);

  async send(deviceId: string, title: string, body: string): Promise<{ success: boolean; messageId: string }> {
    this.logger.log(`[PUSH-PROVIDER] Sending push notification to device ${deviceId} | Title: ${title} | Body: ${body}`);
    // Simulate FCM/APNs call
    return {
      success: true,
      messageId: `push_${Math.random().toString(36).substring(7)}`,
    };
  }
}
