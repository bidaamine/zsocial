import { NotificationDispatcherService } from './notification-dispatcher.service';
export declare class NotificationController {
    private dispatcher;
    constructor(dispatcher: NotificationDispatcherService);
    sendNotification(body: any): Promise<{
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