import { Controller, Get, Post, Body, Param, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MessagingService } from './messaging.service';
import { ZeroTrustGuard } from './zero-trust.guard';

@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @UseGuards(ZeroTrustGuard)
  @Post()
  async sendMessage(
    @Request() req: any,
    @Body('receiverId') receiverId: string,
    @Body('body') body: string,
  ) {
    return this.messagingService.sendMessage(req.user.sub, receiverId, body);
  }

  @UseGuards(ZeroTrustGuard)
  @Get('history/:targetUserId')
  async getMessageHistory(@Request() req: any, @Param('targetUserId') targetUserId: string) {
    return this.messagingService.getMessageHistory(req.user.sub, targetUserId);
  }

  @UseGuards(ZeroTrustGuard)
  @Get('metadata')
  async getMetadataLogs(@Request() req: any) {
    return this.messagingService.getMetadataLogs(req.user.sub);
  }

  // --- AI Digital Twin Capabilities ---

  @UseGuards(ZeroTrustGuard)
  @Post('draft')
  async createDraft(
    @Request() req: any,
    @Body('recipientId') recipientId: string,
    @Body('draftedContent') draftedContent: string,
    @Body('confidenceScore') confidenceScore?: number,
  ) {
    return this.messagingService.createDraft(req.user.sub, recipientId, draftedContent, confidenceScore);
  }

  @UseGuards(ZeroTrustGuard)
  @Get('drafts')
  async getActiveDrafts(@Request() req: any) {
    return this.messagingService.getActiveDrafts(req.user.sub);
  }

  @UseGuards(ZeroTrustGuard)
  @Post('drafts/:id/approve')
  async approveAndSendDraft(@Request() req: any, @Param('id') id: string) {
    return this.messagingService.approveAndSendDraft(id, req.user.sub);
  }

  // --- Kafka consumer for GDPR Deletion cascades ---
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.messagingService.deleteUserData(data.userId);
  }
}
