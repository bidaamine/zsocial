"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DeletionQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeletionQueueService = void 0;
const common_1 = require("@nestjs/common");
let DeletionQueueService = DeletionQueueService_1 = class DeletionQueueService {
    logger = new common_1.Logger(DeletionQueueService_1.name);
    async registerDeletionRequest(userId) {
        const jobId = `del-${Date.now()}-${userId}`;
        this.logger.log(`Registered GDPR deletion request for user ${userId}. Job ID: ${jobId}`);
        // In production: Publish event to Kafka to trigger cascaded deletion across:
        // Postgres, Neo4j, TimescaleDB, VectorDB, Data Lake, and Object Storage.
        return jobId;
    }
};
exports.DeletionQueueService = DeletionQueueService;
exports.DeletionQueueService = DeletionQueueService = DeletionQueueService_1 = __decorate([
    (0, common_1.Injectable)()
], DeletionQueueService);
