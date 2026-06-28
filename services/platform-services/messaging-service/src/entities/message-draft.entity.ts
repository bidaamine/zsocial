import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('message_drafts')
export class MessageDraft {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @Column({ name: 'recipient_id' })
  recipientId!: string;

  @Column({ name: 'drafted_content', type: 'text' })
  draftedContent!: string;

  @Column({ name: 'confidence_score', type: 'float', default: 1.0 })
  confidenceScore!: number;

  @Column({ name: 'reviewed_by_owner', default: false })
  reviewedByOwner!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;
}
