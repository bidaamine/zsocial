import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('passkeys')
export class Passkey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Base64URL encoded credential ID
  @Column()
  credentialId: string;

  // Base64URL encoded public key
  @Column()
  publicKey: string;

  @Column({ type: 'int', default: 0 })
  counter: number;

  @Column('simple-array', { nullable: true })
  transports: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.passkeys, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}
