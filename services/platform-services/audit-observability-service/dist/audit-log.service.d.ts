import { WormStorageAdapter } from './worm-storage.adapter';
export declare class AuditLogService {
    private worm;
    constructor(worm: WormStorageAdapter);
    logEvent(eventId: string, actor: string, action: string, resource: string): any;
    getEvent(eventId: string): any;
}
//# sourceMappingURL=audit-log.service.d.ts.map