import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('compliance_reports')
export class ComplianceReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_name' })
  reportName!: string;

  @Column({ name: 'report_type' })
  reportType!: string; // ROPA, DSAR, EU_AI_ACT

  @Column({ type: 'jsonb', nullable: true })
  dataPayload!: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
