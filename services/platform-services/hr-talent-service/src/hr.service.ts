import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPosting } from './entities/job-posting.entity';
import { Candidate, PipelineStage } from './entities/candidate.entity';

const STAGES: PipelineStage[] = ['sourced', 'screened', 'assessment', 'interview', 'offer', 'hired', 'rejected'];

@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);
  private readonly companyUrl = process.env.COMPANY_SERVICE_URL || 'http://localhost:4120';
  private seq = 0;

  constructor(
    @InjectRepository(JobPosting)
    private readonly jobRepo: Repository<JobPosting>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
  ) {}

  private async assertMember(companyId: string, authHeader?: string): Promise<void> {
    try {
      const res = await fetch(`${this.companyUrl}/api/companies/${companyId}`, {
        headers: authHeader ? { authorization: authHeader } : {},
      });
      if (res.ok) return;
    } catch (err: any) {
      this.logger.error(`Company membership check failed: ${err.message}`);
    }
    throw new ForbiddenException('Access denied: you are not a member of this company (or it could not be verified).');
  }

  private clamp(x: number, lo = 0, hi = 1): number {
    return Math.max(lo, Math.min(hi, x));
  }

  private anonymousCode(): string {
    // Non-identifying reference. (No Math.random needed; a monotonic seq + time slice.)
    this.seq += 1;
    return `CAND-${(this.seq).toString(36).toUpperCase().padStart(4, '0')}`;
  }

  // ── Job postings ──────────────────────────────────────────────────
  async createJob(
    companyId: string,
    userId: string,
    authHeader: string | undefined,
    data: { title: string; description?: string; requiredSkills?: Record<string, number> },
  ): Promise<JobPosting> {
    await this.assertMember(companyId, authHeader);
    return this.jobRepo.save(
      this.jobRepo.create({
        companyId,
        title: data.title,
        description: data.description,
        requiredSkills: data.requiredSkills || {},
        status: 'open',
        createdBy: userId,
      }),
    );
  }

  async listJobs(companyId: string, userId: string, authHeader?: string): Promise<JobPosting[]> {
    await this.assertMember(companyId, authHeader);
    return this.jobRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  private async getJobOrThrow(jobId: string): Promise<JobPosting> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }

  // ── Candidates ────────────────────────────────────────────────────
  async addCandidate(
    jobId: string,
    userId: string,
    authHeader: string | undefined,
    data: { skills?: Record<string, number>; yearsExperience?: number; referenceCode?: string },
  ): Promise<Candidate> {
    const job = await this.getJobOrThrow(jobId);
    await this.assertMember(job.companyId, authHeader);
    return this.candidateRepo.save(
      this.candidateRepo.create({
        jobId,
        companyId: job.companyId,
        referenceCode: data.referenceCode || this.anonymousCode(),
        skills: data.skills || {},
        yearsExperience: data.yearsExperience || 0,
        stage: 'sourced',
      }),
    );
  }

  /**
   * Bias-mitigated, explainable screening: scores a candidate purely on demonstrated
   * competencies against the job's required skills (plus a small experience factor),
   * and records exactly which competencies drove the score.
   */
  private score(job: JobPosting, candidate: Candidate): { matchScore: number; breakdown: any } {
    const required = job.requiredSkills || {};
    const entries = Object.entries(required);
    let weightedSum = 0;
    let totalWeight = 0;
    const breakdown: any[] = [];

    for (const [skill, weight] of entries) {
      const level = this.clamp(candidate.skills?.[skill] ?? 0);
      const contribution = weight * level;
      weightedSum += contribution;
      totalWeight += weight;
      breakdown.push({ skill, weight, candidateLevel: level, contribution: Number(contribution.toFixed(4)) });
    }

    const skillScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const experienceFactor = this.clamp(candidate.yearsExperience / 10); // 10y → full
    const matchScore = Number(this.clamp(0.85 * skillScore + 0.15 * experienceFactor).toFixed(4));

    return {
      matchScore,
      breakdown: { skillScore: Number(skillScore.toFixed(4)), experienceFactor: Number(experienceFactor.toFixed(4)), competencies: breakdown },
    };
  }

  async screenCandidate(candidateId: string, userId: string, authHeader?: string): Promise<Candidate> {
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);
    await this.assertMember(candidate.companyId, authHeader);
    const job = await this.getJobOrThrow(candidate.jobId);

    const { matchScore, breakdown } = this.score(job, candidate);
    candidate.matchScore = matchScore;
    candidate.scoreBreakdown = breakdown;
    if (candidate.stage === 'sourced') candidate.stage = 'screened';
    return this.candidateRepo.save(candidate);
  }

  /** Screens (if needed) and returns all candidates for a job, ranked by match score. */
  async rankCandidates(jobId: string, userId: string, authHeader?: string): Promise<Candidate[]> {
    const job = await this.getJobOrThrow(jobId);
    await this.assertMember(job.companyId, authHeader);
    const candidates = await this.candidateRepo.find({ where: { jobId } });
    for (const c of candidates) {
      const { matchScore, breakdown } = this.score(job, c);
      c.matchScore = matchScore;
      c.scoreBreakdown = breakdown;
      await this.candidateRepo.save(c);
    }
    return candidates.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  async moveStage(candidateId: string, userId: string, authHeader: string | undefined, stage: PipelineStage): Promise<Candidate> {
    if (!STAGES.includes(stage)) {
      throw new NotFoundException(`Unknown pipeline stage '${stage}'`);
    }
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate ${candidateId} not found`);
    await this.assertMember(candidate.companyId, authHeader);
    candidate.stage = stage;
    return this.candidateRepo.save(candidate);
  }

  /** Kanban pipeline view: candidates grouped by stage. */
  async getPipeline(jobId: string, userId: string, authHeader?: string): Promise<Record<string, Candidate[]>> {
    const job = await this.getJobOrThrow(jobId);
    await this.assertMember(job.companyId, authHeader);
    const candidates = await this.candidateRepo.find({ where: { jobId } });
    const pipeline: Record<string, Candidate[]> = {};
    for (const stage of STAGES) pipeline[stage] = [];
    for (const c of candidates) (pipeline[c.stage] ||= []).push(c);
    return pipeline;
  }

  // ── GDPR ──────────────────────────────────────────────────────────
  async deleteUserData(userId: string): Promise<void> {
    // Candidates are anonymised (no user linkage); we anonymise job authorship.
    this.logger.log(`GDPR cascade: anonymising job authorship for user ${userId}`);
    await this.jobRepo.update({ createdBy: userId }, { createdBy: 'deleted-user' });
  }
}
