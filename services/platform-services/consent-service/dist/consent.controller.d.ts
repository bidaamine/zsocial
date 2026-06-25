import { ConsentService } from './consent.service';
export declare class ConsentController {
    private readonly consentService;
    constructor(consentService: ConsentService);
    checkConsent(userId: string, action: string): Promise<{
        allowed: boolean;
    }>;
    updateConsent(body: {
        userId: string;
        updates: any;
    }): Promise<{
        status: string;
    }>;
}
//# sourceMappingURL=consent.controller.d.ts.map