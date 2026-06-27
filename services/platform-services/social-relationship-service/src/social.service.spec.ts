import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SocialService } from './social.service';
import { UserConnection } from './entities/user-connection.entity';
import { Neo4jService } from '@nexus/core-infra';

describe('SocialService', () => {
  let service: SocialService;
  let connectionDb: Record<string, UserConnection>;

  beforeEach(async () => {
    connectionDb = {};

    const connectionRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const id = record.id || 'connection-uuid';
        const key = `${record.requesterId}_${record.receiverId}`;
        connectionDb[key] = { id, ...record };
        return Promise.resolve(connectionDb[key]);
      }),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (Array.isArray(where)) {
          for (const clause of where) {
            const key = `${clause.requesterId}_${clause.receiverId}`;
            if (connectionDb[key]) return Promise.resolve(connectionDb[key]);
          }
          return Promise.resolve(null);
        }
        const singleKey = `${where.requesterId}_${where.receiverId}`;
        return Promise.resolve(connectionDb[singleKey] || null);
      }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const mockSession = {
      run: jest.fn().mockResolvedValue({
        records: [
          {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'id') return 'mutual_user';
              if (key === 'strength') return { toNumber: () => 3 };
              return null;
            }),
          },
        ],
      }),
      close: jest.fn().mockResolvedValue(null),
    };

    const neo4jServiceMock = {
      getWriteSession: jest.fn().mockReturnValue(mockSession),
      getReadSession: jest.fn().mockReturnValue(mockSession),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: getRepositoryToken(UserConnection), useValue: connectionRepositoryMock },
        { provide: Neo4jService, useValue: neo4jServiceMock },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
  });

  it('should send connection request successfully', async () => {
    const conn = await service.sendConnectionRequest('u1', 'u2');
    expect(conn.requesterId).toBe('u1');
    expect(conn.receiverId).toBe('u2');
    expect(conn.status).toBe('pending');
  });

  it('should accept connection request successfully', async () => {
    await service.sendConnectionRequest('u1', 'u2');
    const accepted = await service.acceptConnectionRequest('u2', 'u1');
    expect(accepted.status).toBe('accepted');
  });

  it('should block connection successfully', async () => {
    const blocked = await service.blockUserConnection('u1', 'u2');
    expect(blocked.status).toBe('blocked');
  });

  it('should traverse mutual friends from Neo4j', async () => {
    const list = await service.getMutualConnections('u1', 'u2');
    expect(list).toEqual(['mutual_user']);
  });

  it('should traverse recommendations from Neo4j', async () => {
    const list = await service.getRecommendations('u1');
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe('mutual_user');
    expect(list[0]?.strength).toBe(3);
  });
});
