"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const storage_provider_service_1 = require("./storage-provider.service");
describe('StorageProviderService', () => {
    let service;
    beforeEach(async () => {
        const mod = await testing_1.Test.createTestingModule({
            providers: [storage_provider_service_1.StorageProviderService]
        }).compile();
        service = mod.get(storage_provider_service_1.StorageProviderService);
    });
    it('should generate upload url', () => {
        const url = service.getPresignedUploadUrl('test.jpg');
        expect(url).toContain('upload/test.jpg');
    });
});
