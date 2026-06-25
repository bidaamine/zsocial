import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
export declare class NotificationDispatcherService {
    private emailProvider;
    private pushProvider;
    constructor(emailProvider: EmailProvider, pushProvider: PushProvider);
    dispatch(userId: string, channel: 'email' | 'push', payload: any): Promise<{
        success: boolean;
        method: string;
        to: string;
        subject: string;
    } | {
        success: boolean;
        method: string;
        deviceId: string;
        title: string;
    }>;
}
//# sourceMappingURL=notification-dispatcher.service.d.ts.map