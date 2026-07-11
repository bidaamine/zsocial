import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);

  /**
   * Sends a push notification. No real push transport (FCM/APNs) is wired yet — that
   * needs the provider SDK plus credentials. Until one is configured this SIMULATES
   * delivery and reports `simulated: true` rather than claiming a real send.
   */
  async send(deviceId: string, title: string, body: string): Promise<{ success: boolean; simulated: boolean; messageId: string }> {
    this.logger.warn(
      `[PUSH-PROVIDER] No real FCM/APNs transport configured — SIMULATING push to device ${deviceId} | Title: ${title}. This is NOT a real delivery.`,
    );
    return {
      success: true,
      simulated: true,
      messageId: `sim_push_${Math.random().toString(36).substring(7)}`,
    };
  }
}
