import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type PipelineStage = 'sourced' | 'screened' | 'assessment' | 'interview' | 'offer' | 'hired' | 'rejected';

/**
 * A candidate in the hiring pipeline. Bias-mitigation by design (PDF Module 7): this
 * record deliberately holds NO name, photo, address, graduation year, or institution —
 * only an anonymised reference code and a structured competency profile, so screening
 * evaluates demonstrated capability rather than identity proxies.
 */
@Entity('candidates')
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'job_id' })
  jobId!: string;

  @Index()
  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'reference_code' })
  referenceCode!: string; // anonymised handle, e.g. 'CAND-3F9A'

  // Demonstrated competencies as { skill: level } where level is 0..1.
  @Column({ type: 'jsonb', default: {} })
  skills!: Record<string, number>;

  @Column({ name: 'years_experience', type: 'float', default: 0 })
  yearsExperience!: number;

  @Column({ default: 'sourced' })
  stage!: PipelineStage;

  @Column({ name: 'match_score', type: 'float', nullable: true })
  matchScore?: number; // 0..1, set on screening

  // Explainable per-competency contribution to the score.
  @Column({ name: 'score_breakdown', type: 'jsonb', nullable: true })
  scoreBreakdown?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
