import { AggregatorService } from './aggregator.service';
export declare class MobileAppController {
    private aggregator;
    constructor(aggregator: AggregatorService);
    getHome(userId: string): Promise<{
        userId: string;
        surface: string;
        feeds: string[];
        notifications: number;
        pushEnabled: boolean;
    }>;
}
//# sourceMappingURL=mobile-app.controller.d.ts.map