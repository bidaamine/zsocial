import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type MilestoneType = 'new_sibling' | 'house_move' | 'exam_period' | 'bereavement' | 'other';

/**
 * A family milestone (new sibling, house move, exam period …) that the Family Harmony
 * Engine treats as a trigger for coordinated, whole-family support.
 */
@Entity('family_milestones')
export class FamilyMilestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'family_id' })
  familyId!: string;

  @Column({ default: 'other' })
  type!: MilestoneType;

  @Column()
  title!: string;

  @Column({ name: 'event_date', type: 'timestamp', nullable: true })
  eventDate?: Date;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
