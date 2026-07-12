import { Injectable, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParentDelegate } from './entities/parent-delegate.entity';
import { SafetyIncident } from './entities/safety-incident.entity';
import { WellbeingSnapshot } from './entities/wellbeing-snapshot.entity';
import { ClientKafka } from '@nestjs/microservices';

export interface WellbeingSignals {
  peerInteractions?: number;
  lateNightMinutes?: number;
  socialWithdrawal?: number;   // 0..1
  contentPositivity?: number;  // 0..1
}

@Injectable()
export class ChildSafetyService {
  private readonly logger = new Logger(ChildSafetyService.name);

  // Safeguarding heuristics patterns
  private readonly groomingPatterns = [
    /don't tell your parents/i,
    /keep this secret/i,
    /send me photos/i,
    /don't tell anyone/i,
    /meet me in private/i,
    /don't show your mom/i,
  ];

  private readonly bullyingPatterns = [
    /kill yourself/i,
    /nobody likes you/i,
    /you are worthless/i,
    /stupid idiot/i,
    /hate you/i,
  ];

  constructor(
    @InjectRepository(ParentDelegate)
    private readonly delegateRepo: Repository<ParentDelegate>,
    @InjectRepository(SafetyIncident)
    private readonly incidentRepo: Repository<SafetyIncident>,
    @InjectRepository(WellbeingSnapshot)
    private readonly wellbeingRepo: Repository<WellbeingSnapshot>,
    @Inject('SAFETY_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async registerDelegate(parentId: string, childId: string): Promise<ParentDelegate> {
    this.logger.log(`Registering parental delegate for parent ${parentId} over child ${childId}`);
    let delegate = await this.delegateRepo.findOne({ where: { parentId, childId } });
    if (!delegate) {
      delegate = this.delegateRepo.create({
        parentId,
        childId,
        coppaConsentGranted: false,
      });
    }
    return this.delegateRepo.save(delegate);
  }

  async grantCoppaConsent(parentId: string, childId: string, granted: boolean): Promise<ParentDelegate> {
    const delegate = await this.delegateRepo.findOne({ where: { parentId, childId } });
    if (!delegate) {
      throw new ForbiddenException('Parent relationship delegate verification failed');
    }
    delegate.coppaConsentGranted = granted;
    return this.delegateRepo.save(delegate);
  }

  async getDelegatesByParent(parentId: string): Promise<ParentDelegate[]> {
    return this.delegateRepo.find({ where: { parentId } });
  }

  async scanText(childId: string, text: string): Promise<{ flagged: boolean; incident?: SafetyIncident }> {
    this.logger.log(`Scanning text for child safety check (Child ID: ${childId})`);

    let flagged = false;
    let incidentType: 'cyberbullying' | 'grooming_risk' | 'age_gate_violation' = 'cyberbullying';
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let description = '';

    // 1. Check grooming
    for (const pattern of this.groomingPatterns) {
      if (pattern.test(text)) {
        flagged = true;
        incidentType = 'grooming_risk';
        severity = 'CRITICAL';
        description = `Potential grooming cue detected in conversation: "${text.substring(0, 60)}"`;
        break;
      }
    }

    // 2. Check bullying if not grooming
    if (!flagged) {
      for (const pattern of this.bullyingPatterns) {
        if (pattern.test(text)) {
          flagged = true;
          incidentType = 'cyberbullying';
          severity = 'HIGH';
          description = `Potential cyberbullying threat flagged in text: "${text.substring(0, 60)}"`;
          break;
        }
      }
    }

    if (flagged) {
      const incident = this.incidentRepo.create({
        childId,
        incidentType,
        severity,
        description,
        metadata: { scannedText: text },
      });
      const savedIncident = await this.incidentRepo.save(incident);

      // Emit Kafka Event for other services
      this.kafkaClient.emit('child.safety.incident', {
        childId,
        incidentId: savedIncident.id,
        incidentType,
        severity,
        timestamp: new Date().toISOString(),
      });

      // Find parent to notify
      const delegate = await this.delegateRepo.findOne({ where: { childId } });
      if (delegate) {
        // Dispatch warning email to parent via Notification service over Kafka
        this.kafkaClient.emit('dispatch_notification', {
          userId: delegate.parentId,
          channel: 'email',
          templateKey: 'child_safety_alert',
          recipient: `parent_${delegate.parentId.substring(0, 6)}@nexus.ai`, // mock parent email
          variables: { reason: description },
        });
      }

      return { flagged: true, incident: savedIncident };
    }

    return { flagged: false };
  }

  async getIncidentsForChild(childId: string, requesterId: string, requesterRoles: string[]): Promise<SafetyIncident[]> {
    // Zero-Trust Check: Ensure requester is either child themselves, or verified parent
    const isChild = requesterId === childId;
    const delegate = await this.delegateRepo.findOne({ where: { parentId: requesterId, childId } });
    const isAdmin = requesterRoles.includes('admin');

    if (!isChild && !delegate && !isAdmin) {
      throw new ForbiddenException('Access denied: You must be a parent or delegate to view child safety reports.');
    }

    return this.incidentRepo.find({ where: { childId }, order: { createdAt: 'DESC' } });
  }

  // ── Longitudinal emotional wellbeing monitoring (PDF Module 5) ─────
  private clamp(x: number, lo = 0, hi = 1): number {
    return Math.max(lo, Math.min(hi, x));
  }

  /** Combine behavioural signals into a 0..1 wellbeing score (higher = healthier). */
  private computeWellbeingScore(s: WellbeingSignals): number {
    const peer = this.clamp((s.peerInteractions ?? 0) / 15);          // more peers → better
    const lateNight = this.clamp((s.lateNightMinutes ?? 0) / 120);     // more late night → worse
    const withdrawal = this.clamp(s.socialWithdrawal ?? 0);           // higher → worse
    const positivity = this.clamp(s.contentPositivity ?? 0.5);        // higher → better
    const score = (peer + (1 - lateNight) + (1 - withdrawal) + positivity) / 4;
    return Number(this.clamp(score).toFixed(4));
  }

  /**
   * Records a wellbeing snapshot and assesses it against the child's recent baseline.
   * A sudden decline or a low absolute score raises a gentle check-in for the child and,
   * if concerning, a contextual alert to the parent.
   */
  async recordWellbeing(childId: string, signals: WellbeingSignals): Promise<any> {
    const wellbeingScore = this.computeWellbeingScore(signals);

    // Baseline = mean of the child's previous snapshots (before this one).
    const prior = await this.wellbeingRepo.find({
      where: { childId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const snapshot = await this.wellbeingRepo.save(
      this.wellbeingRepo.create({
        childId,
        peerInteractions: signals.peerInteractions ?? 0,
        lateNightMinutes: signals.lateNightMinutes ?? 0,
        socialWithdrawal: signals.socialWithdrawal ?? 0,
        contentPositivity: signals.contentPositivity ?? 0.5,
        wellbeingScore,
      }),
    );

    if (prior.length < 2) {
      return { childId, wellbeingScore, trend: 'baseline', concern: false, snapshot };
    }

    const baseline = prior.reduce((a, p) => a + p.wellbeingScore, 0) / prior.length;
    const drop = baseline - wellbeingScore;

    let trend: 'improving' | 'stable' | 'declining' | 'concern' = 'stable';
    if (drop >= 0.05 && drop < 0.2) trend = 'declining';
    else if (wellbeingScore - baseline >= 0.05) trend = 'improving';

    const concern = drop >= 0.2 || wellbeingScore < 0.3;
    if (!concern) {
      return { childId, wellbeingScore, baseline: Number(baseline.toFixed(4)), trend, concern: false, snapshot };
    }

    trend = 'concern';
    const severity: 'MEDIUM' | 'HIGH' = drop >= 0.35 || wellbeingScore < 0.2 ? 'HIGH' : 'MEDIUM';
    const description =
      `Longitudinal wellbeing decline for child ${childId}: score ${wellbeingScore.toFixed(2)} ` +
      `vs baseline ${baseline.toFixed(2)} (drop ${drop.toFixed(2)}).`;

    const incident = await this.incidentRepo.save(
      this.incidentRepo.create({
        childId,
        incidentType: 'wellbeing_concern',
        severity,
        description,
        metadata: { wellbeingScore, baseline, drop, signals },
      }),
    );

    // Gentle, supportive check-in prompt to the child (not surveillance).
    this.kafkaClient.emit('child.wellbeing.checkin', {
      childId,
      wellbeingScore,
      severity,
      timestamp: new Date().toISOString(),
    });

    // Contextual alert to the parent.
    const delegate = await this.delegateRepo.findOne({ where: { childId } });
    if (delegate) {
      this.kafkaClient.emit('dispatch_notification', {
        userId: delegate.parentId,
        channel: 'email',
        templateKey: 'child_safety_alert',
        recipient: `parent_${delegate.parentId.substring(0, 6)}@nexus.ai`,
        variables: { reason: description },
      });
    }

    return { childId, wellbeingScore, baseline: Number(baseline.toFixed(4)), trend, concern: true, incident };
  }

  async getWellbeingTrend(childId: string, requesterId: string, requesterRoles: string[]): Promise<any> {
    // Same Zero-Trust access rule as incident reports.
    const isChild = requesterId === childId;
    const delegate = await this.delegateRepo.findOne({ where: { parentId: requesterId, childId } });
    if (!isChild && !delegate && !requesterRoles.includes('admin')) {
      throw new ForbiddenException('Access denied: only the child, a verified parent, or an admin may view wellbeing.');
    }
    const snapshots = await this.wellbeingRepo.find({
      where: { childId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
    const latest = snapshots[0];
    const baseline = snapshots.length
      ? snapshots.reduce((a, s) => a + s.wellbeingScore, 0) / snapshots.length
      : null;
    return { childId, current: latest?.wellbeingScore ?? null, baseline, snapshots };
  }

  async deleteChildData(userId: string): Promise<void> {
    this.logger.log(`GDPR deletion cascade for child safety logs: ${userId}`);
    await this.delegateRepo.delete({ parentId: userId });
    await this.delegateRepo.delete({ childId: userId });
    await this.incidentRepo.delete({ childId: userId });
    await this.wellbeingRepo.delete({ childId: userId });
  }
}
