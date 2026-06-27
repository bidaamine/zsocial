import { SetMetadata } from '@nestjs/common';
import { ConsentRecord } from './entities/consent-record.entity';

export const CONSENT_KEY = 'required_consent';
export const RequireConsent = (field: keyof Omit<ConsentRecord, 'id' | 'userId' | 'updatedAt'>) =>
  SetMetadata(CONSENT_KEY, field);
