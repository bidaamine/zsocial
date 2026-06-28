import { Controller, Post, Get, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SocialService } from './social.service';
import { ZeroTrustGuard } from './zero-trust.guard';

@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @UseGuards(ZeroTrustGuard)
  @Post('connect')
  async connectWithUser(@Request() req: any, @Body('receiverId') receiverId: string) {
    return this.socialService.sendConnectionRequest(req.user.sub, receiverId);
  }

  @UseGuards(ZeroTrustGuard)
  @Post('accept')
  async acceptRequest(@Request() req: any, @Body('requesterId') requesterId: string) {
    return this.socialService.acceptConnectionRequest(req.user.sub, requesterId);
  }

  @UseGuards(ZeroTrustGuard)
  @Post('block')
  async blockUser(@Request() req: any, @Body('targetId') targetId: string) {
    return this.socialService.blockUserConnection(req.user.sub, targetId);
  }

  @UseGuards(ZeroTrustGuard)
  @Get('mutual/:userId')
  async getMutuals(@Request() req: any, @Param('userId') userId: string) {
    const list = await this.socialService.getMutualConnections(req.user.sub, userId);
    return { mutuals: list };
  }

  @UseGuards(ZeroTrustGuard)
  @Get('recommendations')
  async getRecommendations(@Request() req: any) {
    const list = await this.socialService.getRecommendations(req.user.sub);
    return { recommendations: list };
  }

  @UseGuards(ZeroTrustGuard)
  @Get('connections')
  async getConnections(@Request() req: any) {
    const list = await this.socialService.getUserConnections(req.user.sub);
    return { connections: list };
  }

  @UseGuards(ZeroTrustGuard)
  @Delete('connection/:targetId')
  async disconnect(@Request() req: any, @Param('targetId') targetId: string) {
    await this.socialService.deleteConnection(req.user.sub, targetId);
    return { success: true };
  }

  // --- Kafka consumer ---
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.socialService.deleteUserData(data.userId);
  }
}
