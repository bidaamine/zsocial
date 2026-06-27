import { Injectable, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParentDelegate } from './entities/parent-delegate.entity';
import { SafetyIncident } from './entities/safety-incident.entity';
import { ClientKafka } from '@nestjs/microservices';

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

  async deleteChildData(userId: string): Promise<void> {
    this.logger.log(`GDPR deletion cascade for child safety logs: ${userId}`);
    await this.delegateRepo.delete({ parentId: userId });
    await this.delegateRepo.delete({ childId: userId });
    await this.incidentRepo.delete({ childId: userId });
  }
}
