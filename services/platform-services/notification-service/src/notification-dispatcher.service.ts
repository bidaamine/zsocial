import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';

type Category = 'ai_action' | 'alert' | 'insight' | 'info';
type Priority = 'critical' | 'high' | 'normal' | 'low';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  // Default Notification Intelligence classification per template.
  private readonly classification: Record<string, { category: Category; priority: Priority }> = {
    child_safety_alert: { category: 'alert', priority: 'critical' }, // family-safety → always passes
    mfa_code: { category: 'alert', priority: 'high' },
    gdpr_deletion_completed: { category: 'info', priority: 'normal' },
    welcome: { category: 'info', priority: 'low' },
  };

  // Simple template store for dynamic message composition
  private readonly templates: Record<string, { title: string; body: string }> = {
    welcome: {
      title: 'Welcome to NEXUS!',
      body: 'Hello {{username}}, welcome to NEXUS. Your intelligent life assistant is ready.',
    },
    mfa_code: {
      title: 'NEXUS Security Code',
      body: 'Your multi-factor security code is: {{code}}. This code expires in 5 minutes.',
    },
    child_safety_alert: {
      title: '⚠️ Parental Safeguarding Alert',
      body: 'Attention: Grooming or cyberbullying pattern indicators were flagged: {{reason}}',
    },
    gdpr_deletion_completed: {
      title: 'GDPR Right to Be Forgotten Complete',
      body: 'Your user profile data and connections have been permanently erased from all NEXUS storage caches.',
    },
  };

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    private readonly emailProvider: EmailProvider,
    private readonly pushProvider: PushProvider,
    private readonly smsProvider: SmsProvider,
  ) {}

  async dispatch(
    userId: string,
    channel: 'email' | 'push' | 'sms',
    templateKey: string,
    recipient: string,
    variables: Record<string, string> = {},
    overrides: { category?: Category; priority?: Priority } = {},
  ): Promise<Notification> {
    this.logger.log(`Dispatch requested for user ${userId} via ${channel}`);

    // Retrieve and interpolate template
    const template = this.templates[templateKey] || {
      title: 'NEXUS Alert',
      body: `Notification alert: ${JSON.stringify(variables)}`,
    };

    let title = template.title;
    let body = template.body;

    // Perform interpolation
    for (const [key, value] of Object.entries(variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
      title = title.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Notification Intelligence: classify, then decide whether to deliver now or hold.
    const defaults = this.classification[templateKey] || { category: 'info' as Category, priority: 'normal' as Priority };
    const category = overrides.category || defaults.category;
    const priority = overrides.priority || defaults.priority;

    const notification = this.notificationRepo.create({
      userId,
      channel,
      recipient,
      category,
      priority,
      title,
      body,
      status: 'queued',
      retryCount: 0,
    });
    const savedRecord = await this.notificationRepo.save(notification);

    // Focus mode: only critical (family-safety / medical) notifications pass through.
    const inFocus = await this.isInFocusMode(userId);
    if (inFocus && priority !== 'critical') {
      savedRecord.status = 'held';
      this.logger.log(
        `Notification ${savedRecord.id} HELD for user ${userId} (focus mode active, priority=${priority}).`,
      );
      return this.notificationRepo.save(savedRecord);
    }

    return this.sendNotificationRecord(savedRecord);
  }

  // ── Notification Intelligence controls ────────────────────────────
  async isInFocusMode(userId: string): Promise<boolean> {
    const pref = await this.preferenceRepo.findOne({ where: { userId } });
    return pref?.focusMode ?? false;
  }

  async setFocusMode(userId: string, enabled: boolean): Promise<NotificationPreference> {
    let pref = await this.preferenceRepo.findOne({ where: { userId } });
    if (!pref) {
      pref = this.preferenceRepo.create({ userId });
    }
    pref.focusMode = enabled;
    return this.preferenceRepo.save(pref);
  }

  /** Delivers any notifications that were held (e.g. when a focus block ends). */
  async releaseHeld(userId: string): Promise<number> {
    const held = await this.notificationRepo.find({ where: { userId, status: 'held' } });
    let delivered = 0;
    for (const record of held) {
      const updated = await this.sendNotificationRecord(record);
      if (updated.status === 'sent') delivered++;
    }
    return delivered;
  }

  /**
   * Notification Health Score (PDF): how many notifications were filtered today and why.
   */
  async getHealthScore(userId: string): Promise<any> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = (await this.getUserHistory(userId)).filter((n) => n.createdAt >= startOfDay);

    const held = today.filter((n) => n.status === 'held').length;
    const sent = today.filter((n) => n.status === 'sent').length;
    const failed = today.filter((n) => n.status === 'failed').length;
    const total = today.length;

    return {
      userId,
      date: startOfDay.toISOString().slice(0, 10),
      total,
      sent,
      held,
      failed,
      // Fraction of the day's notifications the intelligence layer filtered out.
      filteredRatio: total > 0 ? Number((held / total).toFixed(2)) : 0,
      focusMode: await this.isInFocusMode(userId),
      reasons: held > 0 ? { focus_mode: held } : {},
    };
  }

  async sendNotificationRecord(record: Notification): Promise<Notification> {
    try {
      let result;
      if (record.channel === 'email') {
        result = await this.emailProvider.send(record.recipient, record.title, record.body);
      } else if (record.channel === 'push') {
        result = await this.pushProvider.send(record.recipient, record.title, record.body);
      } else {
        result = await this.smsProvider.send(record.recipient, record.body);
      }

      if (result && result.success) {
        record.status = 'sent';
        record.sentAt = new Date();
        record.errorMessage = undefined;
        // Record whether this was a real send or a simulated one (no transport wired).
        record.simulated = (result as any).simulated === true;
        if (record.simulated) {
          this.logger.warn(
            `Notification ID ${record.id} marked 'sent' but delivery was SIMULATED (no real ${record.channel} transport configured).`,
          );
        }
      } else {
        throw new Error('Provider failed to accept dispatch request');
      }
    } catch (error: any) {
      this.logger.error(`Failed to dispatch notification ID ${record.id}: ${error.message}`);
      record.retryCount += 1;
      record.errorMessage = error.message;
      
      if (record.retryCount >= 3) {
        record.status = 'failed';
      } else {
        record.status = 'queued'; // available for background retry
      }
    }

    return this.notificationRepo.save(record);
  }

  // Background processor / cron fallback for failed items
  async processFailedRetries(): Promise<number> {
    const pending = await this.notificationRepo.find({
      where: { status: 'queued' },
    });

    this.logger.log(`Scanning retry queues. Found ${pending.length} notifications to process.`);
    let successes = 0;

    for (const notification of pending) {
      const updated = await this.sendNotificationRecord(notification);
      if (updated.status === 'sent') {
        successes++;
      }
    }

    return successes;
  }

  async getUserHistory(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
