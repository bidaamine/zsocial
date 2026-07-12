import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

/** A marketing campaign with an AI-generated multi-channel brief. */
@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'brand_id', nullable: true })
  brandId?: string;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  goal!: string;

  @Column({ type: 'jsonb', default: [] })
  channels!: string[]; // e.g. ['email', 'social', 'search']

  @Column({ default: 'draft' })
  status!: CampaignStatus;

  // AI-generated plan (creative direction, copy angles, schedule …), or a template brief.
  @Column({ type: 'text', nullable: true })
  brief?: string;

  @Column({ name: 'ai_generated', default: false })
  aiGenerated!: boolean;

  @Column({ name: 'created_by' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
