import { StorageProviderService } from './storage-provider.service';
export declare class MediaController {
    private readonly storage;
    constructor(storage: StorageProviderService);
    getUploadUrl(filename: string): Promise<{
        url: string;
    }>;
    getDownloadUrl(fileId: string): Promise<{
        url: string;
    }>;
}
//# sourceMappingURL=media.controller.d.ts.map