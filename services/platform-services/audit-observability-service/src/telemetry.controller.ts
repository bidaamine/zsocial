import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly audit: AuditLogService) {}

  @Post('audit')
  recordAudit(@Body() body: { eventId: string; actor: string; action: string; resource: string }) {
    return this.audit.logEvent(body.eventId, body.actor, body.action, body.resource);
  }

  @Get('audit/:eventId')
  getAudit(@Param('eventId') eventId: string) {
    return this.audit.getEvent(eventId);
  }

  @Post('ai-decision')
  recordAiDecision(
    @Body()
    body: {
      eventId: string;
      modelVersion: string;
      inputs: any;
      decision: string;
      confidence: number;
      explanation: string;
    },
  ) {
    return this.audit.logAiDecision(
      body.eventId,
      body.modelVersion,
      body.inputs,
      body.decision,
      body.confidence,
      body.explanation,
    );
  }

  @Get('ai-decision/:eventId')
  getAiDecision(@Param('eventId') eventId: string) {
    return this.audit.getAiDecision(eventId);
  }
}
