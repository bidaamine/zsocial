import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChildSafetyService } from './child-safety.service';
import { ParentDelegate } from './entities/parent-delegate.entity';
import { SafetyIncident } from './entities/safety-incident.entity';
import { WellbeingSnapshot } from './entities/wellbeing-snapshot.entity';

describe('ChildSafetyService', () => {
  let service: ChildSafetyService;
  let delegateDb: Record<string, ParentDelegate>;
  let incidentDb: Record<string, SafetyIncident>;
  let wellbeingDb: any[];
  let kafkaClientMock: any;

  beforeEach(async () => {
    delegateDb = {};
    incidentDb = {};
    wellbeingDb = [];

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

    const wellbeingRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const saved = { id: record.id || `w-${wellbeingDb.length}`, ...record, createdAt: new Date() };
        wellbeingDb.push(saved);
        return Promise.resolve(saved);
      }),
      find: jest.fn().mockImplementation(({ where: { childId } }) =>
        Promise.resolve(wellbeingDb.filter((w) => w.childId === childId).slice().reverse()),
      ),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    kafkaClientMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildSafetyService,
        { provide: getRepositoryToken(ParentDelegate), useValue: delegateRepositoryMock },
        { provide: getRepositoryToken(SafetyIncident), useValue: incidentRepositoryMock },
        { provide: getRepositoryToken(WellbeingSnapshot), useValue: wellbeingRepositoryMock },
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

  it('should treat the first wellbeing snapshots as baseline (no concern)', async () => {
    const r = await service.recordWellbeing('cw1', {
      peerInteractions: 10, lateNightMinutes: 10, socialWithdrawal: 0.1, contentPositivity: 0.8,
    });
    expect(r.trend).toBe('baseline');
    expect(r.concern).toBe(false);
  });

  it('should raise a wellbeing_concern on a sudden decline and alert the parent', async () => {
    await service.registerDelegate('pw', 'cw2');
    // Two healthy baseline snapshots.
    await service.recordWellbeing('cw2', { peerInteractions: 12, lateNightMinutes: 5, socialWithdrawal: 0.05, contentPositivity: 0.9 });
    await service.recordWellbeing('cw2', { peerInteractions: 11, lateNightMinutes: 8, socialWithdrawal: 0.1, contentPositivity: 0.85 });

    // Sudden decline: withdrawal spikes, late-night spikes, peers drop.
    const r = await service.recordWellbeing('cw2', { peerInteractions: 0, lateNightMinutes: 110, socialWithdrawal: 0.9, contentPositivity: 0.1 });

    expect(r.concern).toBe(true);
    expect(r.trend).toBe('concern');
    expect(r.incident.incidentType).toBe('wellbeing_concern');
    expect(r.incident.severity).toBe('HIGH');

    const topics = kafkaClientMock.emit.mock.calls.map((c: any[]) => c[0]);
    expect(topics).toContain('child.wellbeing.checkin');   // gentle check-in to the child
    expect(topics).toContain('dispatch_notification');     // contextual parent alert
  });
});
