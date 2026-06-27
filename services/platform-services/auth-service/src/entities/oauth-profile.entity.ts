import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('oauth_profiles')
@Unique(['provider', 'providerId'])
export class OAuthProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: string; // e.g., 'google', 'apple', 'microsoft'

  @Column()
  providerId: string; // The user ID from the provider

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.oauthProfiles, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
