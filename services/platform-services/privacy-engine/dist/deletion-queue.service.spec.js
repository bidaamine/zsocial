"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const deletion_queue_service_1 = require("./deletion-queue.service");
describe('DeletionQueueService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [deletion_queue_service_1.DeletionQueueService],
        }).compile();
        service = module.get(deletion_queue_service_1.DeletionQueueService);
    });
    it('should register deletion request and return job ID', async () => {
        const jobId = await service.registerDeletionRequest('user123');
        expect(jobId).toMatch(/^del-\d+-user123$/);
    });
});
