export declare class PushProvider {
    send(deviceId: string, title: string, body: string): Promise<{
        success: boolean;
        method: string;
        deviceId: string;
        title: string;
    }>;
}
//# sourceMappingURL=push.provider.d.ts.map