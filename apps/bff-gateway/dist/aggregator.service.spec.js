"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const aggregator_service_1 = require("./aggregator.service");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
describe('AggregatorService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                aggregator_service_1.AggregatorService,
                {
                    provide: axios_1.HttpService,
                    useValue: {
                        get: jest.fn(() => (0, rxjs_1.of)({ data: { mock: 'data' } })),
                    },
                },
            ],
        }).compile();
        service = module.get(aggregator_service_1.AggregatorService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should return web dashboard payload', async () => {
        const result = await service.getWebDashboardData('123', 'Bearer fake');
        expect(result.userId).toBe('123');
        expect(result.surface).toBe('web');
    });
    it('should get mobile app data', async () => {
        const result = await service.getMobileAppData('123', 'Bearer fake');
        expect(result.userId).toBe('123');
        expect(result.surface).toBe('mobile');
    });
});
