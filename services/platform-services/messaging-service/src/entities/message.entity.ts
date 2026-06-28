import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sender_id' })
  senderId!: string;

  @Column({ name: 'receiver_id' })
  receiverId!: string;

  @Column({ name: 'encrypted_body', type: 'text' })
  encryptedBody!: string;

  @Column({ nullable: true })
  iv?: string;

  @Column({ name: 'auth_tag', nullable: true })
  authTag?: string;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt!: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ name: 'is_late_night', default: false })
  isLateNight!: boolean;

  @Column({ name: 'message_length', default: 0 })
  messageLength!: number;
}
