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
        const input = { data: [{ val: 10 }, { val: 20 }, { val: 30 }], name: 'John Doe' };
        const output = service.anonymizePayload(input, 0.5);
        expect(output.data.length).toBe(3);
        expect(output.data?.[0]?.val).not.toEqual(input.data?.[0]?.val); // Extremely unlikely to be exactly equal
        expect(output.name).toBeUndefined(); // PII stripped
    });
});
