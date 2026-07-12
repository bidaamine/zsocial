import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index, Unique } from 'typeorm';

/**
 * The latest per-member wellbeing signals used by the Family Harmony Engine. One row
 * per (family, user) — upserted. Values are 0..1 summaries pushed by other services
 * (e.g. the AI orchestrator's life-state, child-safety wellbeing) so the family can be
 * modelled as a whole without the harmony engine holding raw personal data.
 */
@Entity('family_member_states')
@Unique(['familyId', 'userId'])
export class MemberState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'family_id' })
  familyId!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ type: 'float', default: 0 })
  stress!: number; // 0..1, higher = more stressed

  @Column({ type: 'float', default: 0.5 })
  wellbeing!: number; // 0..1, higher = healthier

  @Column({ name: 'communication_score', type: 'float', default: 0.5 })
  communicationScore!: number; // 0..1, recent parent-child communication health

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
