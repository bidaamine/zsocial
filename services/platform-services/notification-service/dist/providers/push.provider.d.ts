export declare class PushProvider {
    private readonly logger;
    send(deviceId: string, title: string, body: string): Promise<{
        success: boolean;
        messageId: string;
    }>;
}
//# sourceMappingURL=push.provider.d.ts.map