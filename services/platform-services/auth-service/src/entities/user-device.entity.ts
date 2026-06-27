import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('user_devices')
export class UserDevice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Index()
  @Column({ name: 'device_fingerprint' })
  deviceFingerprint!: string;

  @Column({ name: 'device_name', default: 'Unknown Device' })
  deviceName!: string;

  @Column({ name: 'is_trusted', default: true })
  isTrusted!: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp' })
  lastLoginAt!: Date;

  @Column({ name: 'last_ip_address', nullable: true })
  lastIpAddress?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;
}
