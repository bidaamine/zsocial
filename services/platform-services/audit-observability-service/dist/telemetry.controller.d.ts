import { AuditLogService } from './audit-log.service';
export declare class TelemetryController {
    private readonly audit;
    constructor(audit: AuditLogService);
    recordAudit(body: {
        eventId: string;
        actor: string;
        action: string;
        resource: string;
    }): Promise<import("./entities/audit-log.entity").AuditLog>;
    getAudit(eventId: string): Promise<import("./entities/audit-log.entity").AuditLog | null>;
    recordAiDecision(body: {
        eventId: string;
        modelVersion: string;
        inputs: any;
        decision: string;
        confidence: number;
        explanation: string;
    }): Promise<import("./entities/ai-decision.entity").AiDecision>;
    getAiDecision(eventId: string): Promise<import("./entities/ai-decision.entity").AiDecision | null>;
}
//# sourceMappingURL=telemetry.controller.d.ts.map