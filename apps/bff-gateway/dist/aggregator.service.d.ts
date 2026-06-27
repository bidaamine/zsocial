import { HttpService } from '@nestjs/axios';
export declare class AggregatorService {
    private readonly httpService;
    private readonly logger;
    constructor(httpService: HttpService);
    getWebDashboardData(userId: string, authHeader: string): Promise<{
        userId: string;
        surface: string;
        profile: any;
        consent: any;
        authStatus: any;
        aggregatedAt: string;
    }>;
    getMobileAppData(userId: string, authHeader: string): Promise<{
        surface: string;
        pushEnabled: boolean;
        userId: string;
        profile: any;
        consent: any;
        authStatus: any;
        aggregatedAt: string;
    }>;
}
//# sourceMappingURL=aggregator.service.d.ts.map