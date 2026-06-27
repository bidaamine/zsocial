import { Repository } from 'typeorm';
import { MinioService } from '@nexus/core-infra';
import { MediaRecord } from './entities/media-record.entity';
export declare class StorageProviderService {
    private readonly minioService;
    private readonly mediaRepository;
    private readonly bucket;
    private readonly logger;
    constructor(minioService: MinioService, mediaRepository: Repository<MediaRecord>, bucket: string);
    generateUploadUrl(filename: string, userId: string): Promise<{
        fileId: string;
        url: string;
    }>;
    generateDownloadUrl(fileId: string, userId: string): Promise<string>;
    /**
     * Called via REST or Kafka when upload triggers processing
     */
    processUploadedFile(fileId: string): Promise<MediaRecord>;
    private streamToString;
    private detectMimeType;
}
//# sourceMappingURL=storage-provider.service.d.ts.map