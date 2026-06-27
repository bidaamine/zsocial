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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const worm_storage_adapter_1 = require("./worm-storage.adapter");
let AuditLogService = class AuditLogService {
    worm;
    constructor(worm) {
        this.worm = worm;
    }
    async logEvent(eventId, actor, action, resource) {
        return this.worm.writeOnceAudit(eventId, { actor, action, resource });
    }
    /**
     * Logs AI decisions with explainability metrics to ensure compliance with EU AI Act.
     */
    async logAiDecision(eventId, modelVersion, inputs, decision, confidence, explanation) {
        return this.worm.writeOnceAi(eventId, {
            modelVersion,
            inputs,
            decision,
            confidence,
            explanation,
        });
    }
    async getEvent(eventId) {
        return this.worm.readAudit(eventId);
    }
    async getAiDecision(eventId) {
        return this.worm.readAi(eventId);
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [worm_storage_adapter_1.WormStorageAdapter])
], AuditLogService);
