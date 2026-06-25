import { Injectable } from '@nestjs/common';

@Injectable()
export class StreamManagerService {
  formatMessage(topic: string, payload: any) {
    return {
      topic,
      timestamp: new Date().toISOString(),
      data: payload
    };
  }
}
