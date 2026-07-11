import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { ClientKafka } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepo: Repository<UserPreferences>,
    private readonly dataSource: DataSource,
    @Inject('PROFILE_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    return profile;
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const preferences = await this.preferencesRepo.findOne({ where: { userId } });
    if (!preferences) {
      throw new NotFoundException(`Preferences for user ${userId} not found`);
    }
    return preferences;
  }

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepo.create({ userId });
    }

    if (data.firstName !== undefined) profile.firstName = data.firstName;
    if (data.lastName !== undefined) profile.lastName = data.lastName;
    if (data.bio !== undefined) profile.bio = data.bio;

    if (data.birthDate !== undefined) {
      profile.birthDate = new Date(data.birthDate);
      profile.ageGroup = this.calculateAgeGroup(profile.birthDate);
    }

    const saved = await this.profileRepo.save(profile);
    this.emitProfileUpdated(userId, 'profile_changed');
    return saved;
  }

  async updatePreferences(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    let preferences = await this.preferencesRepo.findOne({ where: { userId } });
    if (!preferences) {
      preferences = this.preferencesRepo.create({ userId });
    }

    if (data.theme !== undefined) preferences.theme = data.theme;
    if (data.language !== undefined) preferences.language = data.language;
    if (data.notificationsEnabled !== undefined) preferences.notificationsEnabled = data.notificationsEnabled;
    if (data.accessibilityMode !== undefined) preferences.accessibilityMode = data.accessibilityMode;

    const saved = await this.preferencesRepo.save(preferences);
    this.emitProfileUpdated(userId, 'preferences_changed');
    return saved;
  }

  async updateAvatar(userId: string, avatarMediaId: string): Promise<UserProfile> {
    // Zero-Trust verification: the avatar file must exist, be owned by this user, and
    // have PASSED malware scanning before it can be linked to the profile.
    let media: any[];
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      media = await queryRunner.query(
        `SELECT status FROM media_records WHERE id = $1 AND owner_id = $2`,
        [avatarMediaId, userId],
      );
    } catch (err: any) {
      // FAIL-CLOSED: if the integrity check cannot be performed, refuse to set the
      // avatar rather than silently accepting an unverified file. Previously this was
      // swallowed and the avatar saved anyway, defeating the check.
      this.logger.error(`Avatar media integrity check could not be completed: ${err.message}`);
      throw new ServiceUnavailableException(
        'Could not verify avatar media integrity at this time. Please retry.',
      );
    } finally {
      await queryRunner.release();
    }

    if (!media || media.length === 0) {
      throw new BadRequestException('Avatar media ID not found or unauthorized');
    }
    if (media[0].status !== 'clean') {
      throw new BadRequestException('Avatar media file is not verified clean (quarantined, unscanned, or infected)');
    }

    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepo.create({ userId });
    }

    profile.avatarMediaId = avatarMediaId;
    const saved = await this.profileRepo.save(profile);
    this.emitProfileUpdated(userId, 'avatar_changed');
    return saved;
  }

  async seedDefaultProfile(userId: string): Promise<void> {
    this.logger.log(`Seeding default profile/preferences for user ${userId}`);
    await this.updateProfile(userId, {
      birthDate: new Date('2000-01-01'), // default adult
    });
    await this.updatePreferences(userId, {
      theme: 'dark',
      language: 'en',
      notificationsEnabled: true,
      accessibilityMode: false,
    });
  }

  async deleteProfile(userId: string): Promise<void> {
    this.logger.log(`GDPR Cascade: Deleting profile records for user ${userId}`);
    await this.profileRepo.delete({ userId });
    await this.preferencesRepo.delete({ userId });
  }

  private calculateAgeGroup(birthDate: Date): 'child' | 'teen' | 'adult' {
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 13) return 'child';
    if (age >= 13 && age < 18) return 'teen';
    return 'adult';
  }

  private emitProfileUpdated(userId: string, changeType: string) {
    this.kafkaClient.emit('profile.updated', {
      userId,
      changeType,
      timestamp: new Date().toISOString(),
    });
  }
}
