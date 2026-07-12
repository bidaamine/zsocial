import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('safety_incidents')
export class SafetyIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'child_id' })
  childId!: string;

  @Column({ name: 'incident_type' })
  incidentType!: 'cyberbullying' | 'grooming_risk' | 'age_gate_violation' | 'wellbeing_concern';

  @Column({ default: 'MEDIUM' })
  severity!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @Column()
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
