import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeletionQueueService } from './deletion-queue.service';
import { DeletionJob } from './entities/deletion-job.entity';
import { CascadingWipeService } from './cascading-wipe.service';

describe('DeletionQueueService', () => {
  let service: DeletionQueueService;
  let repositoryMock: any;
  let cascadingWipeMock: any;

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

    cascadingWipeMock = {
      purgeAllBackups: jest.fn().mockResolvedValue(1),
      purgeDataLake: jest.fn().mockResolvedValue(1),
      purgeModelCheckpoints: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletionQueueService,
        {
          provide: getRepositoryToken(DeletionJob),
          useValue: repositoryMock,
        },
        {
          provide: CascadingWipeService,
          useValue: cascadingWipeMock,
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
    expect(job?.status).toBe('IN_PROGRESS');
  });

  it('should perform offline purges when all online microservices complete', async () => {
    const jobId = await service.registerDeletionRequest('user123');
    
    await service.handleServiceDeletionCompleted(jobId, 'auth');
    await service.handleServiceDeletionCompleted(jobId, 'consent');
    await service.handleServiceDeletionCompleted(jobId, 'profile');
    await service.handleServiceDeletionCompleted(jobId, 'safety');
    await service.handleServiceDeletionCompleted(jobId, 'social');

    const job = await service.getJobStatus(jobId);
    expect(job).toBeDefined();
    expect(job?.progress?.auth).toBe(true);
    expect(job?.progress?.consent).toBe(true);
    expect(job?.progress?.backups).toBe(true);
    expect(job?.progress?.datalake).toBe(true);
    expect(job?.progress?.models).toBe(true);
    expect(job?.status).toBe('COMPLETED');

    expect(cascadingWipeMock.purgeAllBackups).toHaveBeenCalledWith('user123');
    expect(cascadingWipeMock.purgeDataLake).toHaveBeenCalledWith('user123');
    expect(cascadingWipeMock.purgeModelCheckpoints).toHaveBeenCalledWith('user123');
  });
});
