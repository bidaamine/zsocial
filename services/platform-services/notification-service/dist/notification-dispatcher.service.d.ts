import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';
export declare class NotificationDispatcherService {
    private readonly notificationRepo;
    private readonly emailProvider;
    private readonly pushProvider;
    private readonly smsProvider;
    private readonly logger;
    private readonly templates;
    constructor(notificationRepo: Repository<Notification>, emailProvider: EmailProvider, pushProvider: PushProvider, smsProvider: SmsProvider);
    dispatch(userId: string, channel: 'email' | 'push' | 'sms', templateKey: string, recipient: string, variables?: Record<string, string>): Promise<Notification>;
    sendNotificationRecord(record: Notification): Promise<Notification>;
    processFailedRetries(): Promise<number>;
    getUserHistory(userId: string): Promise<Notification[]>;
}
//# sourceMappingURL=notification-dispatcher.service.d.ts.map