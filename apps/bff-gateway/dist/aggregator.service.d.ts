export declare class AggregatorService {
    getWebDashboardData(userId: string): Promise<{
        userId: string;
        surface: string;
        feeds: string[];
        notifications: number;
    }>;
    getMobileAppData(userId: string): Promise<{
        userId: string;
        surface: string;
        feeds: string[];
        notifications: number;
        pushEnabled: boolean;
    }>;
}
//# sourceMappingURL=aggregator.service.d.ts.map