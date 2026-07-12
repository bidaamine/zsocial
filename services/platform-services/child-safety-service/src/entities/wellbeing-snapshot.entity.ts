import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * A point-in-time behavioural wellbeing reading for a child. A longitudinal series
 * of these builds the emotional-health picture the platform monitors for sudden,
 * concerning changes (PDF Module 5 — Emotional Wellbeing Monitoring for Children).
 */
@Entity('wellbeing_snapshots')
export class WellbeingSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'child_id' })
  childId!: string;

  // Raw behavioural signals (all optional; missing ones don't skew the score).
  @Column({ name: 'peer_interactions', type: 'float', default: 0 })
  peerInteractions!: number; // count of peer interactions in the window

  @Column({ name: 'late_night_minutes', type: 'float', default: 0 })
  lateNightMinutes!: number; // minutes of late-night activity

  @Column({ name: 'social_withdrawal', type: 'float', default: 0 })
  socialWithdrawal!: number; // 0..1, higher = more withdrawn

  @Column({ name: 'content_positivity', type: 'float', default: 0.5 })
  contentPositivity!: number; // 0..1, higher = more positive content consumed

  // Derived 0..1 wellbeing score (higher = healthier).
  @Column({ name: 'wellbeing_score', type: 'float' })
  wellbeingScore!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
