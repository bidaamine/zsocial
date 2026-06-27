import { WormStorageAdapter } from './worm-storage.adapter';
export declare class AuditLogService {
    private readonly worm;
    constructor(worm: WormStorageAdapter);
    logEvent(eventId: string, actor: string, action: string, resource: string): Promise<import("./entities/audit-log.entity").AuditLog>;
    /**
     * Logs AI decisions with explainability metrics to ensure compliance with EU AI Act.
     */
    logAiDecision(eventId: string, modelVersion: string, inputs: any, decision: string, confidence: number, explanation: string): Promise<import("./entities/ai-decision.entity").AiDecision>;
    getEvent(eventId: string): Promise<import("./entities/audit-log.entity").AuditLog | null>;
    getAiDecision(eventId: string): Promise<import("./entities/ai-decision.entity").AiDecision | null>;
}
//# sourceMappingURL=audit-log.service.d.ts.map