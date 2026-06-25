"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const anonymization_service_1 = require("./anonymization.service");
describe('AnonymizationService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [anonymization_service_1.AnonymizationService],
        }).compile();
        service = module.get(anonymization_service_1.AnonymizationService);
    });
    it('should apply noise to dataset', () => {
        const input = [10, 20, 30];
        const output = service.applyDifferentialPrivacy(input, 0.5);
        expect(output.length).toBe(3);
        expect(output).not.toEqual(input); // Extremely unlikely to be exactly equal
    });
});
