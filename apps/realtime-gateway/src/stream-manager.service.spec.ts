import { Test } from '@nestjs/testing';
import { StreamManagerService } from './stream-manager.service';

describe('StreamManagerService', () => {
  let service: StreamManagerService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [StreamManagerService]
    }).compile();
    service = mod.get(StreamManagerService);
  });

  it('should format message correctly', () => {
    const msg = service.formatMessage('alerts', { a: 1 });
    expect(msg.topic).toBe('alerts');
    expect(msg.data.a).toBe(1);
    expect(msg.timestamp).toBeDefined();
  });
});
