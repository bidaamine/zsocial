import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('families')
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'created_by' })
  createdBy!: string; // userId of the guardian who created the household

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
