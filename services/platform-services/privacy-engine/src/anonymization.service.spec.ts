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
    const input = [10, 20, 30];
    const output = service.applyDifferentialPrivacy(input, 0.5);
    expect(output.length).toBe(3);
    expect(output).not.toEqual(input); // Extremely unlikely to be exactly equal
  });
});
