import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

export type CompanyRole = 'owner' | 'admin' | 'manager' | 'member';

@Entity('company_members')
@Unique(['companyId', 'userId'])
export class CompanyMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'company_id' })
  companyId!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  // owner/admin manage the org; manager leads a department; member is staff.
  @Column({ default: 'member' })
  role!: CompanyRole;

  @Column({ nullable: true })
  title?: string;

  @Column({ name: 'department_id', nullable: true })
  departmentId?: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt!: Date;
}
