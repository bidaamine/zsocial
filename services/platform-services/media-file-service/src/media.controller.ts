import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
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

  @Get()
  @UseGuards(MediaAccessGuard)
  async listMyMedia(@Request() req: any) {
    return this.storage.listUserMedia(req.user.sub);
  }

  @Delete(':fileId')
  @UseGuards(MediaAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(@Param('fileId') fileId: string, @Request() req: any) {
    await this.storage.deleteMedia(fileId, req.user.sub);
  }

  // GDPR right-to-erasure cascade: purge all of a user's media on account deletion.
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.storage.deleteUserData(data.userId);
  }
}
