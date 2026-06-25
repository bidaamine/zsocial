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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentController = void 0;
const common_1 = require("@nestjs/common");
const consent_service_1 = require("./consent.service");
let ConsentController = class ConsentController {
    consentService;
    constructor(consentService) {
        this.consentService = consentService;
    }
    async checkConsent(userId, action) {
        const isAllowed = await this.consentService.verifyConsent(userId, action);
        if (!isAllowed) {
            throw new common_1.ForbiddenException(`Consent not granted for action: ${action}`);
        }
        return { allowed: true };
    }
    async updateConsent(body) {
        await this.consentService.updateConsent(body.userId, body.updates);
        return { status: 'updated' };
    }
};
exports.ConsentController = ConsentController;
__decorate([
    (0, common_1.Get)('check'),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('action')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ConsentController.prototype, "checkConsent", null);
__decorate([
    (0, common_1.Post)('update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConsentController.prototype, "updateConsent", null);
exports.ConsentController = ConsentController = __decorate([
    (0, common_1.Controller)('consent'),
    __metadata("design:paramtypes", [consent_service_1.ConsentService])
], ConsentController);
