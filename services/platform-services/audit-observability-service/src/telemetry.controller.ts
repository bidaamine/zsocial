import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private audit: AuditLogService) {}

  @Post('audit')
  recordAudit(@Body() body: { eventId: string, actor: string, action: string, resource: string }) {
    return this.audit.logEvent(body.eventId, body.actor, body.action, body.resource);
  }

  @Get('audit/:eventId')
  getAudit(@Param('eventId') eventId: string) {
    return this.audit.getEvent(eventId);
  }
}
