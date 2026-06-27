import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('deletion_jobs')
export class DeletionJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  @Index()
  userId!: string;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string; // PENDING, IN_PROGRESS, COMPLETED, FAILED

  @Column({ type: 'jsonb', default: {} })
  progress!: Record<string, boolean>; // e.g., { auth: false, consent: false }
}
