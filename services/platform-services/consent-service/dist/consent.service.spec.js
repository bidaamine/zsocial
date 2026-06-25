"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const consent_service_1 = require("./consent.service");
describe('ConsentService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [consent_service_1.ConsentService],
        }).compile();
        service = module.get(consent_service_1.ConsentService);
    });
    it('should default to deny if no record exists', async () => {
        const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
        expect(allowed).toBe(false);
    });
    it('should allow after consent is granted', async () => {
        await service.updateConsent('user1', { allowHealthDataForAI: true });
        const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
        expect(allowed).toBe(true);
    });
});
