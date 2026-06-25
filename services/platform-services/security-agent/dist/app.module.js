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
const threat_detection_service_1 = require("./threat-detection.service");
const zero_trust_guard_1 = require("./zero-trust.guard");
const child_data_protection_interceptor_1 = require("./child-data-protection.interceptor");
const core_infra_1 = require("@nexus/core-infra");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            core_infra_1.RedisModule.forRoot({ host: 'localhost', port: 6379 })
        ],
        providers: [
            threat_detection_service_1.ThreatDetectionService,
            zero_trust_guard_1.ZeroTrustGuard,
            child_data_protection_interceptor_1.ChildDataProtectionInterceptor,
        ],
        exports: [
            threat_detection_service_1.ThreatDetectionService,
            zero_trust_guard_1.ZeroTrustGuard,
        ],
    })
], AppModule);
