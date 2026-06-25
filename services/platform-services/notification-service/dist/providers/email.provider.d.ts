export declare class EmailProvider {
    send(to: string, subject: string, body: string): Promise<{
        success: boolean;
        method: string;
        to: string;
        subject: string;
    }>;
}
//# sourceMappingURL=email.provider.d.ts.map