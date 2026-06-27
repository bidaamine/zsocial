import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { DeletionJob } from './entities/deletion-job.entity';

@Injectable()
export class DeletionQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeletionQueueService.name);
  private kafkaClient: ClientKafka;

  constructor(
    @InjectRepository(DeletionJob)
    private readonly deletionJobRepository: Repository<DeletionJob>,
  ) {
    this.kafkaClient = new ClientKafka({
      client: {
        clientId: 'privacy-engine',
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
      this.logger.log('Kafka Client Connected for Deletion Queue');
    } catch (err: any) {
      this.logger.warn(`Failed to connect to Kafka: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  async getJobStatus(jobId: string): Promise<DeletionJob | null> {
    return this.deletionJobRepository.findOne({ where: { id: jobId } });
  }

  async registerDeletionRequest(userId: string): Promise<string> {
    this.logger.log(`Registering GDPR deletion request for user ${userId}`);

    const job = this.deletionJobRepository.create({
      userId,
      status: 'IN_PROGRESS',
      progress: {
        auth: false,
        consent: false,
      },
    });

    const saved = await this.deletionJobRepository.save(job);

    const eventPayload = {
      jobId: saved.id,
      userId,
      requestedAt: saved.requestedAt.toISOString(),
      status: 'PENDING_CASCADING_DELETION',
    };

    // Emit event to trigger cascade
    try {
      this.kafkaClient.emit('gdpr.user.deletion.requested', eventPayload);
      this.logger.log(`Emitted gdpr.user.deletion.requested for Job: ${saved.id}`);
    } catch (err: any) {
      this.logger.error(`Failed to emit gdpr.user.deletion.requested: ${err.message}`);
    }

    return saved.id;
  }

  async handleServiceDeletionCompleted(jobId: string, serviceName: string): Promise<void> {
    this.logger.log(`Service "${serviceName}" reported deletion completion for Job: ${jobId}`);

    const job = await this.deletionJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.warn(`No deletion job found with ID: ${jobId}`);
      return;
    }

    // Mark service as completed
    const updatedProgress = { ...job.progress, [serviceName]: true };
    job.progress = updatedProgress;

    // Check if all services completed deletion
    const allCompleted = Object.values(updatedProgress).every((val) => val === true);
    if (allCompleted) {
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      this.logger.log(`GDPR Cascading Deletion Job completed successfully for user ${job.userId}`);
    }

    await this.deletionJobRepository.save(job);
  }
}
