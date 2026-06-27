import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ComplianceService } from './compliance.service';
import { ComplianceScan } from './entities/compliance-scan.entity';
import { ComplianceReport } from './entities/compliance-report.entity';
import { DataSource } from 'typeorm';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let scanDb: Record<string, ComplianceScan>;
  let reportDb: Record<string, ComplianceReport>;

  beforeEach(async () => {
    scanDb = {};
    reportDb = {};

    const scanRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const id = record.id || 'scan-uuid';
        const saved = { id, ...record, executedAt: new Date() };
        scanDb[id] = saved;
        return Promise.resolve(saved);
      }),
      findOne: jest.fn().mockImplementation(({ where: { id } }) => Promise.resolve(scanDb[id] || null)),
    };

    const reportRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        const id = record.id || 'report-uuid';
        const saved = { id, ...record, createdAt: new Date() };
        reportDb[id] = saved;
        return Promise.resolve(saved);
      }),
      findOne: jest.fn().mockImplementation(({ where: { id } }) => Promise.resolve(reportDb[id] || null)),
    };

    const queryRunnerMock = {
      connect: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue([]), // mock empty active breaches
      release: jest.fn().mockResolvedValue(null),
    };

    const dataSourceMock = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: getRepositoryToken(ComplianceScan), useValue: scanRepositoryMock },
        { provide: getRepositoryToken(ComplianceReport), useValue: reportRepositoryMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  it('should run a compliance scan and return passed status', async () => {
    const scan = await service.runComplianceScan('gdpr_sla_scan');
    expect(scan.status).toBe('passed');
    expect(scan.findings).toEqual([]);
  });

  it('should generate an Article 30 ROPA legal report', async () => {
    const report = await service.generateLegalReport('ROPA', 'Article_30_Log');
    expect(report.reportName).toBe('Article_30_Log');
    expect(report.reportType).toBe('ROPA');
    expect(report.dataPayload.organization).toBe('Zad Social Platform Services');
    expect(report.dataPayload.articleComplianceReference).toBe('Article 30 GDPR Compliance Report');
  });
});
