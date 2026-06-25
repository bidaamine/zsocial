import { Injectable } from '@nestjs/common';

@Injectable()
export class StorageProviderService {
  getPresignedUploadUrl(filename: string) {
    return `https://s3.nexus.local/upload/${filename}?token=generated`;
  }
  
  getPresignedDownloadUrl(fileId: string) {
    return `https://s3.nexus.local/download/${fileId}?token=generated`;
  }
}
