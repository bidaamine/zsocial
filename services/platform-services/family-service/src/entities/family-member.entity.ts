import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

export type FamilyRole = 'guardian' | 'parent' | 'child' | 'member';

@Entity('family_members')
@Unique(['familyId', 'userId'])
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'family_id' })
  familyId!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  // guardian/parent hold authority to manage the household; child/member do not.
  @Column({ default: 'member' })
  role!: FamilyRole;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt!: Date;
}
