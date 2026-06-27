import { AggregatorService } from './aggregator.service';
export declare class WebDashboardController {
    private aggregator;
    constructor(aggregator: AggregatorService);
    getDashboard(userId: string, authHeader: string): Promise<{
        userId: string;
        surface: string;
        profile: any;
        consent: any;
        authStatus: any;
        aggregatedAt: string;
    }>;
}
//# sourceMappingURL=web-dashboard.controller.d.ts.map