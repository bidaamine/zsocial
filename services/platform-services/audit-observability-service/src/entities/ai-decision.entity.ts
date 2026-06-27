import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ai_decisions')
export class AiDecision {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ name: 'model_version' })
  modelVersion!: string;

  @Column({ type: 'jsonb', nullable: true })
  inputs!: any;

  @Column()
  decision!: string;

  @Column({ type: 'numeric', scale: 4, precision: 5 })
  confidence!: number;

  @Column({ type: 'text' })
  explanation!: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp!: Date;
}
