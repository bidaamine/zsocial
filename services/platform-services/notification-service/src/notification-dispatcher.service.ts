import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

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

    // Create persistent record
    const notification = this.notificationRepo.create({
      userId,
      channel,
      recipient,
      title,
      body,
      status: 'queued',
      retryCount: 0,
    });
    
    const savedRecord = await this.notificationRepo.save(notification);
    return this.sendNotificationRecord(savedRecord);
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
