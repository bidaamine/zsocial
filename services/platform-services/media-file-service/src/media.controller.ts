import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { StorageProviderService } from './storage-provider.service';
import { MediaAccessGuard } from './media-access.guard';

@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageProviderService) {}

  @Post('upload-url')
  @UseGuards(MediaAccessGuard)
  async getUploadUrl(@Body('filename') filename: string) {
    return { url: await this.storage.generateUploadUrl(filename) };
  }

  @Get('download-url/:fileId')
  @UseGuards(MediaAccessGuard)
  async getDownloadUrl(@Param('fileId') fileId: string) {
    return { url: await this.storage.generateDownloadUrl(fileId) };
  }
}
