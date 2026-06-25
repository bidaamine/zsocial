import { Test, TestingModule } from '@nestjs/testing';
import { StorageProviderService } from './storage-provider.service';
import { MinioService } from '@nexus/core-infra';

describe('StorageProviderService', () => {
  let service: StorageProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageProviderService,
        { provide: MinioService, useValue: {} }
      ],
    }).compile();

    service = module.get<StorageProviderService>(StorageProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
