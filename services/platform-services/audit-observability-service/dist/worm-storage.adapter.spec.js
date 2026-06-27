"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const worm_storage_adapter_1 = require("./worm-storage.adapter");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const ai_decision_entity_1 = require("./entities/ai-decision.entity");
const typeorm_2 = require("typeorm");
const common_1 = require("@nestjs/common");
describe('WormStorageAdapter', () => {
    let adapter;
    let auditLogsDb;
    let aiDecisionsDb;
    beforeEach(async () => {
        auditLogsDb = {};
        aiDecisionsDb = {};
        const auditRepositoryMock = {
            findOne: jest.fn().mockImplementation(({ where: { id } }) => Promise.resolve(auditLogsDb[id] || null)),
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((record) => {
                auditLogsDb[record.id] = record;
                return Promise.resolve(record);
            }),
        };
        const aiRepositoryMock = {
            findOne: jest.fn().mockImplementation(({ where: { id } }) => Promise.resolve(aiDecisionsDb[id] || null)),
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((record) => {
                aiDecisionsDb[record.id] = record;
                return Promise.resolve(record);
            }),
        };
        const queryRunnerMock = {
            connect: jest.fn().mockResolvedValue(null),
            query: jest.fn().mockResolvedValue([]),
            release: jest.fn().mockResolvedValue(null),
        };
        const dataSourceMock = {
            createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
        };
        const mod = await testing_1.Test.createTestingModule({
            providers: [
                worm_storage_adapter_1.WormStorageAdapter,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(audit_log_entity_1.AuditLog),
                    useValue: auditRepositoryMock,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(ai_decision_entity_1.AiDecision),
                    useValue: aiRepositoryMock,
                },
                {
                    provide: typeorm_2.DataSource,
                    useValue: dataSourceMock,
                },
            ],
        }).compile();
        adapter = mod.get(worm_storage_adapter_1.WormStorageAdapter);
        // Explicitly call the onModuleInit to check trigger creations
        await adapter.onModuleInit();
    });
    it('should write audit log once successfully', async () => {
        const rec = await adapter.writeOnceAudit('evt-1', { actor: 'user', action: 'update', resource: 'profile' });
        expect(rec.actor).toBe('user');
        expect(rec.action).toBe('update');
    });
    it('should throw if writing twice with same event ID', async () => {
        await adapter.writeOnceAudit('evt-1', { actor: 'user', action: 'update', resource: 'profile' });
        await expect(adapter.writeOnceAudit('evt-1', { actor: 'user2', action: 'delete', resource: 'profile' })).rejects.toThrow(common_1.BadRequestException);
    });
});
