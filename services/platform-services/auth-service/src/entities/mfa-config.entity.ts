import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('mfa_configs')
export class MfaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: false })
  isEnabled: boolean;

  @Column({ nullable: true })
  secret: string;

  @Column('simple-array', { nullable: true })
  recoveryCodes: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.mfaConfig, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
