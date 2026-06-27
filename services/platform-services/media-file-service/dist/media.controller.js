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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const storage_provider_service_1 = require("./storage-provider.service");
const media_access_guard_1 = require("./media-access.guard");
let MediaController = class MediaController {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async getUploadUrl(filename, req) {
        if (!filename) {
            throw new common_1.BadRequestException('Filename must be provided');
        }
        const userId = req.user.sub;
        return this.storage.generateUploadUrl(filename, userId);
    }
    async getDownloadUrl(fileId, req) {
        const userId = req.user.sub;
        const url = await this.storage.generateDownloadUrl(fileId, userId);
        return { url };
    }
    async processUpload(fileId) {
        const record = await this.storage.processUploadedFile(fileId);
        return { success: true, status: record.status, mimeType: record.mimeType, size: record.size };
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('upload-url'),
    (0, common_1.UseGuards)(media_access_guard_1.MediaAccessGuard),
    __param(0, (0, common_1.Body)('filename')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getUploadUrl", null);
__decorate([
    (0, common_1.Get)('download-url/:fileId'),
    (0, common_1.UseGuards)(media_access_guard_1.MediaAccessGuard),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getDownloadUrl", null);
__decorate([
    (0, common_1.Post)('process-upload/:fileId'),
    __param(0, (0, common_1.Param)('fileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "processUpload", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [storage_provider_service_1.StorageProviderService])
], MediaController);
