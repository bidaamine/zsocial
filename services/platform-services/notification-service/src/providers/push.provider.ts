import { Injectable } from '@nestjs/common';

@Injectable()
export class PushProvider {
  async send(deviceId: string, title: string, body: string) {
    return { success: true, method: 'push', deviceId, title };
  }
}
