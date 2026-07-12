import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HrService } from './hr.service';
import { JobPosting } from './entities/job-posting.entity';
import { Candidate } from './entities/candidate.entity';

describe('HrService', () => {
  let service: HrService;
  let jobDb: any[];
  let candidateDb: any[];
  let membershipOk: boolean;

  beforeEach(async () => {
    jobDb = [];
    candidateDb = [];
    membershipOk = true;

    global.fetch = jest.fn(async (url: any) => {
      if (String(url).includes('/api/companies/')) return { ok: membershipOk } as any;
      return { ok: false } as any;
    }) as any;

    const jobRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (j: any) => { j.id = j.id || `job-${jobDb.length}`; const i = jobDb.findIndex((x) => x.id === j.id); if (i >= 0) jobDb[i] = j; else jobDb.push(j); return Promise.resolve(j); },
      findOne: ({ where: { id } }: any) => Promise.resolve(jobDb.find((j) => j.id === id) || null),
      find: ({ where: { companyId } }: any) => Promise.resolve(jobDb.filter((j) => j.companyId === companyId)),
      update: () => Promise.resolve({ affected: 1 }),
    };
    const candidateRepo = {
      create: (dto: any) => ({ ...dto }),
      save: (c: any) => { c.id = c.id || `cand-${candidateDb.length}`; const i = candidateDb.findIndex((x) => x.id === c.id); if (i >= 0) candidateDb[i] = c; else candidateDb.push(c); return Promise.resolve(c); },
      findOne: ({ where: { id } }: any) => Promise.resolve(candidateDb.find((c) => c.id === id) || null),
      find: ({ where: { jobId } }: any) => Promise.resolve(candidateDb.filter((c) => c.jobId === jobId)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        { provide: getRepositoryToken(JobPosting), useValue: jobRepo },
        { provide: getRepositoryToken(Candidate), useValue: candidateRepo },
      ],
    }).compile();

    service = module.get<HrService>(HrService);
  });

  const makeJob = () =>
    service.createJob('co1', 'u1', 'Bearer x', {
      title: 'Senior Engineer',
      requiredSkills: { typescript: 1.0, leadership: 0.5 },
    });

  it('creates a job for a company member', async () => {
    const job = await makeJob();
    expect(job.id).toBeDefined();
    expect(job.status).toBe('open');
  });

  it('blocks job creation for non-members (fail-closed)', async () => {
    membershipOk = false;
    await expect(makeJob()).rejects.toThrow();
  });

  it('stores candidates anonymously (no identity fields)', async () => {
    const job = await makeJob();
    const cand = await service.addCandidate(job.id, 'u1', 'Bearer x', { skills: { typescript: 0.9 }, yearsExperience: 5 });
    expect(cand.referenceCode).toMatch(/^CAND-/);
    // Bias-mitigation: the record carries no identity proxies.
    expect(cand).not.toHaveProperty('name');
    expect(cand).not.toHaveProperty('address');
    expect(cand).not.toHaveProperty('photo');
  });

  it('screens a candidate with an explainable competency breakdown', async () => {
    const job = await makeJob();
    const cand = await service.addCandidate(job.id, 'u1', 'Bearer x', {
      skills: { typescript: 0.9, leadership: 0.8 }, yearsExperience: 5,
    });
    const screened = await service.screenCandidate(cand.id, 'u1', 'Bearer x');
    expect(screened.stage).toBe('screened');
    expect(screened.matchScore).toBeGreaterThan(0.7);
    expect(screened.scoreBreakdown.competencies.length).toBe(2);
    const ts = screened.scoreBreakdown.competencies.find((c: any) => c.skill === 'typescript');
    expect(ts.contribution).toBeCloseTo(0.9, 3); // weight 1.0 * level 0.9
  });

  it('ranks candidates by match score (capability-driven)', async () => {
    const job = await makeJob();
    await service.addCandidate(job.id, 'u1', 'Bearer x', { skills: { typescript: 0.3 }, yearsExperience: 1, referenceCode: 'B' });
    await service.addCandidate(job.id, 'u1', 'Bearer x', { skills: { typescript: 0.9, leadership: 0.8 }, yearsExperience: 5, referenceCode: 'A' });
    const ranked = await service.rankCandidates(job.id, 'u1', 'Bearer x');
    expect(ranked[0]?.referenceCode).toBe('A');
    expect(ranked[1]?.referenceCode).toBe('B');
    expect((ranked[0]?.matchScore ?? 0)).toBeGreaterThan(ranked[1]?.matchScore ?? 1);
  });

  it('moves a candidate through pipeline stages', async () => {
    const job = await makeJob();
    const cand = await service.addCandidate(job.id, 'u1', 'Bearer x', { skills: {}, yearsExperience: 0 });
    const moved = await service.moveStage(cand.id, 'u1', 'Bearer x', 'interview');
    expect(moved.stage).toBe('interview');
  });

  it('groups candidates into a Kanban pipeline by stage', async () => {
    const job = await makeJob();
    const c1 = await service.addCandidate(job.id, 'u1', 'Bearer x', { skills: {} });
    await service.moveStage(c1.id, 'u1', 'Bearer x', 'offer');
    await service.addCandidate(job.id, 'u1', 'Bearer x', { skills: {} });
    const pipeline = await service.getPipeline(job.id, 'u1', 'Bearer x');
    expect(pipeline.offer?.length).toBe(1);
    expect(pipeline.sourced?.length).toBe(1);
  });
});
