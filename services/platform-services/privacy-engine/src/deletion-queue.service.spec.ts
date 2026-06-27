import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeletionQueueService } from './deletion-queue.service';
import { DeletionJob } from './entities/deletion-job.entity';

describe('DeletionQueueService', () => {
  let service: DeletionQueueService;
  let repositoryMock: any;

  beforeEach(async () => {
    const db: Record<string, DeletionJob> = {};

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletionQueueService,
        {
          provide: getRepositoryToken(DeletionJob),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<DeletionQueueService>(DeletionQueueService);
    
    // Mock the kafka client to avoid connection attempts
    (service as any).kafkaClient = {
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
