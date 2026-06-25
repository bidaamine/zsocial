"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentService = void 0;
const common_1 = require("@nestjs/common");
let ConsentService = class ConsentService {
    // Mock database for now
    consents = new Map();
    async verifyConsent(userId, actionCategory) {
        const record = this.consents.get(userId);
        if (!record)
            return false; // Default to deny
        return record[actionCategory] === true;
    }
    async updateConsent(userId, updates) {
        const existing = this.consents.get(userId) || { userId, allowHealthDataForAI: false, allowMarketing: false, allowThirdPartyMarketplace: false };
        this.consents.set(userId, { ...existing, ...updates });
    }
};
exports.ConsentService = ConsentService;
exports.ConsentService = ConsentService = __decorate([
    (0, common_1.Injectable)()
], ConsentService);
