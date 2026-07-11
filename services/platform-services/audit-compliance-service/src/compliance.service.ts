import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ComplianceScan } from './entities/compliance-scan.entity';
import { ComplianceReport } from './entities/compliance-report.entity';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(ComplianceScan)
    private readonly scanRepository: Repository<ComplianceScan>,
    @InjectRepository(ComplianceReport)
    private readonly reportRepository: Repository<ComplianceReport>,
    private readonly dataSource: DataSource,
  ) {}

  async runComplianceScan(scanType: string): Promise<ComplianceScan> {
    this.logger.log(`Initiating compliance audit scan: ${scanType}`);
    
    const scan = this.scanRepository.create({
      scanType,
      status: 'running',
      findings: [],
    });
    await this.scanRepository.save(scan);

    const findings: any[] = [];
    // Status taxonomy:
    //   passed       – scan ran and found no violations
    //   failed       – scan ran and found violations
    //   inconclusive – scan cannot be evaluated because the data it needs is not
    //                  modelled in the current schema (documented per-scan below)
    //   error        – scan queries threw; result is unknown. NEVER report 'passed'
    //                  on error — a broken scan must not produce a clean bill of health.
    let status: 'passed' | 'failed' | 'inconclusive' | 'error' = 'passed';

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      if (scanType === 'gdpr_sla_scan') {
        // GDPR Art. 17: deletion jobs must complete within 30 days.
        // Real columns are `requested_at` (@CreateDateColumn) and `user_id`.
        const activeBreaches = await queryRunner.query(`
          SELECT id, user_id, requested_at FROM deletion_jobs
          WHERE status != 'COMPLETED'
          AND requested_at < NOW() - INTERVAL '30 days'
        `);
        for (const breach of activeBreaches || []) {
          findings.push({
            rule: 'GDPR_30_DAY_SLA_BREACH',
            severity: 'CRITICAL',
            description: `Deletion job ${breach.id} for user ${breach.user_id} has been pending for over 30 days.`,
            jobId: breach.id,
          });
        }
      } else if (scanType === 'ccpa_scan') {
        // CCPA opt-out enforcement requires cross-referencing consent against actual
        // marketing activity. Notifications carry no campaign/type field, so a marketing
        // send cannot be distinguished from transactional mail. This scan is therefore
        // not evaluable against the current schema without producing false positives.
        findings.push({
          rule: 'CCPA_SCAN_INCONCLUSIVE',
          severity: 'INFO',
          description:
            'CCPA opt-out enforcement is not evaluable: no marketing-activity signal is modelled to cross-reference against consent_records.allow_marketing.',
        });
        status = 'inconclusive';
      } else if (scanType === 'soc2_scan') {
        // SOC 2 privileged-user MFA check requires a persisted RBAC/roles model.
        // Roles are currently a JWT claim only (see auth-service generateTokenPair) and
        // are NOT stored on the users table, so privileged users cannot be identified
        // from the database. Reported honestly as inconclusive rather than passed.
        findings.push({
          rule: 'SOC2_SCAN_INCONCLUSIVE',
          severity: 'INFO',
          description:
            'SOC 2 privileged-user MFA check is not evaluable: roles are a JWT claim only and are not persisted on the users table.',
        });
        status = 'inconclusive';
      } else if (scanType === 'pci_dss_scan') {
        // PCI-DSS: detect cleartext credit-card PANs in free-text profile bios.
        // Real table `user_profiles`, real column `bio`.
        const cardLeaks = await queryRunner.query(`
          SELECT id, user_id FROM user_profiles
          WHERE bio ~ '\\b[3-6][0-9]{12,15}\\b'
        `);
        for (const profile of cardLeaks || []) {
          findings.push({
            rule: 'PCI_DSS_CLEARTEXT_PAN_LEAK',
            severity: 'CRITICAL',
            description: `Profile bio for user ${profile.user_id} contains a cleartext credit card pattern.`,
            profileId: profile.id,
          });
        }
      } else if (scanType === 'hipaa_scan') {
        // HIPAA: verify WORM triggers are active on the audit tables. Real trigger names
        // created by audit-observability-service (prevent_*_modifications).
        const triggers = await queryRunner.query(`
          SELECT tgname FROM pg_trigger
          WHERE tgname IN ('prevent_audit_logs_modifications', 'prevent_ai_decisions_modifications')
        `);
        if (!triggers || triggers.length < 2) {
          findings.push({
            rule: 'HIPAA_WORM_TRIGGER_INACTIVE',
            severity: 'CRITICAL',
            description: `WORM triggers are not fully active on audit tables. Count found: ${triggers ? triggers.length : 0}`,
          });
        }
      } else {
        findings.push({
          rule: 'UNKNOWN_SCAN_TYPE',
          severity: 'INFO',
          description: `Unknown scan type '${scanType}'. No rules executed.`,
        });
        status = 'inconclusive';
      }

      // Only a scan that actually ran its rules can be marked failed/passed.
      if (status === 'passed' && findings.length > 0) {
        status = 'failed';
      }
    } catch (err: any) {
      // A scan whose queries fail is reported as 'error' — NEVER 'passed'. Silently
      // passing a broken scan would fabricate a clean compliance result.
      this.logger.error(`Compliance scan '${scanType}' failed to execute: ${err.message}`);
      status = 'error';
      findings.push({
        rule: 'SCAN_EXECUTION_ERROR',
        severity: 'HIGH',
        description: `Scan could not be completed due to a database error: ${err.message}`,
      });
    } finally {
      await queryRunner.release();
    }

    scan.status = status;
    scan.findings = findings;
    return this.scanRepository.save(scan);
  }

  async generateLegalReport(reportType: string, reportName: string): Promise<ComplianceReport> {
    this.logger.log(`Generating legal compliance export of type ${reportType}: ${reportName}`);

    let payload: any = {};

    if (reportType === 'ROPA') {
      // Article 30 ROPA. The narrative sections below are a fixed legal template, but
      // the quantitative fields are derived live from the database so the report
      // reflects the platform's actual current state rather than static placeholders.
      const liveMetrics = await this.collectRopaMetrics();

      payload = {
        organization: 'Zad Social Platform Services',
        articleComplianceReference: 'Article 30 GDPR Compliance Report',
        generatedAt: new Date().toISOString(),
        liveMetrics,
        dataControllerRepresentative: 'DPO Office (dpo@zad-social.com)',
        purposesOfProcessing: [
          'Identity and secure user authentication (auth-service)',
          'User consents and preferences verification (consent-service)',
          'Right to Be Forgotten cascading erasures (privacy-engine)',
          'Encrypted child profiles management (security-agent)',
          'Secure file metadata and sandboxed storage (media-file-service)',
        ],
        categoriesOfDataSubjects: ['Users over 18', 'Minors (under 18 governed by parent delegates)'],
        dataRetentionPeriod: 'Post deletion requested, cascaded within 30 days',
        technicalOrganizationalSecurityMeasures: [
          'Asymmetric RS256 token verification on all microservices',
          'Redis-backed geodistance impossible travel risk assessment',
          'Symmetric AES-256-GCM encryption on child data fields',
          'Write-Once-Read-Many (WORM) PostgreSQL and ORM logging triggers',
        ],
      };
    } else {
      payload = {
        title: 'Generic Compliance Export',
        generatedAt: new Date().toISOString(),
      };
    }

    const report = this.reportRepository.create({
      reportName,
      reportType,
      dataPayload: payload,
    });

    return this.reportRepository.save(report);
  }

  /**
   * Derives the quantitative portion of the ROPA from live data. Each metric is
   * queried defensively — a missing table yields `null` (unknown) rather than a
   * fabricated number, so the report never overstates what is actually known.
   */
  private async collectRopaMetrics(): Promise<Record<string, number | null>> {
    const queryRunner = this.dataSource.createQueryRunner();
    const safeCount = async (sql: string): Promise<number | null> => {
      try {
        const rows = await queryRunner.query(sql);
        return rows?.[0]?.count !== undefined ? Number(rows[0].count) : null;
      } catch (err: any) {
        this.logger.warn(`ROPA metric query failed (${err.message})`);
        return null;
      }
    };

    try {
      await queryRunner.connect();
      return {
        totalDataSubjects: await safeCount('SELECT COUNT(*)::int AS count FROM users'),
        pendingDeletionRequests: await safeCount(
          "SELECT COUNT(*)::int AS count FROM deletion_jobs WHERE status != 'COMPLETED'",
        ),
        completedDeletionRequests: await safeCount(
          "SELECT COUNT(*)::int AS count FROM deletion_jobs WHERE status = 'COMPLETED'",
        ),
        recordedConsentRecords: await safeCount('SELECT COUNT(*)::int AS count FROM consent_records'),
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getScan(id: string): Promise<ComplianceScan | null> {
    return this.scanRepository.findOne({ where: { id } });
  }

  async getAllScans(): Promise<ComplianceScan[]> {
    return this.scanRepository.find({ order: { executedAt: 'DESC' } });
  }

  async getReport(id: string): Promise<ComplianceReport | null> {
    return this.reportRepository.findOne({ where: { id } });
  }

  async getAllReports(): Promise<ComplianceReport[]> {
    return this.reportRepository.find({ order: { createdAt: 'DESC' } });
  }
}
