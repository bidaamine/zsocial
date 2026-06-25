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
exports.StorageProviderService = void 0;
const common_1 = require("@nestjs/common");
const core_infra_1 = require("@nexus/core-infra");
let StorageProviderService = class StorageProviderService {
    minioService;
    constructor(minioService) {
        this.minioService = minioService;
    }
    async generateUploadUrl(filename) {
        return this.minioService.getPresignedUploadUrl(filename);
    }
    async generateDownloadUrl(fileId) {
        return this.minioService.getPresignedDownloadUrl(fileId);
    }
};
exports.StorageProviderService = StorageProviderService;
exports.StorageProviderService = StorageProviderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_infra_1.MinioService])
], StorageProviderService);
