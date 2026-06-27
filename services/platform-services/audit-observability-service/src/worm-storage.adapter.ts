import { Injectable, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AiDecision } from './entities/ai-decision.entity';

@Injectable()
export class WormStorageAdapter implements OnModuleInit {
  private readonly logger = new Logger(WormStorageAdapter.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(AiDecision)
    private readonly aiDecisionRepository: Repository<AiDecision>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing PostgreSQL WORM triggers...');
    try {
      // Establish WORM constraints at the SQL database layer
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      // Create trigger function to block updates and deletes
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION prevent_worm_modifications()
        RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'WORM Protection Violation: Modifications are strictly prohibited on compliance logs.';
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Bind trigger to audit_logs
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS prevent_audit_logs_modifications ON audit_logs;
        CREATE TRIGGER prevent_audit_logs_modifications
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION prevent_worm_modifications();
      `);

      // Bind trigger to ai_decisions
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS prevent_ai_decisions_modifications ON ai_decisions;
        CREATE TRIGGER prevent_ai_decisions_modifications
        BEFORE UPDATE OR DELETE ON ai_decisions
        FOR EACH ROW EXECUTE FUNCTION prevent_worm_modifications();
      `);

      await queryRunner.release();
      this.logger.log('PostgreSQL database WORM triggers successfully configured.');
    } catch (err: any) {
      this.logger.error(`Failed to configure PostgreSQL WORM triggers: ${err.message}`);
    }
  }

  async writeOnceAudit(id: string, data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const existing = await this.auditLogRepository.findOne({ where: { id } });
    if (existing) {
      throw new BadRequestException(`WORM violation: Audit Log with ID ${id} already exists`);
    }

    const log = this.auditLogRepository.create({ id, ...data });
    return this.auditLogRepository.save(log);
  }

  async writeOnceAi(id: string, data: Omit<AiDecision, 'id' | 'timestamp'>): Promise<AiDecision> {
    const existing = await this.aiDecisionRepository.findOne({ where: { id } });
    if (existing) {
      throw new BadRequestException(`WORM violation: AI Decision with ID ${id} already exists`);
    }

    const record = this.aiDecisionRepository.create({ id, ...data });
    return this.aiDecisionRepository.save(record);
  }

  async readAudit(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  async readAi(id: string): Promise<AiDecision | null> {
    return this.aiDecisionRepository.findOne({ where: { id } });
  }
}
