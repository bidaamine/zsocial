import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ContentService } from './content.service';
import { ZeroTrustGuard } from './zero-trust.guard';

@Controller('posts')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @UseGuards(ZeroTrustGuard)
  @Post()
  async createPost(
    @Request() req: any,
    @Body('title') title: string,
    @Body('content') content: string,
    @Body('tags') tags?: string[],
  ) {
    return this.contentService.createPost(req.user.sub, title, content, tags);
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    return this.contentService.getPost(id);
  }

  @UseGuards(ZeroTrustGuard)
  @Put(':id')
  async updatePost(
    @Param('id') id: string,
    @Request() req: any,
    @Body('title') title?: string,
    @Body('content') content?: string,
    @Body('tags') tags?: string[],
  ) {
    return this.contentService.updatePost(id, req.user.sub, title, content, tags);
  }

  @UseGuards(ZeroTrustGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@Param('id') id: string, @Request() req: any) {
    await this.contentService.deletePost(id, req.user.sub);
  }

  @UseGuards(ZeroTrustGuard)
  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req: any,
    @Body('content') content: string,
  ) {
    return this.contentService.addComment(id, req.user.sub, content);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.contentService.getComments(id);
  }

  @UseGuards(ZeroTrustGuard)
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Param('commentId') commentId: string, @Request() req: any) {
    await this.contentService.deleteComment(commentId, req.user.sub);
  }

  @UseGuards(ZeroTrustGuard)
  @Post(':id/like')
  async toggleLike(@Param('id') id: string, @Request() req: any) {
    return this.contentService.toggleLike(id, req.user.sub);
  }

  @UseGuards(ZeroTrustGuard)
  @Get('../feed') // Maps /feed relative route cleanly or controller path customization
  async getFeed(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const token = req.headers.authorization;
    return this.contentService.generateFeed(
      req.user.sub,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
      token,
    );
  }

  // --- Kafka consumer for GDPR deletion ---
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.contentService.deleteUserData(data.userId);
  }
}
