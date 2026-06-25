"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const aggregator_service_1 = require("./aggregator.service");
describe('AggregatorService', () => {
    let service;
    beforeEach(async () => {
        const mod = await testing_1.Test.createTestingModule({
            providers: [aggregator_service_1.AggregatorService]
        }).compile();
        service = mod.get(aggregator_service_1.AggregatorService);
    });
    it('should return web dashboard payload', async () => {
        const data = await service.getWebDashboardData('u1');
        expect(data.surface).toBe('web');
    });
    it('should return mobile payload', async () => {
        const data = await service.getMobileAppData('u1');
        expect(data.surface).toBe('mobile');
    });
});
