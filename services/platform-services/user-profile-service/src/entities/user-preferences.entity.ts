import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ default: 'dark' })
  theme!: 'light' | 'dark';

  @Column({ default: 'en' })
  language!: string;

  @Column({ name: 'notifications_enabled', default: true })
  notificationsEnabled!: boolean;

  @Column({ name: 'accessibility_mode', default: false })
  accessibilityMode!: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
