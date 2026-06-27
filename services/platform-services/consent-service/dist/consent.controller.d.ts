import { ConsentService } from './consent.service';
export declare class ConsentController {
    private readonly consentService;
    constructor(consentService: ConsentService);
    checkConsent(req: any, userId: string, action: string): Promise<{
        allowed: boolean;
    }>;
    updateConsent(req: any, body: {
        userId: string;
        updates: any;
    }): Promise<{
        status: string;
        record: import("./entities/consent-record.entity").ConsentRecord;
    }>;
}
//# sourceMappingURL=consent.controller.d.ts.map