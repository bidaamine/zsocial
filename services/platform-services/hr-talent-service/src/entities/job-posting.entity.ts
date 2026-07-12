import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('job_postings')
export class JobPosting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'company_id' })
  companyId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Required competencies as { skill: weight } — weights need not sum to 1.
  @Column({ name: 'required_skills', type: 'jsonb', default: {} })
  requiredSkills!: Record<string, number>;

  @Column({ default: 'open' })
  status!: 'open' | 'closed';

  @Column({ name: 'created_by' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
