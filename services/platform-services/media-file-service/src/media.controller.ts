import { Controller, Post, Get, Param, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { StorageProviderService } from './storage-provider.service';
import { MediaAccessGuard } from './media-access.guard';

@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageProviderService) {}

  @Post('upload-url')
  @UseGuards(MediaAccessGuard)
  async getUploadUrl(@Body('filename') filename: string, @Request() req: any) {
    if (!filename) {
      throw new BadRequestException('Filename must be provided');
    }
    const userId = req.user.sub;
    return this.storage.generateUploadUrl(filename, userId);
  }

  @Get('download-url/:fileId')
  @UseGuards(MediaAccessGuard)
  async getDownloadUrl(@Param('fileId') fileId: string, @Request() req: any) {
    const userId = req.user.sub;
    const url = await this.storage.generateDownloadUrl(fileId, userId);
    return { url };
  }

  @Post('process-upload/:fileId')
  async processUpload(@Param('fileId') fileId: string) {
    const record = await this.storage.processUploadedFile(fileId);
    return { success: true, status: record.status, mimeType: record.mimeType, size: record.size };
  }
}
