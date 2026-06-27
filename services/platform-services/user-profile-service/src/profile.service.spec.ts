import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfileService } from './profile.service';
import { UserProfile } from './entities/user-profile.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { DataSource } from 'typeorm';

describe('ProfileService', () => {
  let service: ProfileService;
  let profileDb: Record<string, UserProfile>;
  let preferencesDb: Record<string, UserPreferences>;

  beforeEach(async () => {
    profileDb = {};
    preferencesDb = {};

    const profileRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const id = record.id || 'profile-uuid';
        profileDb[record.userId] = { id, ...record };
        return Promise.resolve(profileDb[record.userId]);
      }),
      findOne: jest.fn().mockImplementation(({ where: { userId } }) => Promise.resolve(profileDb[userId] || null)),
      delete: jest.fn().mockImplementation(({ userId }) => {
        delete profileDb[userId];
        return Promise.resolve({ affected: 1 });
      }),
    };

    const preferencesRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const id = record.id || 'pref-uuid';
        preferencesDb[record.userId] = { id, ...record };
        return Promise.resolve(preferencesDb[record.userId]);
      }),
      findOne: jest.fn().mockImplementation(({ where: { userId } }) => Promise.resolve(preferencesDb[userId] || null)),
      delete: jest.fn().mockImplementation(({ userId }) => {
        delete preferencesDb[userId];
        return Promise.resolve({ affected: 1 });
      }),
    };

    const queryRunnerMock = {
      connect: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue([{ status: 'clean' }]),
      release: jest.fn().mockResolvedValue(null),
    };

    const dataSourceMock = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
    };

    const kafkaClientMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(UserProfile), useValue: profileRepositoryMock },
        { provide: getRepositoryToken(UserPreferences), useValue: preferencesRepositoryMock },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: 'PROFILE_CLIENT', useValue: kafkaClientMock },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should seed default profile and preferences', async () => {
    await service.seedDefaultProfile('user123');
    const profile = await service.getProfile('user123');
    const prefs = await service.getPreferences('user123');

    expect(profile.userId).toBe('user123');
    expect(profile.ageGroup).toBe('adult'); // 2000-01-01 is adult in 2026
    expect(prefs.theme).toBe('dark');
  });

  it('should calculate ageGroup as child for birthDate under 13 years ago', async () => {
    const elevenYearsAgo = new Date();
    elevenYearsAgo.setFullYear(elevenYearsAgo.getFullYear() - 11);

    const profile = await service.updateProfile('child_user', { birthDate: elevenYearsAgo });
    expect(profile.ageGroup).toBe('child');
  });

  it('should delete profiles on GDPR request', async () => {
    await service.seedDefaultProfile('delete_user');
    await service.deleteProfile('delete_user');

    await expect(service.getProfile('delete_user')).rejects.toThrow();
    await expect(service.getPreferences('delete_user')).rejects.toThrow();
  });
});
