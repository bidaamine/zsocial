import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);

  /**
   * Sends an email. No real SMTP transport is wired yet (that needs a client such as
   * nodemailer plus credentials via SMTP_URL). Until one is configured this SIMULATES
   * delivery and reports `simulated: true`, so a logged message is never mistaken for
   * a real send.
   */
  async send(to: string, subject: string, body: string): Promise<{ success: boolean; simulated: boolean; messageId: string }> {
    this.logger.warn(
      `[EMAIL-PROVIDER] No real SMTP transport configured — SIMULATING email to ${to} | Subject: ${subject}. This is NOT a real delivery.`,
    );
    // A real integration (nodemailer.createTransport(process.env.SMTP_URL).sendMail)
    // would go here; it is intentionally not faked as a successful real send.
    return {
      success: true,
      simulated: true,
      messageId: `sim_email_${Math.random().toString(36).substring(7)}`,
    };
  }
}
