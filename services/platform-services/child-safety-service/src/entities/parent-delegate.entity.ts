import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('parent_delegates')
export class ParentDelegate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'parent_id' })
  parentId!: string;

  @Index()
  @Column({ name: 'child_id' })
  childId!: string;

  @Column({ name: 'coppa_consent_granted', default: false })
  coppaConsentGranted!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
