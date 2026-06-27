import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ProfileService } from './profile.service';
import { ZeroTrustGuard } from './zero-trust.guard';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(ZeroTrustGuard)
  @Get('me')
  async getMyProfile(@Request() req: any) {
    return this.profileService.getProfile(req.user.sub);
  }

  @UseGuards(ZeroTrustGuard)
  @Get('preferences/me')
  async getMyPreferences(@Request() req: any) {
    return this.profileService.getPreferences(req.user.sub);
  }

  @UseGuards(ZeroTrustGuard)
  @Get(':userId')
  async getUserProfile(@Param('userId') userId: string, @Request() req: any) {
    // Only allow self or admin to access profiles
    if (req.user.sub !== userId && !req.user.roles.includes('admin')) {
      throw new ForbiddenException('Unauthorized profile access');
    }
    return this.profileService.getProfile(userId);
  }

  @UseGuards(ZeroTrustGuard)
  @Post()
  async updateMyProfile(@Request() req: any, @Body() body: any) {
    return this.profileService.updateProfile(req.user.sub, body);
  }

  @UseGuards(ZeroTrustGuard)
  @Put('preferences')
  async updateMyPreferences(@Request() req: any, @Body() body: any) {
    return this.profileService.updatePreferences(req.user.sub, body);
  }

  @UseGuards(ZeroTrustGuard)
  @Patch('avatar')
  async updateMyAvatar(@Request() req: any, @Body('avatarMediaId') avatarMediaId: string) {
    return this.profileService.updateAvatar(req.user.sub, avatarMediaId);
  }

  // --- Kafka consumers ---

  @EventPattern('auth.user.registered')
  async handleUserRegistered(@Payload() data: { userId: string }) {
    await this.profileService.seedDefaultProfile(data.userId);
  }

  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.profileService.deleteProfile(data.userId);
  }
}
