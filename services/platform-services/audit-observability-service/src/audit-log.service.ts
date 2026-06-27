import { Injectable } from '@nestjs/common';
import { WormStorageAdapter } from './worm-storage.adapter';

@Injectable()
export class AuditLogService {
  constructor(private readonly worm: WormStorageAdapter) {}

  async logEvent(eventId: string, actor: string, action: string, resource: string) {
    return this.worm.writeOnceAudit(eventId, { actor, action, resource });
  }

  /**
   * Logs AI decisions with explainability metrics to ensure compliance with EU AI Act.
   */
  async logAiDecision(
    eventId: string,
    modelVersion: string,
    inputs: any,
    decision: string,
    confidence: number,
    explanation: string,
  ) {
    return this.worm.writeOnceAi(eventId, {
      modelVersion,
      inputs,
      decision,
      confidence,
      explanation,
    });
  }

  async getEvent(eventId: string) {
    return this.worm.readAudit(eventId);
  }

  async getAiDecision(eventId: string) {
    return this.worm.readAi(eventId);
  }
}
