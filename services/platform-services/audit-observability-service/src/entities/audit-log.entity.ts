import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column()
  @Index()
  actor!: string;

  @Column()
  action!: string;

  @Column()
  resource!: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp!: Date;
}
