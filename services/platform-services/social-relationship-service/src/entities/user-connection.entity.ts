import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_connections')
export class UserConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'requester_id' })
  requesterId!: string;

  @Index()
  @Column({ name: 'receiver_id' })
  receiverId!: string;

  @Column({ default: 'pending' })
  status!: 'pending' | 'accepted' | 'blocked';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
