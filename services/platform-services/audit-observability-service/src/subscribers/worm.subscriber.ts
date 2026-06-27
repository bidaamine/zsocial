import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, RemoveEvent } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { AuditLog } from '../entities/audit-log.entity';
import { AiDecision } from '../entities/ai-decision.entity';

@EventSubscriber()
export class AuditLogWormSubscriber implements EntitySubscriberInterface<AuditLog> {
  listenTo() {
    return AuditLog;
  }

  beforeUpdate(event: UpdateEvent<AuditLog>) {
    throw new BadRequestException('WORM Protection Active: Audit records are write-once and cannot be modified.');
  }

  beforeRemove(event: RemoveEvent<AuditLog>) {
    throw new BadRequestException('WORM Protection Active: Audit records are write-once and cannot be deleted.');
  }
}

@EventSubscriber()
export class AiDecisionWormSubscriber implements EntitySubscriberInterface<AiDecision> {
  listenTo() {
    return AiDecision;
  }

  beforeUpdate(event: UpdateEvent<AiDecision>) {
    throw new BadRequestException('WORM Protection Active: AI decision records are write-once and cannot be modified.');
  }

  beforeRemove(event: RemoveEvent<AiDecision>) {
    throw new BadRequestException('WORM Protection Active: AI decision records are write-once and cannot be deleted.');
  }
}
