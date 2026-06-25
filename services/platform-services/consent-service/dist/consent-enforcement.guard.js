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
exports.ConsentEnforcementGuard = void 0;
const common_1 = require("@nestjs/common");
const consent_service_1 = require("./consent.service");
let ConsentEnforcementGuard = class ConsentEnforcementGuard {
    consentService;
    constructor(consentService) {
        this.consentService = consentService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const userId = request.headers['x-user-id'];
        const requiredAction = request.route?.path; // Simplified mapping
        if (!userId)
            return false;
        // A real implementation would map routes to specific consent requirements
        // For now, we assume all actions require some specific check
        const allowed = await this.consentService.verifyConsent(userId, 'allowHealthDataForAI');
        if (!allowed) {
            throw new common_1.ForbiddenException('User has not consented to this data usage.');
        }
        return true;
    }
};
exports.ConsentEnforcementGuard = ConsentEnforcementGuard;
exports.ConsentEnforcementGuard = ConsentEnforcementGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [consent_service_1.ConsentService])
], ConsentEnforcementGuard);
