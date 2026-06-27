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
exports.MobileAppController = void 0;
const common_1 = require("@nestjs/common");
const aggregator_service_1 = require("./aggregator.service");
let MobileAppController = class MobileAppController {
    aggregator;
    constructor(aggregator) {
        this.aggregator = aggregator;
    }
    async getDashboard(userId, authHeader) {
        return this.aggregator.getMobileAppData(userId, authHeader);
    }
};
exports.MobileAppController = MobileAppController;
__decorate([
    (0, common_1.Get)('dashboard/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MobileAppController.prototype, "getDashboard", null);
exports.MobileAppController = MobileAppController = __decorate([
    (0, common_1.Controller)('mobile'),
    __metadata("design:paramtypes", [aggregator_service_1.AggregatorService])
], MobileAppController);
