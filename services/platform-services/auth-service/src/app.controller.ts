import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth(): string {
    return 'auth-service is healthy and operational.';
  }
}
