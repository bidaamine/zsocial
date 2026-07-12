import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FamilyService } from './family.service';
import { HarmonyService } from './harmony.service';
import { Family } from './entities/family.entity';
import { FamilyMember } from './entities/family-member.entity';
import { FamilyMilestone } from './entities/family-milestone.entity';
import { MemberState } from './entities/member-state.entity';

describe('FamilyService', () => {
  let service: FamilyService;
  let famDb: any[];
  let memberDb: any[];

  beforeEach(async () => {
    famDb = [];
    memberDb = [];

    const familyRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (f: any) => {
        f.id = f.id || `fam-${famDb.length}`;
        f.createdAt = new Date();
        famDb.push(f);
        return Promise.resolve(f);
      },
      findOne: ({ where: { id } }: any) => Promise.resolve(famDb.find((f) => f.id === id) || null),
      find: () => Promise.resolve([...famDb]),
    };

    const memberRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (m: any) => {
        m.id = m.id || `mem-${memberDb.length}`;
        const i = memberDb.findIndex((x) => x.familyId === m.familyId && x.userId === m.userId);
        if (i >= 0) memberDb[i] = m; else memberDb.push(m);
        return Promise.resolve(m);
      },
      findOne: ({ where: { familyId, userId } }: any) =>
        Promise.resolve(memberDb.find((m) => m.familyId === familyId && m.userId === userId) || null),
      find: ({ where }: any) => {
        let res = [...memberDb];
        if (where?.familyId) res = res.filter((m) => m.familyId === where.familyId);
        if (where?.userId) res = res.filter((m) => m.userId === where.userId);
        return Promise.resolve(res);
      },
      delete: ({ familyId, userId }: any) => {
        for (let i = memberDb.length - 1; i >= 0; i--) {
          if ((familyId === undefined || memberDb[i].familyId === familyId) && (userId === undefined || memberDb[i].userId === userId)) {
            memberDb.splice(i, 1);
          }
        }
        return Promise.resolve({ affected: 1 });
      },
    };

    const milestoneRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (m: any) => Promise.resolve({ id: 'ms-1', ...m }),
      find: () => Promise.resolve([]),
    };
    const stateRepo = {
      find: () => Promise.resolve([]),
      delete: () => Promise.resolve({ affected: 1 }),
    };
    const harmonyMock = {
      assess: jest.fn().mockResolvedValue({ harmonyScore: 0.7, concerns: [] }),
      upsertMemberState: jest.fn().mockImplementation((f, u, d) => Promise.resolve({ familyId: f, userId: u, ...d })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: getRepositoryToken(Family), useValue: familyRepo },
        { provide: getRepositoryToken(FamilyMember), useValue: memberRepo },
        { provide: getRepositoryToken(FamilyMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(MemberState), useValue: stateRepo },
        { provide: HarmonyService, useValue: harmonyMock },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
  });

  it('creates a family and enrolls the creator as guardian', async () => {
    const fam = await service.createFamily('u1', 'The Smiths');
    expect(fam.id).toBeDefined();
    const members = await service.listMembers(fam.id, 'u1');
    expect(members.length).toBe(1);
    expect(members[0]?.role).toBe('guardian');
  });

  it('lets a guardian add a member but blocks a non-member', async () => {
    const fam = await service.createFamily('u1', 'Fam');
    const added = await service.addMember(fam.id, 'u1', { userId: 'kid', role: 'child', displayName: 'Kid' });
    expect(added.role).toBe('child');
    await expect(service.addMember(fam.id, 'stranger', { userId: 'x' })).rejects.toThrow();
  });

  it('blocks a child from managing the household', async () => {
    const fam = await service.createFamily('u1', 'Fam');
    await service.addMember(fam.id, 'u1', { userId: 'kid', role: 'child' });
    await expect(service.addMember(fam.id, 'kid', { userId: 'y' })).rejects.toThrow();
  });

  it('produces a hub dashboard with members and harmony', async () => {
    const fam = await service.createFamily('u1', 'Fam');
    const dash = await service.getDashboard(fam.id, 'u1');
    expect(dash.family.id).toBe(fam.id);
    expect(dash.members.length).toBe(1);
    expect(dash.harmony).toBeDefined();
  });

  it('allows a member to leave the family themselves', async () => {
    const fam = await service.createFamily('u1', 'Fam');
    await service.addMember(fam.id, 'u1', { userId: 'kid', role: 'child' });
    await service.removeMember(fam.id, 'kid', 'kid');
    const members = await service.listMembers(fam.id, 'u1');
    expect(members.find((m) => m.userId === 'kid')).toBeUndefined();
  });

  it('purges a user from families on GDPR deletion', async () => {
    const fam = await service.createFamily('u1', 'Fam');
    await service.addMember(fam.id, 'u1', { userId: 'kid', role: 'child' });
    await service.deleteUserData('kid');
    const members = await service.listMembers(fam.id, 'u1');
    expect(members.find((m) => m.userId === 'kid')).toBeUndefined();
  });
});
