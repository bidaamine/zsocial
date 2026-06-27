import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@nexus/core-infra';
import { ClientKafka } from '@nestjs/microservices';
import { ConsentRecord } from './entities/consent-record.entity';

@Injectable()
export class ConsentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsentService.name);
  private kafkaClient: ClientKafka;

  constructor(
    @InjectRepository(ConsentRecord)
    private readonly consentRepository: Repository<ConsentRecord>,
    private readonly redisService: RedisService,
  ) {
    this.kafkaClient = new ClientKafka({
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
    } catch (err: any) {
      this.logger.warn(`Failed to connect to Kafka: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  private getCacheKey(userId: string): string {
    return `consent:${userId}`;
  }

  async verifyConsent(
    userId: string,
    actionCategory: keyof Omit<ConsentRecord, 'id' | 'userId' | 'updatedAt'>,
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(userId);
    
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const record = JSON.parse(cached);
        return record[actionCategory] === true;
      }
    } catch (err: any) {
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
    } catch (err: any) {
      this.logger.warn(`Failed to update Redis cache: ${err.message}`);
    }

    return record[actionCategory] === true;
  }

  async updateConsent(userId: string, updates: Partial<Omit<ConsentRecord, 'id' | 'userId' | 'updatedAt'>>): Promise<ConsentRecord> {
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
    } catch (err: any) {
      this.logger.warn(`Failed to update Redis cache: ${err.message}`);
    }

    // Emit event
    this.publishConsentUpdated(saved);

    return saved;
  }

  async seedDefaultConsent(userId: string): Promise<ConsentRecord> {
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
    } catch (err: any) {
      this.logger.warn(`Failed to write to Redis: ${err.message}`);
    }

    // Emit event
    this.publishConsentUpdated(saved);

    return saved;
  }

  async deleteConsent(userId: string): Promise<void> {
    this.logger.log(`Deleting consent record for user ${userId}`);
    await this.consentRepository.delete({ userId });

    const cacheKey = this.getCacheKey(userId);
    try {
      await this.redisService.del(cacheKey);
    } catch (err: any) {
      this.logger.warn(`Failed to delete from Redis: ${err.message}`);
    }
  }

  async deleteConsentAndNotify(jobId: string, userId: string): Promise<void> {
    await this.deleteConsent(userId);
    try {
      this.kafkaClient.emit('consent.user.deleted', {
        jobId,
        userId,
        status: 'DELETED',
        timestamp: new Date().toISOString()
      });
      this.logger.log(`Published consent.user.deleted event for user ${userId}`);
    } catch (err: any) {
      this.logger.error(`Failed to publish consent.user.deleted event: ${err.message}`);
    }
  }

  private publishConsentUpdated(record: ConsentRecord) {
    try {
      this.kafkaClient.emit('consent.user.updated', {
        userId: record.userId,
        allowHealthDataForAI: record.allowHealthDataForAI,
        allowMarketing: record.allowMarketing,
        allowThirdPartyMarketplace: record.allowThirdPartyMarketplace,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      this.logger.error(`Failed to publish consent.user.updated event: ${err.message}`);
    }
  }
}
