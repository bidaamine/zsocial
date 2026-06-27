import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChildSafetyService } from './child-safety.service';
import { ParentDelegate } from './entities/parent-delegate.entity';
import { SafetyIncident } from './entities/safety-incident.entity';

describe('ChildSafetyService', () => {
  let service: ChildSafetyService;
  let delegateDb: Record<string, ParentDelegate>;
  let incidentDb: Record<string, SafetyIncident>;

  beforeEach(async () => {
    delegateDb = {};
    incidentDb = {};

    const delegateRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const id = record.id || 'delegate-uuid';
        const key = `${record.parentId}_${record.childId}`;
        delegateDb[key] = { id, ...record };
        return Promise.resolve(delegateDb[key]);
      }),
      findOne: jest.fn().mockImplementation(({ where: { parentId, childId, childId: onlyChildId } }) => {
        if (childId && parentId) {
          return Promise.resolve(delegateDb[`${parentId}_${childId}`] || null);
        }
        if (onlyChildId) {
          // Find any delegate matching childId
          const match = Object.values(delegateDb).find(d => d.childId === onlyChildId);
          return Promise.resolve(match || null);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const incidentRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const id = record.id || `inc-${Math.random()}`;
        incidentDb[id] = { id, ...record, createdAt: new Date() };
        return Promise.resolve(incidentDb[id]);
      }),
      find: jest.fn().mockImplementation(({ where: { childId } }) => {
        const matches = Object.values(incidentDb).filter(i => i.childId === childId);
        return Promise.resolve(matches);
      }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const kafkaClientMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildSafetyService,
        { provide: getRepositoryToken(ParentDelegate), useValue: delegateRepositoryMock },
        { provide: getRepositoryToken(SafetyIncident), useValue: incidentRepositoryMock },
        { provide: 'SAFETY_CLIENT', useValue: kafkaClientMock },
      ],
    }).compile();

    service = module.get<ChildSafetyService>(ChildSafetyService);
  });

  it('should flag grooming phrases and trigger alerts', async () => {
    // Register delegate first
    await service.registerDelegate('parent1', 'child1');

    const result = await service.scanText('child1', 'don\'t tell your parents where we are meeting');
    expect(result.flagged).toBe(true);
    expect(result.incident?.incidentType).toBe('grooming_risk');
    expect(result.incident?.severity).toBe('CRITICAL');
  });

  it('should flag cyberbullying patterns', async () => {
    const result = await service.scanText('child2', 'you are a stupid idiot and nobody likes you');
    expect(result.flagged).toBe(true);
    expect(result.incident?.incidentType).toBe('cyberbullying');
    expect(result.incident?.severity).toBe('HIGH');
  });

  it('should deny incident viewing if request user is not verified parent', async () => {
    await expect(
      service.getIncidentsForChild('child3', 'random_stalker', [])
    ).rejects.toThrow();
  });

  it('should allow incident viewing if request user is verified parent', async () => {
    await service.registerDelegate('parent3', 'child3');
    // Scan warning to create an incident
    await service.scanText('child3', 'stupid idiot');

    const list = await service.getIncidentsForChild('child3', 'parent3', []);
    expect(list.length).toBe(1);
    expect(list[0]?.incidentType).toBe('cyberbullying');
  });
});
