import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'author_id' })
  authorId!: string;

  @Column()
  title!: string;

  // 'post' = short-form status update; 'article' = long-form content.
  // Supports the "Post and article management" requirement.
  @Column({ default: 'post' })
  type!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  tags?: string; // JSON string representation of string[] or comma-separated

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
