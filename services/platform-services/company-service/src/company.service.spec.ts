import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompanyService } from './company.service';
import { Company } from './entities/company.entity';
import { CompanyMember } from './entities/company-member.entity';
import { Department } from './entities/department.entity';

describe('CompanyService', () => {
  let service: CompanyService;
  let companyDb: any[];
  let memberDb: any[];
  let deptDb: any[];

  beforeEach(async () => {
    companyDb = [];
    memberDb = [];
    deptDb = [];

    const companyRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (c: any) => {
        c.id = c.id || `co-${companyDb.length}`;
        const i = companyDb.findIndex((x) => x.id === c.id);
        if (i >= 0) companyDb[i] = c; else companyDb.push(c);
        return Promise.resolve(c);
      },
      findOne: ({ where }: any) =>
        Promise.resolve(companyDb.find((c) => (where.id ? c.id === where.id : c.slug === where.slug)) || null),
      find: () => Promise.resolve([...companyDb]),
    };
    const memberRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (m: any) => {
        m.id = m.id || `mem-${memberDb.length}`;
        const i = memberDb.findIndex((x) => x.companyId === m.companyId && x.userId === m.userId);
        if (i >= 0) memberDb[i] = m; else memberDb.push(m);
        return Promise.resolve(m);
      },
      findOne: ({ where: { companyId, userId } }: any) =>
        Promise.resolve(memberDb.find((m) => m.companyId === companyId && m.userId === userId) || null),
      find: ({ where }: any) => {
        let res = [...memberDb];
        if (where?.companyId) res = res.filter((m) => m.companyId === where.companyId);
        if (where?.userId) res = res.filter((m) => m.userId === where.userId);
        return Promise.resolve(res);
      },
      delete: ({ companyId, userId }: any) => {
        for (let i = memberDb.length - 1; i >= 0; i--) {
          if ((companyId === undefined || memberDb[i].companyId === companyId) && (userId === undefined || memberDb[i].userId === userId)) {
            memberDb.splice(i, 1);
          }
        }
        return Promise.resolve({ affected: 1 });
      },
    };
    const departmentRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (d: any) => {
        d.id = d.id || `dep-${deptDb.length}`;
        deptDb.push(d);
        return Promise.resolve(d);
      },
      findOne: ({ where: { id, companyId } }: any) =>
        Promise.resolve(deptDb.find((d) => d.id === id && d.companyId === companyId) || null),
      find: ({ where: { companyId } }: any) => Promise.resolve(deptDb.filter((d) => d.companyId === companyId)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: getRepositoryToken(CompanyMember), useValue: memberRepo },
        { provide: getRepositoryToken(Department), useValue: departmentRepo },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it('creates a company, generates a slug, and enrolls the creator as owner', async () => {
    const co = await service.createCompany('u1', { name: 'Acme Corp', industry: 'tech' });
    expect(co.id).toBeDefined();
    expect(co.slug).toBe('acme-corp');
    const members = await service.listMembers(co.id, 'u1');
    expect(members.length).toBe(1);
    expect(members[0]?.role).toBe('owner');
  });

  it('generates unique slugs for duplicate names', async () => {
    const a = await service.createCompany('u1', { name: 'Acme' });
    const b = await service.createCompany('u2', { name: 'Acme' });
    expect(a.slug).toBe('acme');
    expect(b.slug).toBe('acme-1');
  });

  it('lets an owner add members but blocks a plain member', async () => {
    const co = await service.createCompany('u1', { name: 'Acme' });
    const added = await service.addMember(co.id, 'u1', { userId: 'e1', role: 'member', title: 'Engineer' });
    expect(added.title).toBe('Engineer');
    await expect(service.addMember(co.id, 'e1', { userId: 'e2' })).rejects.toThrow();
  });

  it('builds a nested department hierarchy with members', async () => {
    const co = await service.createCompany('u1', { name: 'Acme' });
    const eng = await service.addDepartment(co.id, 'u1', { name: 'Engineering' });
    const platform = await service.addDepartment(co.id, 'u1', { name: 'Platform', parentDepartmentId: eng.id });
    await service.addMember(co.id, 'u1', { userId: 'e1', role: 'manager', title: 'Lead', departmentId: platform.id });

    const tree = await service.getHierarchy(co.id, 'u1');
    expect(tree.departments.length).toBe(1); // Engineering is the single root
    expect(tree.departments[0].name).toBe('Engineering');
    expect(tree.departments[0].children[0].name).toBe('Platform');
    expect(tree.departments[0].children[0].members[0].userId).toBe('e1');
  });

  it('purges a user from companies on GDPR deletion', async () => {
    const co = await service.createCompany('u1', { name: 'Acme' });
    await service.addMember(co.id, 'u1', { userId: 'e1', role: 'member' });
    await service.deleteUserData('e1');
    const members = await service.listMembers(co.id, 'u1');
    expect(members.find((m) => m.userId === 'e1')).toBeUndefined();
  });
});
