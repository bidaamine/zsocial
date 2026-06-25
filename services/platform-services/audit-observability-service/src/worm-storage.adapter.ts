import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class WormStorageAdapter {
  private memoryStore: Record<string, any> = {};

  writeOnce(id: string, data: any) {
    if (this.memoryStore[id]) {
      throw new BadRequestException('WORM violation: Record already exists');
    }
    this.memoryStore[id] = { ...data, timestamp: new Date().toISOString() };
    return this.memoryStore[id];
  }

  read(id: string) {
    return this.memoryStore[id] || null;
  }
}
