import { StorageProviderService } from './storage-provider.service';
export declare class MediaController {
    private readonly storage;
    constructor(storage: StorageProviderService);
    getUploadUrl(filename: string, req: any): Promise<{
        fileId: string;
        url: string;
    }>;
    getDownloadUrl(fileId: string, req: any): Promise<{
        url: string;
    }>;
    processUpload(fileId: string): Promise<{
        success: boolean;
        status: string;
        mimeType: string;
        size: number;
    }>;
}
//# sourceMappingURL=media.controller.d.ts.map