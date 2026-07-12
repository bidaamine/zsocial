import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Per-user Notification Intelligence settings. When `focusMode` is on, only
 * critical (family-safety / medical) notifications are delivered; everything else
 * is held until focus ends or is released.
 */
@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'focus_mode', default: false })
  focusMode!: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
