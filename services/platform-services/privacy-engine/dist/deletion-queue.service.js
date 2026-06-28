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
var DeletionQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeletionQueueService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const microservices_1 = require("@nestjs/microservices");
const deletion_job_entity_1 = require("./entities/deletion-job.entity");
const cascading_wipe_service_1 = require("./cascading-wipe.service");
let DeletionQueueService = DeletionQueueService_1 = class DeletionQueueService {
    deletionJobRepository;
    cascadingWipeService;
    logger = new common_1.Logger(DeletionQueueService_1.name);
    kafkaClient;
    constructor(deletionJobRepository, cascadingWipeService) {
        this.deletionJobRepository = deletionJobRepository;
        this.cascadingWipeService = cascadingWipeService;
        this.kafkaClient = new microservices_1.ClientKafka({
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
        }
        catch (err) {
            this.logger.warn(`Failed to connect to Kafka: ${err.message}`);
        }
    }
    async onModuleDestroy() {
        await this.kafkaClient.close();
    }
    async getJobStatus(jobId) {
        return this.deletionJobRepository.findOne({ where: { id: jobId } });
    }
    async registerDeletionRequest(userId) {
        this.logger.log(`Registering GDPR deletion request for user ${userId}`);
        const job = this.deletionJobRepository.create({
            userId,
            status: 'IN_PROGRESS',
            progress: {
                auth: false,
                consent: false,
                profile: false,
                safety: false,
                social: false,
                backups: false,
                datalake: false,
                models: false,
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
        }
        catch (err) {
            this.logger.error(`Failed to emit gdpr.user.deletion.requested: ${err.message}`);
        }
        return saved.id;
    }
    async handleServiceDeletionCompleted(jobId, serviceName) {
        this.logger.log(`Service "${serviceName}" reported deletion completion for Job: ${jobId}`);
        const job = await this.deletionJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            this.logger.warn(`No deletion job found with ID: ${jobId}`);
            return;
        }
        // Mark service as completed
        const updatedProgress = { ...job.progress, [serviceName]: true };
        job.progress = updatedProgress;
        // Check if all online microservices completed deletion
        const onlineServices = ['auth', 'consent', 'profile', 'safety', 'social'];
        const onlineCompleted = onlineServices.every((srv) => updatedProgress[srv] === true);
        if (onlineCompleted && !updatedProgress.backups && !updatedProgress.datalake && !updatedProgress.models) {
            this.logger.log(`All online microservices completed. Initiating offline backups, datalake, and model purges for user ${job.userId}`);
            // Perform real offline cascades
            await this.cascadingWipeService.purgeAllBackups(job.userId);
            updatedProgress.backups = true;
            await this.cascadingWipeService.purgeDataLake(job.userId);
            updatedProgress.datalake = true;
            await this.cascadingWipeService.purgeModelCheckpoints(job.userId);
            updatedProgress.models = true;
            job.progress = updatedProgress;
        }
        // Check if all steps (online + offline) are finished
        const allCompleted = Object.values(updatedProgress).every((val) => val === true);
        if (allCompleted) {
            job.status = 'COMPLETED';
            job.completedAt = new Date();
            this.logger.log(`GDPR Cascading Deletion Job completed successfully for user ${job.userId}`);
        }
        await this.deletionJobRepository.save(job);
    }
};
exports.DeletionQueueService = DeletionQueueService;
exports.DeletionQueueService = DeletionQueueService = DeletionQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(deletion_job_entity_1.DeletionJob)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        cascading_wipe_service_1.CascadingWipeService])
], DeletionQueueService);
