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
const telemetry_controller_1 = require("./telemetry.controller");
const audit_log_service_1 = require("./audit-log.service");
const worm_storage_adapter_1 = require("./worm-storage.adapter");
const core_infra_1 = require("@nexus/core-infra");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            core_infra_1.KafkaModule.registerClient('AUDIT_CLIENT', ['localhost:9092'], 'audit-service')
        ],
        controllers: [telemetry_controller_1.TelemetryController],
        providers: [
            audit_log_service_1.AuditLogService,
            worm_storage_adapter_1.WormStorageAdapter,
        ],
    })
], AppModule);
