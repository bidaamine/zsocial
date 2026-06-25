import { Test, TestingModule } from '@nestjs/testing';
import { ThreatDetectionService } from './threat-detection.service';

describe('ThreatDetectionService', () => {
  let service: ThreatDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThreatDetectionService],
    }).compile();

    service = module.get<ThreatDetectionService>(ThreatDetectionService);
  });

  it('should return baseline safe risk of 0', () => {
    expect(service.assessRisk('192.168.1.1', 'login', 'user1')).toBe(0);
  });
});
