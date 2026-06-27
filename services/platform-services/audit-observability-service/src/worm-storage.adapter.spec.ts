import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WormStorageAdapter } from './worm-storage.adapter';
import { AuditLog } from './entities/audit-log.entity';
import { AiDecision } from './entities/ai-decision.entity';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('WormStorageAdapter', () => {
  let adapter: WormStorageAdapter;
  let auditLogsDb: Record<string, AuditLog>;
  let aiDecisionsDb: Record<string, AiDecision>;

  beforeEach(async () => {
    auditLogsDb = {};
    aiDecisionsDb = {};

    const auditRepositoryMock = {
      findOne: jest.fn().mockImplementation(({ where: { id } }) => Promise.resolve(auditLogsDb[id] || null)),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        auditLogsDb[record.id] = record;
        return Promise.resolve(record);
      }),
    };

    const aiRepositoryMock = {
      findOne: jest.fn().mockImplementation(({ where: { id } }) => Promise.resolve(aiDecisionsDb[id] || null)),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        aiDecisionsDb[record.id] = record;
        return Promise.resolve(record);
      }),
    };

    const queryRunnerMock = {
      connect: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue([]),
      release: jest.fn().mockResolvedValue(null),
    };

    const dataSourceMock = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
    };

    const mod = await Test.createTestingModule({
      providers: [
        WormStorageAdapter,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: auditRepositoryMock,
        },
        {
          provide: getRepositoryToken(AiDecision),
          useValue: aiRepositoryMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    adapter = mod.get(WormStorageAdapter);
    // Explicitly call the onModuleInit to check trigger creations
    await adapter.onModuleInit();
  });

  it('should write audit log once successfully', async () => {
    const rec = await adapter.writeOnceAudit('evt-1', { actor: 'user', action: 'update', resource: 'profile' });
    expect(rec.actor).toBe('user');
    expect(rec.action).toBe('update');
  });

  it('should throw if writing twice with same event ID', async () => {
    await adapter.writeOnceAudit('evt-1', { actor: 'user', action: 'update', resource: 'profile' });
    await expect(
      adapter.writeOnceAudit('evt-1', { actor: 'user2', action: 'delete', resource: 'profile' })
    ).rejects.toThrow(BadRequestException);
  });
});
