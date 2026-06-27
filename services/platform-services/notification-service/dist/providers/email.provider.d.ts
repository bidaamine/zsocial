export declare class EmailProvider {
    private readonly logger;
    send(to: string, subject: string, body: string): Promise<{
        success: boolean;
        messageId: string;
    }>;
}
//# sourceMappingURL=email.provider.d.ts.map