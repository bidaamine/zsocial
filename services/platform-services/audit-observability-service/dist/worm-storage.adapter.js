"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WormStorageAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WormStorageAdapter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const ai_decision_entity_1 = require("./entities/ai-decision.entity");
let WormStorageAdapter = WormStorageAdapter_1 = class WormStorageAdapter {
    auditLogRepository;
    aiDecisionRepository;
    dataSource;
    logger = new common_1.Logger(WormStorageAdapter_1.name);
    constructor(auditLogRepository, aiDecisionRepository, dataSource) {
        this.auditLogRepository = auditLogRepository;
        this.aiDecisionRepository = aiDecisionRepository;
        this.dataSource = dataSource;
    }
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
        }
        catch (err) {
            this.logger.error(`Failed to configure PostgreSQL WORM triggers: ${err.message}`);
        }
    }
    async writeOnceAudit(id, data) {
        const existing = await this.auditLogRepository.findOne({ where: { id } });
        if (existing) {
            throw new common_1.BadRequestException(`WORM violation: Audit Log with ID ${id} already exists`);
        }
        const log = this.auditLogRepository.create({ id, ...data });
        return this.auditLogRepository.save(log);
    }
    async writeOnceAi(id, data) {
        const existing = await this.aiDecisionRepository.findOne({ where: { id } });
        if (existing) {
            throw new common_1.BadRequestException(`WORM violation: AI Decision with ID ${id} already exists`);
        }
        const record = this.aiDecisionRepository.create({ id, ...data });
        return this.aiDecisionRepository.save(record);
    }
    async readAudit(id) {
        return this.auditLogRepository.findOne({ where: { id } });
    }
    async readAi(id) {
        return this.aiDecisionRepository.findOne({ where: { id } });
    }
};
exports.WormStorageAdapter = WormStorageAdapter;
exports.WormStorageAdapter = WormStorageAdapter = WormStorageAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(1, (0, typeorm_1.InjectRepository)(ai_decision_entity_1.AiDecision)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], WormStorageAdapter);
