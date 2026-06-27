import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('consent_records')
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId!: string;

  @Column({ name: 'allow_health_data_for_ai', type: 'boolean', default: false })
  allowHealthDataForAI!: boolean;

  @Column({ name: 'allow_marketing', type: 'boolean', default: false })
  allowMarketing!: boolean;

  @Column({ name: 'allow_third_party_marketplace', type: 'boolean', default: false })
  allowThirdPartyMarketplace!: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
