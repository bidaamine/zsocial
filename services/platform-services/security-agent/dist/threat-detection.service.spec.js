"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const threat_detection_service_1 = require("./threat-detection.service");
const core_infra_1 = require("@nexus/core-infra");
describe('ThreatDetectionService', () => {
    let service;
    let redisMock;
    let redisStore;
    beforeEach(async () => {
        redisStore = {};
        redisMock = {
            get: jest.fn().mockImplementation((key) => Promise.resolve(redisStore[key] || null)),
            set: jest.fn().mockImplementation((key, val) => {
                redisStore[key] = val;
                return Promise.resolve('OK');
            }),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                threat_detection_service_1.ThreatDetectionService,
                {
                    provide: core_infra_1.RedisService,
                    useValue: redisMock,
                },
            ],
        }).compile();
        service = module.get(threat_detection_service_1.ThreatDetectionService);
    });
    it('should return baseline safe risk of 0 for first request', async () => {
        const score = await service.assessRisk('127.0.0.1', 'login', 'user1');
        expect(score).toBe(0);
    });
    it('should increase risk score if rate limit is exceeded', async () => {
        // Simulate 35 requests already made this minute
        const currentMinute = Math.floor(Date.now() / 60000);
        redisStore[`security:rate:user1:${currentMinute}`] = '35';
        const score = await service.assessRisk('127.0.0.1', 'login', 'user1');
        expect(score).toBe(30); // added 30
    });
    it('should trigger impossible travel alert if IP changes globally instantly', async () => {
        // First request: New York IP (12.34.56.78) at T0
        await service.assessRisk('12.34.56.78', 'login', 'user1');
        // Second request: Tokyo IP (56.78.90.12) at T0 + 10 seconds
        const score = await service.assessRisk('56.78.90.12', 'login', 'user1');
        expect(score).toBeGreaterThanOrEqual(80); // travel coordinates speed violation
    });
});
