import { Controller, Post, Get, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceRoleGuard } from './compliance-role.guard';

@Controller('compliance')
@UseGuards(ComplianceRoleGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('scan')
  async triggerScan(@Body('scanType') scanType: string) {
    return this.complianceService.runComplianceScan(scanType || 'gdpr_sla_scan');
  }

  @Get('scans')
  async getScans() {
    return this.complianceService.getAllScans();
  }

  @Get('scans/:id')
  async getScan(@Param('id') id: string) {
    const scan = await this.complianceService.getScan(id);
    if (!scan) {
      throw new NotFoundException(`Compliance scan with ID ${id} not found`);
    }
    return scan;
  }

  @Post('report')
  async generateReport(@Body('reportType') reportType: string, @Body('reportName') reportName: string) {
    return this.complianceService.generateLegalReport(reportType || 'ROPA', reportName || 'ROPA_Report');
  }

  @Get('reports')
  async getReports() {
    return this.complianceService.getAllReports();
  }

  @Get('reports/:id')
  async getReport(@Param('id') id: string) {
    const report = await this.complianceService.getReport(id);
    if (!report) {
      throw new NotFoundException(`Compliance report with ID ${id} not found`);
    }
    return report;
  }
}
