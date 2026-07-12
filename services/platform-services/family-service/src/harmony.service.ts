import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { MemberState } from './entities/member-state.entity';
import { FamilyMember } from './entities/family-member.entity';
import { FamilyMilestone } from './entities/family-milestone.entity';

const STRESS_THRESHOLD = 0.6;
const COMMUNICATION_LOW = 0.35;

export interface MemberStateInput {
  stress?: number;
  wellbeing?: number;
  communicationScore?: number;
}

/**
 * Family Harmony Engine (PDF innovation): models the family system as a whole rather
 * than as individuals. Detects elevated family stress (multiple members stressed at
 * once), declining parent-child communication, and milestones needing coordinated
 * support — then, on assess-and-alert, notifies the guardians.
 */
@Injectable()
export class HarmonyService {
  private readonly logger = new Logger(HarmonyService.name);

  constructor(
    @InjectRepository(MemberState)
    private readonly stateRepo: Repository<MemberState>,
    @InjectRepository(FamilyMember)
    private readonly memberRepo: Repository<FamilyMember>,
    @InjectRepository(FamilyMilestone)
    private readonly milestoneRepo: Repository<FamilyMilestone>,
    @Inject('FAMILY_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  private clamp(x: number, lo = 0, hi = 1): number {
    return Math.max(lo, Math.min(hi, x));
  }

  private mean(xs: number[]): number {
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  }

  async upsertMemberState(familyId: string, userId: string, input: MemberStateInput): Promise<MemberState> {
    let state = await this.stateRepo.findOne({ where: { familyId, userId } });
    if (!state) {
      state = this.stateRepo.create({ familyId, userId });
    }
    if (input.stress !== undefined) state.stress = this.clamp(input.stress);
    if (input.wellbeing !== undefined) state.wellbeing = this.clamp(input.wellbeing);
    if (input.communicationScore !== undefined) state.communicationScore = this.clamp(input.communicationScore);
    return this.stateRepo.save(state);
  }

  async assess(familyId: string): Promise<any> {
    const states = await this.stateRepo.find({ where: { familyId } });
    const activeMilestones = await this.milestoneRepo.find({ where: { familyId, active: true } });

    if (states.length === 0) {
      return {
        familyId,
        harmonyScore: null,
        memberCount: 0,
        concerns: [],
        activeMilestones,
        note: 'No member state reported yet — harmony cannot be assessed.',
      };
    }

    const familyStress = this.mean(states.map((s) => s.stress));
    const familyWellbeing = this.mean(states.map((s) => s.wellbeing));
    const communication = this.mean(states.map((s) => s.communicationScore));
    const stressedCount = states.filter((s) => s.stress >= STRESS_THRESHOLD).length;

    const harmonyScore = Number(
      this.clamp(0.4 * familyWellbeing + 0.35 * (1 - familyStress) + 0.25 * communication).toFixed(4),
    );

    const concerns: any[] = [];

    // Elevated family stress: the whole system is under load, not just one person.
    if (states.length >= 2 && stressedCount >= 2) {
      concerns.push({
        type: 'elevated_family_stress',
        severity: stressedCount >= 3 ? 'HIGH' : 'MEDIUM',
        detail: `${stressedCount} of ${states.length} family members are showing elevated stress simultaneously.`,
        support: 'Coordinate a lighter family week and protect shared downtime; avoid stacking new commitments.',
      });
    }

    // Declining parent-child communication.
    if (communication <= COMMUNICATION_LOW) {
      concerns.push({
        type: 'communication_decline',
        severity: 'MEDIUM',
        detail: 'Parent-child communication has declined across the household.',
        support: 'Schedule a low-pressure shared activity to gently reopen communication channels.',
      });
    }

    // Milestones needing coordinated, whole-family support.
    for (const m of activeMilestones) {
      concerns.push({
        type: 'milestone_support',
        severity: 'NOTICE',
        detail: `Active milestone "${m.title}" (${m.type}) — a period that benefits from coordinated support.`,
        support: 'Align expectations across the family and check in on the members most affected.',
      });
    }

    return {
      familyId,
      harmonyScore,
      memberCount: states.length,
      stressedCount,
      familyStress: Number(familyStress.toFixed(4)),
      familyWellbeing: Number(familyWellbeing.toFixed(4)),
      communication: Number(communication.toFixed(4)),
      concerns,
      activeMilestones,
    };
  }

  /** Assess and, if there are concerns, alert every guardian/parent in the household. */
  async assessAndAlert(familyId: string): Promise<any> {
    const assessment = await this.assess(familyId);
    if (!assessment.concerns.length) {
      return assessment;
    }

    const summary = assessment.concerns.map((c: any) => c.detail).join(' ');
    const guardians = await this.memberRepo.find({
      where: { familyId, role: In(['guardian', 'parent']) },
    });

    for (const guardian of guardians) {
      this.kafkaClient.emit('dispatch_notification', {
        userId: guardian.userId,
        channel: 'email',
        templateKey: 'family_harmony_alert',
        recipient: `parent_${guardian.userId.substring(0, 6)}@nexus.ai`,
        variables: { reason: summary },
        category: 'alert',
        priority: 'high',
      });
    }

    this.kafkaClient.emit('family.harmony.alert', {
      familyId,
      harmonyScore: assessment.harmonyScore,
      concernCount: assessment.concerns.length,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Family ${familyId}: ${assessment.concerns.length} harmony concern(s); alerted ${guardians.length} guardian(s).`);
    return assessment;
  }

  async deleteUserState(userId: string): Promise<void> {
    await this.stateRepo.delete({ userId });
  }
}
