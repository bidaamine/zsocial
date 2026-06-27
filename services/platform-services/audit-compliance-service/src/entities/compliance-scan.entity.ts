import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('compliance_scans')
export class ComplianceScan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'scan_type' })
  scanType!: string; // gdpr_sla_scan, consent_violation_scan

  @Column({ default: 'running' })
  status!: string; // running, passed, failed

  @Column({ type: 'jsonb', nullable: true })
  findings!: any;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt!: Date;
}
