"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const consent_service_1 = require("./consent.service");
const consent_record_entity_1 = require("./entities/consent-record.entity");
const core_infra_1 = require("@nexus/core-infra");
describe('ConsentService', () => {
    let service;
    let repositoryMock;
    let redisMock;
    beforeEach(async () => {
        const db = {};
        repositoryMock = {
            findOne: jest.fn().mockImplementation(({ where: { userId } }) => {
                return Promise.resolve(db[userId] || null);
            }),
            create: jest.fn().mockImplementation((dto) => {
                return dto;
            }),
            save: jest.fn().mockImplementation((record) => {
                db[record.userId] = record;
                return Promise.resolve(record);
            }),
            delete: jest.fn().mockImplementation(({ userId }) => {
                delete db[userId];
                return Promise.resolve({ affected: 1 });
            }),
        };
        redisMock = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                consent_service_1.ConsentService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(consent_record_entity_1.ConsentRecord),
                    useValue: repositoryMock,
                },
                {
                    provide: core_infra_1.RedisService,
                    useValue: redisMock,
                },
            ],
        }).compile();
        service = module.get(consent_service_1.ConsentService);
        // Stub Kafka Client to prevent real broker connections/emissions during unit testing
        service.kafkaClient = {
            connect: jest.fn().mockResolvedValue(null),
            close: jest.fn().mockResolvedValue(null),
            emit: jest.fn(),
        };
    });
    it('should deny consent by default', async () => {
        const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
        expect(allowed).toBe(false);
    });
    it('should allow after consent is granted', async () => {
        await service.updateConsent('user1', { allowHealthDataForAI: true });
        const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
        expect(allowed).toBe(true);
    });
});
