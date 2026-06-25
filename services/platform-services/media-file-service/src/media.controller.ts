import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { StorageProviderService } from './storage-provider.service';
import { MediaAccessGuard } from './media-access.guard';

@Controller('media')
export class MediaController {
  constructor(private storage: StorageProviderService) {}

  @UseGuards(MediaAccessGuard)
  @Post('upload/:filename')
  getUploadUrl(@Param('filename') filename: string) {
    return { url: this.storage.getPresignedUploadUrl(filename) };
  }

  @UseGuards(MediaAccessGuard)
  @Get('download/:fileId')
  getDownloadUrl(@Param('fileId') fileId: string) {
    return { url: this.storage.getPresignedDownloadUrl(fileId) };
  }
}
