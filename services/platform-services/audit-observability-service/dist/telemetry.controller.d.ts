import { AuditLogService } from './audit-log.service';
export declare class TelemetryController {
    private audit;
    constructor(audit: AuditLogService);
    recordAudit(body: {
        eventId: string;
        actor: string;
        action: string;
        resource: string;
    }): any;
    getAudit(eventId: string): any;
}
//# sourceMappingURL=telemetry.controller.d.ts.map