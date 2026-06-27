import { GatewayRouterService } from './gateway-router.service';
export declare class GatewayController {
    private router;
    constructor(router: GatewayRouterService);
    healthCheck(): {
        status: string;
        layer: string;
        zeroTrust: string;
    };
    proxyRequest(serviceName: string, req: any): Promise<any>;
}
//# sourceMappingURL=gateway.controller.d.ts.map