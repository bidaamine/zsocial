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
var ConsentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const core_infra_1 = require("@nexus/core-infra");
const microservices_1 = require("@nestjs/microservices");
const consent_record_entity_1 = require("./entities/consent-record.entity");
let ConsentService = ConsentService_1 = class ConsentService {
    consentRepository;
    redisService;
    logger = new common_1.Logger(ConsentService_1.name);
    kafkaClient;
    constructor(consentRepository, redisService) {
        this.consentRepository = consentRepository;
        this.redisService = redisService;
        this.kafkaClient = new microservices_1.ClientKafka({
            client: {
                clientId: 'consent-service',
                brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
            },
            producer: {
                allowAutoTopicCreation: true,
            },
        });
    }
    async onModuleInit() {
        try {
            await this.kafkaClient.connect();
            this.logger.log('Kafka Client Connected for Consent Events');
        }
        catch (err) {
            this.logger.warn(`Failed to connect to Kafka: ${err.message}`);
        }
    }
    async onModuleDestroy() {
        await this.kafkaClient.close();
    }
    getCacheKey(userId) {
        return `consent:${userId}`;
    }
    async verifyConsent(userId, actionCategory) {
        const cacheKey = this.getCacheKey(userId);
        try {
            const cached = await this.redisService.get(cacheKey);
            if (cached) {
                const record = JSON.parse(cached);
                return record[actionCategory] === true;
            }
        }
        catch (err) {
            this.logger.warn(`Failed to read from Redis cache: ${err.message}`);
        }
        // Fallback to database
        const record = await this.consentRepository.findOne({ where: { userId } });
        if (!record) {
            this.logger.warn(`No consent record found for user ${userId}. Defaulting to deny.`);
            return false; // Default to deny (Zero-Trust/Opt-in by default)
        }
        try {
            await this.redisService.set(cacheKey, JSON.stringify(record), 3600);
        }
        catch (err) {
            this.logger.warn(`Failed to update Redis cache: ${err.message}`);
        }
        return record[actionCategory] === true;
    }
    async updateConsent(userId, updates) {
        this.logger.log(`Updating consent for user ${userId}: ${JSON.stringify(updates)}`);
        let record = await this.consentRepository.findOne({ where: { userId } });
        if (!record) {
            record = this.consentRepository.create({ userId });
        }
        // Apply updates
        Object.assign(record, updates);
        const saved = await this.consentRepository.save(record);
        // Update Cache
        const cacheKey = this.getCacheKey(userId);
        try {
            await this.redisService.set(cacheKey, JSON.stringify(saved), 3600);
        }
        catch (err) {
            this.logger.warn(`Failed to update Redis cache: ${err.message}`);
        }
        // Emit event
        this.publishConsentUpdated(saved);
        return saved;
    }
    async seedDefaultConsent(userId) {
        this.logger.log(`Seeding default consent preferences for user ${userId}`);
        const existing = await this.consentRepository.findOne({ where: { userId } });
        if (existing) {
            return existing;
        }
        const defaultRecord = this.consentRepository.create({
            userId,
            allowHealthDataForAI: false,
            allowMarketing: false,
            allowThirdPartyMarketplace: false,
        });
        const saved = await this.consentRepository.save(defaultRecord);
        // Set cache
        const cacheKey = this.getCacheKey(userId);
        try {
            await this.redisService.set(cacheKey, JSON.stringify(saved), 3600);
        }
        catch (err) {
            this.logger.warn(`Failed to write to Redis: ${err.message}`);
        }
        // Emit event
        this.publishConsentUpdated(saved);
        return saved;
    }
    async deleteConsent(userId) {
        this.logger.log(`Deleting consent record for user ${userId}`);
        await this.consentRepository.delete({ userId });
        const cacheKey = this.getCacheKey(userId);
        try {
            await this.redisService.del(cacheKey);
        }
        catch (err) {
            this.logger.warn(`Failed to delete from Redis: ${err.message}`);
        }
    }
    async deleteConsentAndNotify(jobId, userId) {
        await this.deleteConsent(userId);
        try {
            this.kafkaClient.emit('consent.user.deleted', {
                jobId,
                userId,
                status: 'DELETED',
                timestamp: new Date().toISOString()
            });
            this.logger.log(`Published consent.user.deleted event for user ${userId}`);
        }
        catch (err) {
            this.logger.error(`Failed to publish consent.user.deleted event: ${err.message}`);
        }
    }
    publishConsentUpdated(record) {
        try {
            this.kafkaClient.emit('consent.user.updated', {
                userId: record.userId,
                allowHealthDataForAI: record.allowHealthDataForAI,
                allowMarketing: record.allowMarketing,
                allowThirdPartyMarketplace: record.allowThirdPartyMarketplace,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            this.logger.error(`Failed to publish consent.user.updated event: ${err.message}`);
        }
    }
};
exports.ConsentService = ConsentService;
exports.ConsentService = ConsentService = ConsentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(consent_record_entity_1.ConsentRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        core_infra_1.RedisService])
], ConsentService);
