import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * A department node in the corporate hierarchy tree. `parentDepartmentId` null = a
 * top-level department; nesting builds the org chart.
 */
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'company_id' })
  companyId!: string;

  @Column()
  name!: string;

  @Column({ name: 'parent_department_id', nullable: true })
  parentDepartmentId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
