"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const deletion_queue_service_1 = require("./deletion-queue.service");
const deletion_job_entity_1 = require("./entities/deletion-job.entity");
describe('DeletionQueueService', () => {
    let service;
    let repositoryMock;
    beforeEach(async () => {
        const db = {};
        repositoryMock = {
            findOne: jest.fn().mockImplementation(({ where: { id } }) => {
                return Promise.resolve(db[id] || null);
            }),
            create: jest.fn().mockImplementation((dto) => {
                const id = 'test-job-uuid-123';
                return { ...dto, id, requestedAt: new Date() };
            }),
            save: jest.fn().mockImplementation((record) => {
                db[record.id] = record;
                return Promise.resolve(record);
            }),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                deletion_queue_service_1.DeletionQueueService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(deletion_job_entity_1.DeletionJob),
                    useValue: repositoryMock,
                },
            ],
        }).compile();
        service = module.get(deletion_queue_service_1.DeletionQueueService);
        // Mock the kafka client to avoid connection attempts
        service.kafkaClient = {
            connect: jest.fn().mockResolvedValue(null),
            close: jest.fn().mockResolvedValue(null),
            emit: jest.fn(),
        };
    });
    it('should register deletion request and return job ID', async () => {
        const jobId = await service.registerDeletionRequest('user123');
        expect(jobId).toBe('test-job-uuid-123');
    });
    it('should handle service deletion completion', async () => {
        const jobId = await service.registerDeletionRequest('user123');
        await service.handleServiceDeletionCompleted(jobId, 'auth');
        const job = await service.getJobStatus(jobId);
        expect(job).toBeDefined();
        expect(job?.progress?.auth).toBe(true);
        expect(job?.status).toBe('IN_PROGRESS'); // Needs both auth and consent to complete
    });
});
