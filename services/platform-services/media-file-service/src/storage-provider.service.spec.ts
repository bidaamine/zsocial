import { Test } from '@nestjs/testing';
import { StorageProviderService } from './storage-provider.service';

describe('StorageProviderService', () => {
  let service: StorageProviderService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [StorageProviderService]
    }).compile();
    service = mod.get(StorageProviderService);
  });

  it('should generate upload url', () => {
    const url = service.getPresignedUploadUrl('test.jpg');
    expect(url).toContain('upload/test.jpg');
  });
});
