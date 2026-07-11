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

  @Column()
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ default: 'queued' })
  status!: 'queued' | 'sent' | 'failed';

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
