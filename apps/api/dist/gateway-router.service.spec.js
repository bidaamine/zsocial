"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const gateway_router_service_1 = require("./gateway-router.service");
const common_1 = require("@nestjs/common");
describe('GatewayRouterService', () => {
    let service;
    beforeEach(async () => {
        const mod = await testing_1.Test.createTestingModule({
            providers: [gateway_router_service_1.GatewayRouterService]
        }).compile();
        service = mod.get(gateway_router_service_1.GatewayRouterService);
    });
    it('should route auth', () => {
        expect(service.routeRequest('/auth')).toBe('http://auth-service:4003');
    });
    it('should throw on unknown', () => {
        expect(() => service.routeRequest('/unknown')).toThrow(common_1.HttpException);
    });
});
