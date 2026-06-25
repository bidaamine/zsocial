import { Test, TestingModule } from '@nestjs/testing';
import { DeletionQueueService } from './deletion-queue.service';

describe('DeletionQueueService', () => {
  let service: DeletionQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeletionQueueService],
    }).compile();

    service = module.get<DeletionQueueService>(DeletionQueueService);
  });

  it('should register deletion request and return job ID', async () => {
    const jobId = await service.registerDeletionRequest('user123');
    expect(jobId).toMatch(/^del-\d+-user123$/);
  });
});
