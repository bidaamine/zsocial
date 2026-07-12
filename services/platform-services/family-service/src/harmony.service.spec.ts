import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HarmonyService } from './harmony.service';
import { MemberState } from './entities/member-state.entity';
import { FamilyMember } from './entities/family-member.entity';
import { FamilyMilestone } from './entities/family-milestone.entity';

describe('HarmonyService', () => {
  let service: HarmonyService;
  let stateDb: any[];
  let memberDb: any[];
  let milestoneDb: any[];
  let kafka: any;

  beforeEach(async () => {
    stateDb = [];
    memberDb = [];
    milestoneDb = [];
    kafka = { emit: jest.fn() };

    const stateRepo = {
      find: ({ where: { familyId } }: any) => Promise.resolve(stateDb.filter((s) => s.familyId === familyId)),
      findOne: ({ where: { familyId, userId } }: any) =>
        Promise.resolve(stateDb.find((s) => s.familyId === familyId && s.userId === userId) || null),
      create: (dto: any) => ({ ...dto }),
      save: (s: any) => {
        const i = stateDb.findIndex((x) => x.familyId === s.familyId && x.userId === s.userId);
        if (i >= 0) stateDb[i] = s; else stateDb.push(s);
        return Promise.resolve(s);
      },
      delete: () => Promise.resolve({ affected: 1 }),
    };
    const memberRepo = {
      // The only In() query is role In ['guardian','parent'].
      find: ({ where: { familyId, role } }: any) =>
        Promise.resolve(memberDb.filter((m) => m.familyId === familyId && (role ? ['guardian', 'parent'].includes(m.role) : true))),
    };
    const milestoneRepo = {
      find: ({ where: { familyId, active } }: any) =>
        Promise.resolve(milestoneDb.filter((m) => m.familyId === familyId && (active === undefined || m.active === active))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HarmonyService,
        { provide: getRepositoryToken(MemberState), useValue: stateRepo },
        { provide: getRepositoryToken(FamilyMember), useValue: memberRepo },
        { provide: getRepositoryToken(FamilyMilestone), useValue: milestoneRepo },
        { provide: 'FAMILY_CLIENT', useValue: kafka },
      ],
    }).compile();

    service = module.get<HarmonyService>(HarmonyService);
  });

  it('returns no assessment when no member state is reported', async () => {
    const a = await service.assess('empty');
    expect(a.harmonyScore).toBeNull();
    expect(a.memberCount).toBe(0);
  });

  it('flags elevated family stress when 2+ members are stressed at once', async () => {
    stateDb.push({ familyId: 'f1', userId: 'a', stress: 0.8, wellbeing: 0.3, communicationScore: 0.6 });
    stateDb.push({ familyId: 'f1', userId: 'b', stress: 0.7, wellbeing: 0.4, communicationScore: 0.6 });
    const a = await service.assess('f1');
    expect(a.memberCount).toBe(2);
    expect(a.stressedCount).toBe(2);
    expect(a.concerns.some((c: any) => c.type === 'elevated_family_stress')).toBe(true);
  });

  it('flags declining parent-child communication', async () => {
    stateDb.push({ familyId: 'f2', userId: 'a', stress: 0.2, wellbeing: 0.8, communicationScore: 0.2 });
    const a = await service.assess('f2');
    expect(a.concerns.some((c: any) => c.type === 'communication_decline')).toBe(true);
  });

  it('flags active milestones needing coordinated support', async () => {
    stateDb.push({ familyId: 'f3', userId: 'a', stress: 0.2, wellbeing: 0.8, communicationScore: 0.8 });
    milestoneDb.push({ familyId: 'f3', title: 'Exam period', type: 'exam_period', active: true });
    const a = await service.assess('f3');
    expect(a.concerns.some((c: any) => c.type === 'milestone_support')).toBe(true);
  });

  it('alerts only guardians/parents when concerns are present', async () => {
    stateDb.push({ familyId: 'f4', userId: 'a', stress: 0.8, wellbeing: 0.3, communicationScore: 0.6 });
    stateDb.push({ familyId: 'f4', userId: 'b', stress: 0.75, wellbeing: 0.3, communicationScore: 0.6 });
    memberDb.push({ familyId: 'f4', userId: 'g1', role: 'guardian' });
    memberDb.push({ familyId: 'f4', userId: 'c1', role: 'child' });

    await service.assessAndAlert('f4');

    const topics = kafka.emit.mock.calls.map((c: any[]) => c[0]);
    expect(topics).toContain('dispatch_notification');
    expect(topics).toContain('family.harmony.alert');

    const notifs = kafka.emit.mock.calls.filter((c: any[]) => c[0] === 'dispatch_notification');
    expect(notifs.length).toBe(1);            // only the guardian, not the child
    expect(notifs[0][1].userId).toBe('g1');
  });

  it('does not alert when there are no concerns', async () => {
    stateDb.push({ familyId: 'f5', userId: 'a', stress: 0.2, wellbeing: 0.9, communicationScore: 0.9 });
    memberDb.push({ familyId: 'f5', userId: 'g1', role: 'guardian' });
    await service.assessAndAlert('f5');
    expect(kafka.emit).not.toHaveBeenCalled();
  });
});
