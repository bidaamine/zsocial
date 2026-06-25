import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailProvider {
  async send(to: string, subject: string, body: string) {
    return { success: true, method: 'email', to, subject };
  }
}
