import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { HrService } from './hr.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import type { PipelineStage } from './entities/candidate.entity';

@UseGuards(ZeroTrustGuard)
@Controller()
export class HrController {
  constructor(private readonly hr: HrService) {}

  private auth(req: any): string | undefined {
    return req.headers.authorization;
  }

  // ── Jobs (company-scoped) ──
  @Post('companies/:companyId/jobs')
  async createJob(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() body: { title: string; description?: string; requiredSkills?: Record<string, number> },
  ) {
    return this.hr.createJob(companyId, req.user.sub, this.auth(req), body);
  }

  @Get('companies/:companyId/jobs')
  async listJobs(@Param('companyId') companyId: string, @Request() req: any) {
    return this.hr.listJobs(companyId, req.user.sub, this.auth(req));
  }

  // ── Candidates (job-scoped) ──
  @Post('jobs/:jobId/candidates')
  async addCandidate(
    @Param('jobId') jobId: string,
    @Request() req: any,
    @Body() body: { skills?: Record<string, number>; yearsExperience?: number; referenceCode?: string },
  ) {
    return this.hr.addCandidate(jobId, req.user.sub, this.auth(req), body);
  }

  @Get('jobs/:jobId/candidates/ranked')
  async rankCandidates(@Param('jobId') jobId: string, @Request() req: any) {
    return this.hr.rankCandidates(jobId, req.user.sub, this.auth(req));
  }

  @Get('jobs/:jobId/pipeline')
  async pipeline(@Param('jobId') jobId: string, @Request() req: any) {
    return this.hr.getPipeline(jobId, req.user.sub, this.auth(req));
  }

  // ── Candidate actions ──
  @Post('candidates/:id/screen')
  async screen(@Param('id') id: string, @Request() req: any) {
    return this.hr.screenCandidate(id, req.user.sub, this.auth(req));
  }

  @Put('candidates/:id/stage')
  async moveStage(@Param('id') id: string, @Request() req: any, @Body('stage') stage: PipelineStage) {
    return this.hr.moveStage(id, req.user.sub, this.auth(req), stage);
  }

  // --- Kafka consumer for GDPR deletion ---
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.hr.deleteUserData(data.userId);
  }
}
