import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CompanyMember, CompanyRole } from './entities/company-member.entity';
import { Department } from './entities/department.entity';

const AUTHORITY_ROLES: CompanyRole[] = ['owner', 'admin'];

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyMember)
    private readonly memberRepo: Repository<CompanyMember>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  // ── Access helpers ────────────────────────────────────────────────
  private async requireMembership(companyId: string, userId: string): Promise<CompanyMember> {
    const member = await this.memberRepo.findOne({ where: { companyId, userId } });
    if (!member) throw new ForbiddenException('Access denied: you are not a member of this company.');
    return member;
  }

  private async requireAuthority(companyId: string, userId: string): Promise<CompanyMember> {
    const member = await this.requireMembership(companyId, userId);
    if (!AUTHORITY_ROLES.includes(member.role)) {
      throw new ForbiddenException('Access denied: only an owner or admin can perform this action.');
    }
    return member;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company';
    let slug = base;
    let n = 1;
    while (await this.companyRepo.findOne({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    return slug;
  }

  // ── Company CRUD ──────────────────────────────────────────────────
  async createCompany(
    userId: string,
    data: { name: string; industry?: string; size?: string; description?: string; website?: string },
  ): Promise<Company> {
    this.logger.log(`Creating company "${data.name}" for owner ${userId}`);
    const company = await this.companyRepo.save(
      this.companyRepo.create({
        name: data.name,
        slug: await this.uniqueSlug(data.name),
        industry: data.industry,
        size: data.size,
        description: data.description,
        website: data.website,
        createdBy: userId,
      }),
    );
    await this.memberRepo.save(this.memberRepo.create({ companyId: company.id, userId, role: 'owner' }));
    return company;
  }

  async getMyCompanies(userId: string): Promise<Company[]> {
    const memberships = await this.memberRepo.find({ where: { userId } });
    if (!memberships.length) return [];
    return this.companyRepo.find({ where: { id: In(memberships.map((m) => m.companyId)) } });
  }

  async getCompany(companyId: string, requesterId: string): Promise<Company> {
    await this.requireMembership(companyId, requesterId);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException(`Company ${companyId} not found`);
    return company;
  }

  async updateCompany(
    companyId: string,
    requesterId: string,
    data: Partial<Pick<Company, 'name' | 'industry' | 'size' | 'description' | 'website'>>,
  ): Promise<Company> {
    await this.requireAuthority(companyId, requesterId);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException(`Company ${companyId} not found`);
    Object.assign(company, {
      name: data.name ?? company.name,
      industry: data.industry ?? company.industry,
      size: data.size ?? company.size,
      description: data.description ?? company.description,
      website: data.website ?? company.website,
    });
    return this.companyRepo.save(company);
  }

  // ── Members ───────────────────────────────────────────────────────
  async addMember(
    companyId: string,
    requesterId: string,
    data: { userId: string; role?: CompanyRole; title?: string; departmentId?: string },
  ): Promise<CompanyMember> {
    await this.requireAuthority(companyId, requesterId);
    const existing = await this.memberRepo.findOne({ where: { companyId, userId: data.userId } });
    if (existing) throw new ConflictException('That user is already a member of this company.');
    return this.memberRepo.save(
      this.memberRepo.create({
        companyId,
        userId: data.userId,
        role: data.role || 'member',
        title: data.title,
        departmentId: data.departmentId,
      }),
    );
  }

  async listMembers(companyId: string, requesterId: string): Promise<CompanyMember[]> {
    await this.requireMembership(companyId, requesterId);
    return this.memberRepo.find({ where: { companyId }, order: { joinedAt: 'ASC' } });
  }

  async removeMember(companyId: string, requesterId: string, memberUserId: string): Promise<void> {
    if (requesterId !== memberUserId) {
      await this.requireAuthority(companyId, requesterId);
    } else {
      await this.requireMembership(companyId, requesterId);
    }
    await this.memberRepo.delete({ companyId, userId: memberUserId });
  }

  // ── Departments / hierarchy ───────────────────────────────────────
  async addDepartment(
    companyId: string,
    requesterId: string,
    data: { name: string; parentDepartmentId?: string },
  ): Promise<Department> {
    await this.requireAuthority(companyId, requesterId);
    if (data.parentDepartmentId) {
      const parent = await this.departmentRepo.findOne({ where: { id: data.parentDepartmentId, companyId } });
      if (!parent) throw new NotFoundException('Parent department not found in this company.');
    }
    return this.departmentRepo.save(
      this.departmentRepo.create({ companyId, name: data.name, parentDepartmentId: data.parentDepartmentId }),
    );
  }

  async listDepartments(companyId: string, requesterId: string): Promise<Department[]> {
    await this.requireMembership(companyId, requesterId);
    return this.departmentRepo.find({ where: { companyId }, order: { createdAt: 'ASC' } });
  }

  /** Nested org chart: departments as a tree with their members attached. */
  async getHierarchy(companyId: string, requesterId: string): Promise<any> {
    await this.requireMembership(companyId, requesterId);
    const [departments, members] = await Promise.all([
      this.departmentRepo.find({ where: { companyId } }),
      this.memberRepo.find({ where: { companyId } }),
    ]);

    const membersByDept = new Map<string, CompanyMember[]>();
    for (const m of members) {
      const key = m.departmentId || '__unassigned__';
      if (!membersByDept.has(key)) membersByDept.set(key, []);
      membersByDept.get(key)!.push(m);
    }

    const toNode = (dept: Department): any => ({
      id: dept.id,
      name: dept.name,
      members: (membersByDept.get(dept.id) || []).map((m) => ({ userId: m.userId, role: m.role, title: m.title })),
      children: departments.filter((d) => d.parentDepartmentId === dept.id).map(toNode),
    });

    const roots = departments.filter((d) => !d.parentDepartmentId).map(toNode);
    return {
      companyId,
      departments: roots,
      unassignedMembers: (membersByDept.get('__unassigned__') || []).map((m) => ({ userId: m.userId, role: m.role, title: m.title })),
    };
  }

  // ── GDPR cascade ──────────────────────────────────────────────────
  async deleteUserData(userId: string): Promise<void> {
    this.logger.log(`GDPR cascade: removing user ${userId} from all companies`);
    await this.memberRepo.delete({ userId });
  }
}
