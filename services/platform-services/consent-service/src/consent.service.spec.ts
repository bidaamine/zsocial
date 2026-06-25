import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from './consent.service';

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsentService],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
  });

  it('should default to deny if no record exists', async () => {
    const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
    expect(allowed).toBe(false);
  });

  it('should allow after consent is granted', async () => {
    await service.updateConsent('user1', { allowHealthDataForAI: true });
    const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
    expect(allowed).toBe(true);
  });
});
