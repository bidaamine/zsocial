import { Injectable } from '@nestjs/common';
import { WormStorageAdapter } from './worm-storage.adapter';

@Injectable()
export class AuditLogService {
  constructor(private worm: WormStorageAdapter) {}

  logEvent(eventId: string, actor: string, action: string, resource: string) {
    return this.worm.writeOnce(eventId, { actor, action, resource });
  }

  getEvent(eventId: string) {
    return this.worm.read(eventId);
  }
}
