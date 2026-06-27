import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { MfaConfig } from './mfa-config.entity';
import { Passkey } from './passkey.entity';
import { OAuthProfile } from './oauth-profile.entity';
import { RefreshToken } from './refresh-token.entity';

export type UserArchetype = 'personal' | 'family' | 'corporate';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockoutUntil: Date | null;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  verificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  verificationTokenExpiresAt: Date | null;

  @Column({
    type: 'varchar',
    default: 'personal',
  })
  archetype: UserArchetype;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => MfaConfig, (mfa) => mfa.user, { cascade: true })
  mfaConfig: MfaConfig;

  @OneToMany(() => Passkey, (passkey) => passkey.user, { cascade: true })
  passkeys: Passkey[];

  @OneToMany(() => OAuthProfile, (oauth) => oauth.user, { cascade: true })
  oauthProfiles: OAuthProfile[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user, { cascade: true })
  refreshTokens: RefreshToken[];
}
