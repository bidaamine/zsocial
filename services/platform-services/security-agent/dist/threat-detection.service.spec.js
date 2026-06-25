"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const threat_detection_service_1 = require("./threat-detection.service");
describe('ThreatDetectionService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [threat_detection_service_1.ThreatDetectionService],
        }).compile();
        service = module.get(threat_detection_service_1.ThreatDetectionService);
    });
    it('should return baseline safe risk of 0', () => {
        expect(service.assessRisk('192.168.1.1', 'login', 'user1')).toBe(0);
    });
});
