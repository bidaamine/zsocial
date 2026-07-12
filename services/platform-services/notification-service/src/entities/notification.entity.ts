import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Column()
  channel!: 'email' | 'push' | 'sms';

  @Column()
  recipient!: string;

  // Notification Intelligence hierarchy (PDF): ai_action, alert, insight, info.
  @Column({ default: 'info' })
  category!: 'ai_action' | 'alert' | 'insight' | 'info';

  // True urgency. Only 'critical' (family-safety / medical) passes during focus mode.
  @Column({ default: 'normal' })
  priority!: 'critical' | 'high' | 'normal' | 'low';

  @Column()
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  // 'held' = intelligently filtered (e.g. focus mode) and not yet delivered.
  @Column({ default: 'queued' })
  status!: 'queued' | 'sent' | 'failed' | 'held';

  @Column({ name: 'retry_count', default: 0 })
  retryCount!: number;

  // True when the "delivery" was only simulated because no real transport
  // (SMTP / Twilio / FCM) is configured. Keeps history honest about what was
  // actually sent versus merely logged.
  @Column({ default: false })
  simulated!: boolean;

  @Column({ name: 'error_message', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'sent_at', nullable: true })
  sentAt?: Date;
}
