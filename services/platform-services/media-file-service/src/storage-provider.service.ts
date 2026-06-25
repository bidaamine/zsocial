import { Injectable } from '@nestjs/common';
import { MinioService } from '@nexus/core-infra';

@Injectable()
export class StorageProviderService {
  constructor(private readonly minioService: MinioService) {}

  async generateUploadUrl(filename: string): Promise<string> {
    return this.minioService.getPresignedUploadUrl(filename);
  }

  async generateDownloadUrl(fileId: string): Promise<string> {
    return this.minioService.getPresignedDownloadUrl(fileId);
  }
}
