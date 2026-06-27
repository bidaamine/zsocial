import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConsentService } from './consent.service';
import { ConsentRecord } from './entities/consent-record.entity';
import { RedisService } from '@nexus/core-infra';

describe('ConsentService', () => {
  let service: ConsentService;
  let repositoryMock: any;
  let redisMock: any;

  beforeEach(async () => {
    const db: Record<string, ConsentRecord> = {};
    
    repositoryMock = {
      findOne: jest.fn().mockImplementation(({ where: { userId } }) => {
        return Promise.resolve(db[userId] || null);
      }),
      create: jest.fn().mockImplementation((dto) => {
        return dto;
      }),
      save: jest.fn().mockImplementation((record) => {
        db[record.userId] = record;
        return Promise.resolve(record);
      }),
      delete: jest.fn().mockImplementation(({ userId }) => {
        delete db[userId];
        return Promise.resolve({ affected: 1 });
      }),
    };

    redisMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        {
          provide: getRepositoryToken(ConsentRecord),
          useValue: repositoryMock,
        },
        {
          provide: RedisService,
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
    // Stub Kafka Client to prevent real broker connections/emissions during unit testing
    (service as any).kafkaClient = {
      connect: jest.fn().mockResolvedValue(null),
      close: jest.fn().mockResolvedValue(null),
      emit: jest.fn(),
    };
  });

  it('should deny consent by default', async () => {
    const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
    expect(allowed).toBe(false);
  });

  it('should allow after consent is granted', async () => {
    await service.updateConsent('user1', { allowHealthDataForAI: true });
    const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
    expect(allowed).toBe(true);
  });
});
