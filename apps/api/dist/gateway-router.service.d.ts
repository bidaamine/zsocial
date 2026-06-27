import { HttpService } from '@nestjs/axios';
export declare class GatewayRouterService {
    private httpService;
    private readonly logger;
    constructor(httpService: HttpService);
    private getTargetUrl;
    proxy(serviceName: string, req: any): Promise<any>;
}
//# sourceMappingURL=gateway-router.service.d.ts.map