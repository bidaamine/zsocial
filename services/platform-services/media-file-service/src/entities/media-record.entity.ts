import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('media_records')
export class MediaRecord {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'owner_id' })
  @Index()
  ownerId!: string;

  @Column()
  filename!: string;

  @Column({ name: 's3_key' })
  s3Key!: string;

  @Column({ name: 'mime_type', nullable: true })
  mimeType!: string;

  @Column({ type: 'int', default: 0 })
  size!: number;

  @Column({ default: 'pending_upload' })
  status!: string; // pending_upload, scanning, clean, quarantined

  @Column({ name: 'thumbnail_s3_key', nullable: true })
  thumbnailS3Key?: string;

  @Column({ type: 'text', nullable: true })
  metadata?: string; // JSON string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
