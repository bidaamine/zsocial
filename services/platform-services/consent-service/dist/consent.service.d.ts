export interface ConsentRecord {
    userId: string;
    allowHealthDataForAI: boolean;
    allowMarketing: boolean;
    allowThirdPartyMarketplace: boolean;
}
export declare class ConsentService {
    private readonly consents;
    verifyConsent(userId: string, actionCategory: keyof Omit<ConsentRecord, 'userId'>): Promise<boolean>;
    updateConsent(userId: string, updates: Partial<ConsentRecord>): Promise<void>;
}
//# sourceMappingURL=consent.service.d.ts.map