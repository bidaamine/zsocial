import { NotificationDispatcherService } from './notification-dispatcher.service';
export declare class NotificationController {
    private readonly dispatcher;
    constructor(dispatcher: NotificationDispatcherService);
    handleNotification(data: {
        userId: string;
        channel: 'email' | 'push' | 'sms';
        templateKey: string;
        recipient: string;
        variables?: Record<string, string>;
    }): Promise<import("./entities/notification.entity").Notification>;
    triggerManualSend(userId: string, channel: 'email' | 'push' | 'sms', templateKey: string, recipient: string, variables: Record<string, string>): Promise<import("./entities/notification.entity").Notification>;
    getHistory(userId: string): Promise<import("./entities/notification.entity").Notification[]>;
    retryFailed(): Promise<{
        success: boolean;
        retriedSuccessfully: number;
    }>;
}
//# sourceMappingURL=notification.controller.d.ts.map