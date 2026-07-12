import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** A company's brand kit — identity, palette, typography, and voice. */
@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'company_id' })
  companyId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  tagline?: string;

  @Column({ type: 'jsonb', default: {} })
  palette!: Record<string, string>; // e.g. { primary: '#0EA5E9', accent: '#F97316' }

  @Column({ type: 'jsonb', default: {} })
  typography!: Record<string, string>; // e.g. { heading: 'Inter', body: 'Inter' }

  @Column({ type: 'text', nullable: true })
  voice?: string; // brand voice & tone guidelines

  @Column({ name: 'created_by' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
