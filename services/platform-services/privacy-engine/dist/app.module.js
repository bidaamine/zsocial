"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const anonymization_service_1 = require("./anonymization.service");
const deletion_queue_service_1 = require("./deletion-queue.service");
const privacy_controller_1 = require("./privacy.controller");
const privacy_kafka_controller_1 = require("./privacy-kafka.controller");
const deletion_job_entity_1 = require("./entities/deletion-job.entity");
const core_infra_1 = require("@nexus/core-infra");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            core_infra_1.PostgresModule.forRoot({
                type: 'postgres',
                host: 'localhost',
                port: 5434,
                username: 'nexus',
                password: 'password',
                database: 'nexus_db',
                autoLoadEntities: true,
                synchronize: true, // Only for dev
            }),
            typeorm_1.TypeOrmModule.forFeature([deletion_job_entity_1.DeletionJob]),
        ],
        controllers: [privacy_controller_1.PrivacyController, privacy_kafka_controller_1.PrivacyKafkaController],
        providers: [anonymization_service_1.AnonymizationService, deletion_queue_service_1.DeletionQueueService],
        exports: [deletion_queue_service_1.DeletionQueueService, anonymization_service_1.AnonymizationService],
    })
], AppModule);
