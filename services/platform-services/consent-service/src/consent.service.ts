import { Injectable } from '@nestjs/common';

export interface ConsentRecord {
  userId: string;
  allowHealthDataForAI: boolean;
  allowMarketing: boolean;
  allowThirdPartyMarketplace: boolean;
}

@Injectable()
export class ConsentService {
  // Mock database for now
  private readonly consents = new Map<string, ConsentRecord>();

  async verifyConsent(userId: string, actionCategory: keyof Omit<ConsentRecord, 'userId'>): Promise<boolean> {
    const record = this.consents.get(userId);
    if (!record) return false; // Default to deny
    return record[actionCategory] === true;
  }

  async updateConsent(userId: string, updates: Partial<ConsentRecord>): Promise<void> {
    const existing = this.consents.get(userId) || { userId, allowHealthDataForAI: false, allowMarketing: false, allowThirdPartyMarketplace: false };
    this.consents.set(userId, { ...existing, ...updates });
  }
}
