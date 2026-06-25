import { MinioService } from '@nexus/core-infra';
export declare class StorageProviderService {
    private readonly minioService;
    constructor(minioService: MinioService);
    generateUploadUrl(filename: string): Promise<string>;
    generateDownloadUrl(fileId: string): Promise<string>;
}
//# sourceMappingURL=storage-provider.service.d.ts.map