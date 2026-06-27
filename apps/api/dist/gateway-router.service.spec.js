"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const gateway_router_service_1 = require("./gateway-router.service");
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
describe('GatewayRouterService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                gateway_router_service_1.GatewayRouterService,
                {
                    provide: axios_1.HttpService,
                    useValue: {
                        request: jest.fn(() => (0, rxjs_1.of)({ data: 'mockData' })),
                    },
                },
            ],
        }).compile();
        service = module.get(gateway_router_service_1.GatewayRouterService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should proxy request successfully', async () => {
        const req = { url: '/api/route/auth/login', method: 'POST', body: {}, headers: {} };
        const res = await service.proxy('auth', req);
        expect(res).toBe('mockData');
    });
    it('should throw error for unknown service', async () => {
        const req = { url: '/api/route/unknown/test', method: 'GET', body: {}, headers: {} };
        await expect(service.proxy('unknown', req)).rejects.toThrow(common_1.HttpException);
    });
});
