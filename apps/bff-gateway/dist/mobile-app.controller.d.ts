import { AggregatorService } from './aggregator.service';
export declare class MobileAppController {
    private aggregator;
    constructor(aggregator: AggregatorService);
    getDashboard(userId: string, authHeader: string): Promise<{
        surface: string;
        pushEnabled: boolean;
        userId: string;
        profile: any;
        consent: any;
        authStatus: any;
        aggregatedAt: string;
    }>;
}
//# sourceMappingURL=mobile-app.controller.d.ts.map