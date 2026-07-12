import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CompanyService } from './company.service';
import { ZeroTrustGuard } from './zero-trust.guard';
import { CompanyRole } from './entities/company-member.entity';

@UseGuards(ZeroTrustGuard)
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body() body: { name: string; industry?: string; size?: string; description?: string; website?: string },
  ) {
    return this.companyService.createCompany(req.user.sub, body);
  }

  @Get()
  async myCompanies(@Request() req: any) {
    return this.companyService.getMyCompanies(req.user.sub);
  }

  @Get(':id')
  async getCompany(@Param('id') id: string, @Request() req: any) {
    return this.companyService.getCompany(id, req.user.sub);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { name?: string; industry?: string; size?: string; description?: string; website?: string },
  ) {
    return this.companyService.updateCompany(id, req.user.sub, body);
  }

  @Get(':id/members')
  async listMembers(@Param('id') id: string, @Request() req: any) {
    return this.companyService.listMembers(id, req.user.sub);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { userId: string; role?: CompanyRole; title?: string; departmentId?: string },
  ) {
    return this.companyService.addMember(id, req.user.sub, body);
  }

  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    await this.companyService.removeMember(id, req.user.sub, userId);
    return { success: true };
  }

  @Get(':id/departments')
  async listDepartments(@Param('id') id: string, @Request() req: any) {
    return this.companyService.listDepartments(id, req.user.sub);
  }

  @Post(':id/departments')
  async addDepartment(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { name: string; parentDepartmentId?: string },
  ) {
    return this.companyService.addDepartment(id, req.user.sub, body);
  }

  @Get(':id/hierarchy')
  async hierarchy(@Param('id') id: string, @Request() req: any) {
    return this.companyService.getHierarchy(id, req.user.sub);
  }

  // --- Kafka consumer for GDPR deletion ---
  @EventPattern('gdpr.user.deletion.requested')
  async handleGdprDeletion(@Payload() data: { userId: string }) {
    await this.companyService.deleteUserData(data.userId);
  }
}
