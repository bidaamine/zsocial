import { StorageProviderService } from './storage-provider.service';
export declare class MediaController {
    private storage;
    constructor(storage: StorageProviderService);
    getUploadUrl(filename: string): {
        url: string;
    };
    getDownloadUrl(fileId: string): {
        url: string;
    };
}
//# sourceMappingURL=media.controller.d.ts.map