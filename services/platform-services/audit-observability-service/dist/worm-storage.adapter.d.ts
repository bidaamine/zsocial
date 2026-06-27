import { OnModuleInit } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AiDecision } from './entities/ai-decision.entity';
export declare class WormStorageAdapter implements OnModuleInit {
    private readonly auditLogRepository;
    private readonly aiDecisionRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(auditLogRepository: Repository<AuditLog>, aiDecisionRepository: Repository<AiDecision>, dataSource: DataSource);
    onModuleInit(): Promise<void>;
    writeOnceAudit(id: string, data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
    writeOnceAi(id: string, data: Omit<AiDecision, 'id' | 'timestamp'>): Promise<AiDecision>;
    readAudit(id: string): Promise<AuditLog | null>;
    readAi(id: string): Promise<AiDecision | null>;
}
//# sourceMappingURL=worm-storage.adapter.d.ts.map