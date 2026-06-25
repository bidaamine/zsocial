import { NotificationDispatcherService } from './notification-dispatcher.service';
export declare class NotificationController {
    private readonly dispatcher;
    constructor(dispatcher: NotificationDispatcherService);
    handleNotification(data: {
        userId: string;
        channel: 'email' | 'push';
        payload: any;
    }): Promise<{
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
//# sourceMappingURL=notification.controller.d.ts.map