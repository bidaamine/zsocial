import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RedisService } from '@nexus/core-infra';
import { ConsentRecord } from './entities/consent-record.entity';
export declare class ConsentService implements OnModuleInit, OnModuleDestroy {
    private readonly consentRepository;
    private readonly redisService;
    private readonly logger;
    private kafkaClient;
    constructor(consentRepository: Repository<ConsentRecord>, redisService: RedisService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private getCacheKey;
    verifyConsent(userId: string, actionCategory: keyof Omit<ConsentRecord, 'id' | 'userId' | 'updatedAt'>): Promise<boolean>;
    updateConsent(userId: string, updates: Partial<Omit<ConsentRecord, 'id' | 'userId' | 'updatedAt'>>): Promise<ConsentRecord>;
    seedDefaultConsent(userId: string): Promise<ConsentRecord>;
    deleteConsent(userId: string): Promise<void>;
    deleteConsentAndNotify(jobId: string, userId: string): Promise<void>;
    private publishConsentUpdated;
}
//# sourceMappingURL=consent.service.d.ts.map