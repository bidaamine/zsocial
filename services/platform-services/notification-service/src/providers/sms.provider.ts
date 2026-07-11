import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  /**
   * Sends an SMS. No real SMS transport (e.g. Twilio) is wired yet — that needs the
   * provider SDK plus credentials. Until one is configured this SIMULATES delivery and
   * reports `simulated: true` instead of silently claiming a real send succeeded.
   */
  async send(to: string, body: string): Promise<{ success: boolean; simulated: boolean; messageId: string }> {
    this.logger.warn(
      `[SMS-PROVIDER] No real SMS transport configured — SIMULATING SMS to ${to}. This is NOT a real delivery.`,
    );
    return {
      success: true,
      simulated: true,
      messageId: `sim_sms_${Math.random().toString(36).substring(7)}`,
    };
  }
}
