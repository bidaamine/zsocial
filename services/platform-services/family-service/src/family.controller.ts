import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { FamilyService } from './family.service';
import { HarmonyService } from './harmony.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { FamilyRole } from './entities/family-member.entity';
import { MilestoneType } from './entities/family-milestone.entity';

@UseGuards(ZeroTrustGuard)
@Controller('families')
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly harmony: HarmonyService,
  ) {}

  @Post()
  async createFamily(@Request() req: any, @Body('name') name: string) {
    return this.familyService.createFamily(req.user.sub, name);
  }

  @Get()
  async getMyFamilies(@Request() req: any) {
    return this.familyService.getMyFamilies(req.user.sub);
  }

  @Get(':id')
  async getFamily(@Param('id') id: string, @Request() req: any) {
    return this.familyService.getFamily(id, req.user.sub);
  }

  @Get(':id/members')
  async listMembers(@Param('id') id: string, @Request() req: any) {
    return this.familyService.listMembers(id, req.user.sub);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { userId: string; role?: FamilyRole; displayName?: string },
  ) {
    return this.familyService.addMember(id, req.user.sub, body);
  }

  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    await this.familyService.removeMember(id, req.user.sub, userId);
    return { success: true };
  }

  @Get(':id/milestones')
  async listMilestones(@Param('id') id: string, @Request() req: any) {
    return this.familyService.listMilestones(id, req.user.sub);
  }

  @Post(':id/milestones')
  async addMilestone(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { type?: MilestoneType; title: string; eventDate?: string },
  ) {
    return this.familyService.addMilestone(id, req.user.sub, body);
  }

  @Post(':id/state')
  async reportState(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { userId?: string; stress?: number; wellbeing?: number; communicationScore?: number },
  ) {
    return this.familyService.reportMemberState(id, req.user.sub, body);
  }

  @Get(':id/harmony')
  async getHarmony(@Param('id') id: string, @Request() req: any) {
    // Viewing harmony requires membership (same rule as the dashboard).
    await this.familyService.getFamily(id, req.user.sub);
    return this.harmony.assess(id);
  }

  @Post(':id/harmony/assess')
  async assessHarmony(@Param('id') id: string, @Request() req: any) {
    await this.familyService.getFamily(id, req.user.sub);
    return this.harmony.assessAndAlert(id);
  }

  @Get(':id/dashboard')
  async getDashboard(@Param('id') id: string, @Request() req: any) {
    return this.familyService.getDashboard(id, req.user.sub);
  }

  // --- Kafka consumer for GDPR deletion ---
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.familyService.deleteUserData(data.userId);
  }
}
