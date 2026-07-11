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
  let mockQueryResult: any[];
  let queryRunnerMock: any;

  beforeEach(async () => {
    scanDb = {};
    reportDb = {};
    mockQueryResult = [];

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

    queryRunnerMock = {
      connect: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult)),
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

  it('should run a compliance scan and return passed status when there are no findings', async () => {
    const scan = await service.runComplianceScan('gdpr_sla_scan');
    expect(scan.status).toBe('passed');
    expect(scan.findings).toEqual([]);
  });

  it('should report ccpa_scan as inconclusive (marketing activity is not modelled)', async () => {
    const scan = await service.runComplianceScan('ccpa_scan');
    // Honest result: the schema has no marketing-activity signal to evaluate against,
    // so the scan is inconclusive rather than a fabricated pass/fail.
    expect(scan.status).toBe('inconclusive');
    expect(scan.findings[0].rule).toBe('CCPA_SCAN_INCONCLUSIVE');
  });

  it('should report soc2_scan as inconclusive (roles are not persisted)', async () => {
    const scan = await service.runComplianceScan('soc2_scan');
    // Roles are a JWT claim only; privileged users can't be identified from the DB.
    expect(scan.status).toBe('inconclusive');
    expect(scan.findings[0].rule).toBe('SOC2_SCAN_INCONCLUSIVE');
  });

  it('should report status=error (NEVER passed) when scan queries throw', async () => {
    // Regression guard for the silent-pass bug: a broken scan must not produce a
    // clean compliance result.
    queryRunnerMock.query.mockRejectedValueOnce(new Error('relation "deletion_jobs" does not exist'));
    const scan = await service.runComplianceScan('gdpr_sla_scan');
    expect(scan.status).toBe('error');
    expect(scan.status).not.toBe('passed');
    expect(scan.findings[0].rule).toBe('SCAN_EXECUTION_ERROR');
  });

  it('should run pci_dss_scan and report findings on credit card number leaks', async () => {
    mockQueryResult = [{ id: 'profile-1', bio: 'My card is 4111111111111111', user_id: 'user-123' }];
    const scan = await service.runComplianceScan('pci_dss_scan');
    expect(scan.status).toBe('failed');
    expect(scan.findings[0].rule).toBe('PCI_DSS_CLEARTEXT_PAN_LEAK');
    expect(scan.findings[0].profileId).toBe('profile-1');
  });

  it('should run hipaa_scan and report findings if WORM triggers are inactive', async () => {
    mockQueryResult = []; // Less than 2 WORM triggers
    const scan = await service.runComplianceScan('hipaa_scan');
    expect(scan.status).toBe('failed');
    expect(scan.findings[0].rule).toBe('HIPAA_WORM_TRIGGER_INACTIVE');
  });

  it('should generate an Article 30 ROPA legal report', async () => {
    const report = await service.generateLegalReport('ROPA', 'Article_30_Log');
    expect(report.reportName).toBe('Article_30_Log');
    expect(report.reportType).toBe('ROPA');
    expect(report.dataPayload.organization).toBe('Zad Social Platform Services');
    expect(report.dataPayload.articleComplianceReference).toBe('Article 30 GDPR Compliance Report');
  });
});
