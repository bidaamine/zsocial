import { Controller, Get, Post, Body, Param, Req, ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { AnonymizationService } from './anonymization.service';
import { DeletionQueueService } from './deletion-queue.service';
import { ZeroTrustGuard } from './zero-trust.guard';

@Controller('api/privacy')
export class PrivacyController {
  constructor(
    private readonly anonymizationService: AnonymizationService,
    private readonly deletionQueueService: DeletionQueueService,
  ) {}

  @Post('anonymize')
  @UseGuards(ZeroTrustGuard)
  async anonymizePayload(@Body() body: { payload: any; epsilon?: number }) {
    const epsilon = body.epsilon !== undefined ? body.epsilon : 0.5;
    const anonymized = this.anonymizationService.anonymizePayload(body.payload, epsilon);
    return { anonymized };
  }

  @Post('delete-account')
  @UseGuards(ZeroTrustGuard)
  async deleteAccount(@Req() req: any, @Body() body: { userId?: string }) {
    // If a specific userId is requested, ensure the requesting user is an admin
    let targetUserId = req.user.sub;
    if (body.userId && body.userId !== req.user.sub) {
      if (!req.user.roles?.includes('admin')) {
        throw new ForbiddenException('Access Denied: Only administrators can trigger deletion for other users');
      }
      targetUserId = body.userId;
    }

    const jobId = await this.deletionQueueService.registerDeletionRequest(targetUserId);
    return { status: 'DELETION_IN_PROGRESS', jobId, userId: targetUserId };
  }

  @Get('deletion-status/:jobId')
  @UseGuards(ZeroTrustGuard)
  async getDeletionStatus(@Req() req: any, @Param('jobId') jobId: string) {
    const job = await this.deletionQueueService.getJobStatus(jobId);
    if (!job) {
      throw new NotFoundException(`Deletion job not found with ID: ${jobId}`);
    }

    // Zero-Trust check: user can only view their own job, unless they are an admin
    if (job.userId !== req.user.sub && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException('Access Denied: Cannot view deletion status for other users');
    }

    return job;
  }
}
