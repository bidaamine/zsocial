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
    applyDifferentialPrivacy(data, epsilon) {
        this.logger.log(`Applying differential privacy with epsilon=${epsilon}`);
        // Simplified Laplacian noise addition
        return data.map(value => {
            const noise = this.generateLaplaceNoise(1 / epsilon);
            return value + noise;
        });
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
