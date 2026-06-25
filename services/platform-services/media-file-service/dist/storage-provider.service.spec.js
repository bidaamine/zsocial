"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const storage_provider_service_1 = require("./storage-provider.service");
const core_infra_1 = require("@nexus/core-infra");
describe('StorageProviderService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                storage_provider_service_1.StorageProviderService,
                { provide: core_infra_1.MinioService, useValue: {} }
            ],
        }).compile();
        service = module.get(storage_provider_service_1.StorageProviderService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
