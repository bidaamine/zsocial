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
const core_1 = require("@nestjs/core");
const consent_service_1 = require("./consent.service");
const require_consent_decorator_1 = require("./require-consent.decorator");
let ConsentEnforcementGuard = class ConsentEnforcementGuard {
    consentService;
    reflector;
    constructor(consentService, reflector) {
        this.consentService = consentService;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        // Retrieve required consent metadata from controller or method
        const requiredConsent = this.reflector.getAllAndOverride(require_consent_decorator_1.CONSENT_KEY, [context.getHandler(), context.getClass()]);
        // If no specific consent is registered for this route, allow access by default
        if (!requiredConsent) {
            return true;
        }
        // Identify user from header or verified request user context
        const userId = request.headers['x-user-id'] || request.user?.sub;
        if (!userId) {
            throw new common_1.ForbiddenException('Access Denied: Missing user identity context');
        }
        const allowed = await this.consentService.verifyConsent(userId, requiredConsent);
        if (!allowed) {
            throw new common_1.ForbiddenException(`Access Denied: User has not consented to data use for "${requiredConsent}"`);
        }
        return true;
    }
};
exports.ConsentEnforcementGuard = ConsentEnforcementGuard;
exports.ConsentEnforcementGuard = ConsentEnforcementGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [consent_service_1.ConsentService,
        core_1.Reflector])
], ConsentEnforcementGuard);
