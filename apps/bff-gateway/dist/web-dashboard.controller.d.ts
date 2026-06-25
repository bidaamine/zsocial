import { AggregatorService } from './aggregator.service';
export declare class WebDashboardController {
    private aggregator;
    constructor(aggregator: AggregatorService);
    getDashboard(userId: string): Promise<{
        userId: string;
        surface: string;
        feeds: string[];
        notifications: number;
    }>;
}
//# sourceMappingURL=web-dashboard.controller.d.ts.map