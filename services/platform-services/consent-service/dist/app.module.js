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
const consent_controller_1 = require("./consent.controller");
const consent_kafka_controller_1 = require("./consent-kafka.controller");
const consent_service_1 = require("./consent.service");
const consent_enforcement_guard_1 = require("./consent-enforcement.guard");
const consent_record_entity_1 = require("./entities/consent-record.entity");
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
            typeorm_1.TypeOrmModule.forFeature([consent_record_entity_1.ConsentRecord]),
            core_infra_1.RedisModule.forRoot({ host: 'localhost', port: 6379 })
        ],
        controllers: [consent_controller_1.ConsentController, consent_kafka_controller_1.ConsentKafkaController],
        providers: [
            consent_service_1.ConsentService,
            consent_enforcement_guard_1.ConsentEnforcementGuard,
        ],
        exports: [consent_enforcement_guard_1.ConsentEnforcementGuard, consent_service_1.ConsentService],
    })
], AppModule);
