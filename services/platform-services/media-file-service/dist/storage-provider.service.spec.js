"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const storage_provider_service_1 = require("./storage-provider.service");
const core_infra_1 = require("@nexus/core-infra");
const media_record_entity_1 = require("./entities/media-record.entity");
const common_1 = require("@nestjs/common");
const stream_1 = require("stream");
describe('StorageProviderService', () => {
    let service;
    let minioMock;
    let mediaDb;
    let mockS3Response;
    beforeEach(async () => {
        mediaDb = {};
        mockS3Response = {
            Body: stream_1.Readable.from(['standard-file-contents']),
        };
        minioMock = {
            getPresignedUploadUrl: jest.fn().mockResolvedValue('http://upload-url'),
            getPresignedDownloadUrl: jest.fn().mockResolvedValue('http://download-url'),
            getClient: jest.fn().mockReturnValue({
                send: jest.fn().mockImplementation((command) => {
                    if (command.constructor.name === 'GetObjectCommand' || command.input?.Key) {
                        return Promise.resolve(mockS3Response);
                    }
                    return Promise.resolve({});
                }),
            }),
        };
        const mediaRepositoryMock = {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((record) => {
                mediaDb[record.id] = record;
                return Promise.resolve(record);
            }),
            findOne: jest.fn().mockImplementation(({ where: { id } }) => Promise.resolve(mediaDb[id] || null)),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                storage_provider_service_1.StorageProviderService,
                { provide: core_infra_1.MinioService, useValue: minioMock },
                { provide: (0, typeorm_1.getRepositoryToken)(media_record_entity_1.MediaRecord), useValue: mediaRepositoryMock },
                { provide: 'MINIO_BUCKET', useValue: 'nexus-media' },
            ],
        }).compile();
        service = module.get(storage_provider_service_1.StorageProviderService);
    });
    it('should generate an upload url and save pending record', async () => {
        const res = await service.generateUploadUrl('avatar.png', 'user-1');
        expect(res.fileId).toBeDefined();
        expect(res.url).toBe('http://upload-url');
        expect(mediaDb[res.fileId]).toBeDefined();
        expect(mediaDb[res.fileId]?.status).toBe('pending_upload');
    });
    it('should throw ForbiddenException if user does not own the file on download request', async () => {
        const res = await service.generateUploadUrl('avatar.png', 'user-1');
        await expect(service.generateDownloadUrl(res.fileId, 'different-user')).rejects.toThrow(common_1.ForbiddenException);
    });
    it('should process uploaded file and mark it clean if no EICAR signature', async () => {
        const res = await service.generateUploadUrl('avatar.png', 'user-1');
        const record = await service.processUploadedFile(res.fileId);
        expect(record.status).toBe('clean');
        expect(record.mimeType).toBe('image/png');
    });
    it('should process and quarantine file if it contains EICAR malware signature', async () => {
        const res = await service.generateUploadUrl('malware.txt', 'user-1');
        // Inject EICAR signature in stream response
        mockS3Response = {
            Body: stream_1.Readable.from(['X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*']),
        };
        const record = await service.processUploadedFile(res.fileId);
        expect(record.status).toBe('quarantined');
        expect(record.size).toBe(0);
        // Attempting to download quarantined file should throw ForbiddenException
        await expect(service.generateDownloadUrl(res.fileId, 'user-1')).rejects.toThrow(common_1.ForbiddenException);
    });
});
