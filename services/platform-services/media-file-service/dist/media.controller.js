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
    getUploadUrl(filename) {
        return { url: this.storage.getPresignedUploadUrl(filename) };
    }
    getDownloadUrl(fileId) {
        return { url: this.storage.getPresignedDownloadUrl(fileId) };
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.UseGuards)(media_access_guard_1.MediaAccessGuard),
    (0, common_1.Post)('upload/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getUploadUrl", null);
__decorate([
    (0, common_1.UseGuards)(media_access_guard_1.MediaAccessGuard),
    (0, common_1.Get)('download/:fileId'),
    __param(0, (0, common_1.Param)('fileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getDownloadUrl", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [storage_provider_service_1.StorageProviderService])
], MediaController);
