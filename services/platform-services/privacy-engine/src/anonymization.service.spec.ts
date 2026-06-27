import { Test, TestingModule } from '@nestjs/testing';
import { AnonymizationService } from './anonymization.service';

describe('AnonymizationService', () => {
  let service: AnonymizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnonymizationService],
    }).compile();

    service = module.get<AnonymizationService>(AnonymizationService);
  });

  it('should apply noise to dataset', () => {
    const input = { data: [{ val: 10 }, { val: 20 }, { val: 30 }], name: 'John Doe' };
    const output = service.anonymizePayload(input, 0.5);
    expect(output.data.length).toBe(3);
    expect(output.data?.[0]?.val).not.toEqual(input.data?.[0]?.val); // Extremely unlikely to be exactly equal
    expect(output.name).toBeUndefined(); // PII stripped
  });
});
