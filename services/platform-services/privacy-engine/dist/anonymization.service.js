"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AnonymizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnonymizationService = void 0;
const common_1 = require("@nestjs/common");
let AnonymizationService = AnonymizationService_1 = class AnonymizationService {
    logger = new common_1.Logger(AnonymizationService_1.name);
    // List of keys that contain PII and should be removed completely
    piiKeys = new Set(['name', 'email', 'phone', 'address', 'ssn', 'ip_address', 'location']);
    /**
     * Applies anonymization to a JSON payload. Removes PII completely and
     * adds differential privacy noise to numeric metrics (e.g., heart rate, salary).
     */
    anonymizePayload(payload, epsilon = 0.5) {
        this.logger.log(`Anonymizing payload with epsilon=${epsilon}`);
        return this.traverseAndAnonymize(payload, epsilon);
    }
    traverseAndAnonymize(obj, epsilon) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.traverseAndAnonymize(item, epsilon));
        }
        const anonymized = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            // 1. Strip PII keys
            if (this.piiKeys.has(lowerKey) || lowerKey.includes('name') || lowerKey.includes('email')) {
                continue; // Completely remove this key from the dataset
            }
            // 2. Apply differential privacy to numeric values
            if (typeof value === 'number') {
                anonymized[key] = value + this.generateLaplaceNoise(1 / epsilon);
            }
            // 3. Recurse for nested objects
            else if (typeof value === 'object') {
                anonymized[key] = this.traverseAndAnonymize(value, epsilon);
            }
            // 4. Keep other non-PII primitives
            else {
                anonymized[key] = value;
            }
        }
        return anonymized;
    }
    generateLaplaceNoise(scale) {
        const u = Math.random() - 0.5;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
};
exports.AnonymizationService = AnonymizationService;
exports.AnonymizationService = AnonymizationService = AnonymizationService_1 = __decorate([
    (0, common_1.Injectable)()
], AnonymizationService);
