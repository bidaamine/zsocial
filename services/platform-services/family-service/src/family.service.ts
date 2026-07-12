import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Family } from './entities/family.entity';
import { FamilyMember, FamilyRole } from './entities/family-member.entity';
import { FamilyMilestone, MilestoneType } from './entities/family-milestone.entity';
import { MemberState } from './entities/member-state.entity';
import { HarmonyService } from './harmony.service';

const AUTHORITY_ROLES: FamilyRole[] = ['guardian', 'parent'];

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    @InjectRepository(Family)
    private readonly familyRepo: Repository<Family>,
    @InjectRepository(FamilyMember)
    private readonly memberRepo: Repository<FamilyMember>,
    @InjectRepository(FamilyMilestone)
    private readonly milestoneRepo: Repository<FamilyMilestone>,
    @InjectRepository(MemberState)
    private readonly stateRepo: Repository<MemberState>,
    private readonly harmony: HarmonyService,
  ) {}

  // ── Access helpers ────────────────────────────────────────────────
  private async requireMembership(familyId: string, userId: string): Promise<FamilyMember> {
    const member = await this.memberRepo.findOne({ where: { familyId, userId } });
    if (!member) {
      throw new ForbiddenException('Access denied: you are not a member of this family.');
    }
    return member;
  }

  private async requireAuthority(familyId: string, userId: string): Promise<FamilyMember> {
    const member = await this.requireMembership(familyId, userId);
    if (!AUTHORITY_ROLES.includes(member.role)) {
      throw new ForbiddenException('Access denied: only a guardian or parent can perform this action.');
    }
    return member;
  }

  // ── Household CRUD ────────────────────────────────────────────────
  async createFamily(userId: string, name: string): Promise<Family> {
    this.logger.log(`Creating family "${name}" for guardian ${userId}`);
    const family = await this.familyRepo.save(this.familyRepo.create({ name, createdBy: userId }));
    await this.memberRepo.save(
      this.memberRepo.create({ familyId: family.id, userId, role: 'guardian' }),
    );
    return family;
  }

  async getMyFamilies(userId: string): Promise<Family[]> {
    const memberships = await this.memberRepo.find({ where: { userId } });
    if (!memberships.length) return [];
    const ids = memberships.map((m) => m.familyId);
    return this.familyRepo.find({ where: { id: In(ids) } });
  }

  async getFamily(familyId: string, requesterId: string): Promise<Family> {
    await this.requireMembership(familyId, requesterId);
    const family = await this.familyRepo.findOne({ where: { id: familyId } });
    if (!family) throw new NotFoundException(`Family ${familyId} not found`);
    return family;
  }

  async listMembers(familyId: string, requesterId: string): Promise<FamilyMember[]> {
    await this.requireMembership(familyId, requesterId);
    return this.memberRepo.find({ where: { familyId }, order: { joinedAt: 'ASC' } });
  }

  async addMember(
    familyId: string,
    requesterId: string,
    data: { userId: string; role?: FamilyRole; displayName?: string },
  ): Promise<FamilyMember> {
    await this.requireAuthority(familyId, requesterId);
    const existing = await this.memberRepo.findOne({ where: { familyId, userId: data.userId } });
    if (existing) {
      throw new ConflictException('That user is already a member of this family.');
    }
    return this.memberRepo.save(
      this.memberRepo.create({
        familyId,
        userId: data.userId,
        role: data.role || 'member',
        displayName: data.displayName,
      }),
    );
  }

  async removeMember(familyId: string, requesterId: string, memberUserId: string): Promise<void> {
    // A member may remove themselves; otherwise authority is required.
    if (requesterId !== memberUserId) {
      await this.requireAuthority(familyId, requesterId);
    } else {
      await this.requireMembership(familyId, requesterId);
    }
    await this.memberRepo.delete({ familyId, userId: memberUserId });
    await this.stateRepo.delete({ familyId, userId: memberUserId });
  }

  // ── Milestones ────────────────────────────────────────────────────
  async addMilestone(
    familyId: string,
    requesterId: string,
    data: { type?: MilestoneType; title: string; eventDate?: string },
  ): Promise<FamilyMilestone> {
    await this.requireAuthority(familyId, requesterId);
    return this.milestoneRepo.save(
      this.milestoneRepo.create({
        familyId,
        type: data.type || 'other',
        title: data.title,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        active: true,
      }),
    );
  }

  async listMilestones(familyId: string, requesterId: string): Promise<FamilyMilestone[]> {
    await this.requireMembership(familyId, requesterId);
    return this.milestoneRepo.find({ where: { familyId }, order: { createdAt: 'DESC' } });
  }

  // ── Member state (harmony input) ──────────────────────────────────
  async reportMemberState(
    familyId: string,
    requesterId: string,
    data: { userId?: string; stress?: number; wellbeing?: number; communicationScore?: number },
  ): Promise<MemberState> {
    // A member may report their own state; a guardian may report on behalf of a member.
    const targetUserId = data.userId || requesterId;
    if (targetUserId !== requesterId) {
      await this.requireAuthority(familyId, requesterId);
    } else {
      await this.requireMembership(familyId, requesterId);
    }
    return this.harmony.upsertMemberState(familyId, targetUserId, data);
  }

  // ── Family Hub dashboard ──────────────────────────────────────────
  async getDashboard(familyId: string, requesterId: string): Promise<any> {
    await this.requireMembership(familyId, requesterId);
    const family = await this.familyRepo.findOne({ where: { id: familyId } });
    if (!family) throw new NotFoundException(`Family ${familyId} not found`);

    const members = await this.memberRepo.find({ where: { familyId }, order: { joinedAt: 'ASC' } });
    const states = await this.stateRepo.find({ where: { familyId } });
    const stateByUser = new Map(states.map((s) => [s.userId, s]));
    const harmony = await this.harmony.assess(familyId);

    return {
      family,
      harmony,
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        displayName: m.displayName,
        state: stateByUser.get(m.userId)
          ? {
              stress: stateByUser.get(m.userId)!.stress,
              wellbeing: stateByUser.get(m.userId)!.wellbeing,
              communicationScore: stateByUser.get(m.userId)!.communicationScore,
              updatedAt: stateByUser.get(m.userId)!.updatedAt,
            }
          : null,
      })),
    };
  }

  // ── GDPR cascade ──────────────────────────────────────────────────
  async deleteUserData(userId: string): Promise<void> {
    this.logger.log(`GDPR cascade: removing user ${userId} from all families`);
    await this.memberRepo.delete({ userId });
    await this.stateRepo.delete({ userId });
  }
}
