import { GatewayRouterService } from './gateway-router.service';
export declare class GatewayController {
    private router;
    constructor(router: GatewayRouterService);
    healthCheck(): {
        status: string;
        layer: string;
    };
    getRouteTarget(serviceName: string): {
        target: string;
    };
}
//# sourceMappingURL=gateway.controller.d.ts.map