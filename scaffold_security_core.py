import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"
platform_dir = os.path.join(base_dir, "services", "platform-services")

def create_base_files(app_path, name, port):
    os.makedirs(os.path.join(app_path, "src"), exist_ok=True)
    
    # package.json
    pkg = {
      "name": f"@nexus/{name}",
      "version": "0.1.0",
      "private": True,
      "scripts": {
        "build": "nest build",
        "format": 'prettier --write "src/**/*.ts"',
        "start": "nest start",
        "dev": "nest start --watch",
        "start:debug": "nest start --debug --watch",
        "start:prod": "node dist/main",
        "lint": 'eslint "{src,apps,libs,test}/**/*.ts" --fix'
      },
      "dependencies": {
        "@nestjs/common": "^10.0.0",
        "@nestjs/core": "^10.0.0",
        "@nestjs/platform-express": "^10.0.0",
        "reflect-metadata": "^0.2.0",
        "rxjs": "^7.8.1",
        "@nexus/shared-types": "workspace:*",
        "@nexus/api-contracts": "workspace:*"
      },
      "devDependencies": {
        "@nestjs/cli": "^10.0.0",
        "@nestjs/schematics": "^10.0.0",
        "@types/express": "^4.17.17",
        "@types/node": "^20.3.1",
        "typescript": "^5.1.3",
        "@nexus/tsconfig": "workspace:*",
        "@nexus/eslint-config": "workspace:*"
      }
    }
    with open(os.path.join(app_path, "package.json"), "w") as f:
        json.dump(pkg, f, indent=2)

    # tsconfig.json
    tsconfig = {
      "extends": "@nexus/tsconfig/base.json",
      "compilerOptions": {
        "outDir": "./dist",
        "baseUrl": "./",
        "experimentalDecorators": True,
        "emitDecoratorMetadata": True
      },
      "exclude": ["node_modules", "dist"]
    }
    with open(os.path.join(app_path, "tsconfig.json"), "w") as f:
        json.dump(tsconfig, f, indent=2)

    # nest-cli.json
    nest_cli = {
      "$schema": "https://json.schemastore.org/nest-cli",
      "collection": "@nestjs/schematics",
      "sourceRoot": "src",
      "compilerOptions": {
        "deleteOutDir": True
      }
    }
    with open(os.path.join(app_path, "nest-cli.json"), "w") as f:
        json.dump(nest_cli, f, indent=2)

    # src/main.ts
    with open(os.path.join(app_path, "src", "main.ts"), "w") as f:
        f.write(f"""import {{ NestFactory }} from '@nestjs/core';
import {{ AppModule }} from './app.module';

async function bootstrap() {{
  const app = await NestFactory.create(AppModule);
  await app.listen({port});
  console.log(`{name} is running on: ${{await app.getUrl()}}`);
}}
bootstrap();
""")

# ==========================================
# 1. Security Agent
# ==========================================
sec_agent_path = os.path.join(platform_dir, "security-agent")
create_base_files(sec_agent_path, "security-agent", 4010)

with open(os.path.join(sec_agent_path, "src", "zero-trust.guard.ts"), "w") as f:
    f.write("""import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ZeroTrustGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    // In zero-trust, we assume nothing. Verify identity, device, and permissions.
    const token = request.headers.authorization;
    if (!token) {
      throw new UnauthorizedException('Zero-Trust violation: Missing identity context.');
    }
    
    // TODO: Verify token against Identity Service, check device fingerprint, assess risk.
    return true; // Return true if trust is established.
  }
}
""")

with open(os.path.join(sec_agent_path, "src", "threat-detection.service.ts"), "w") as f:
    f.write("""import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ThreatDetectionService {
  private readonly logger = new Logger(ThreatDetectionService.name);

  assessRisk(ip: string, action: string, userId: string): number {
    this.logger.log(`Assessing threat level for user ${userId} performing ${action} from ${ip}`);
    // Analyze patterns: rapid successive failed requests, impossible travel, known malicious IPs.
    // Return a risk score 0-100.
    return 0; // Baseline safe
  }
}
""")

with open(os.path.join(sec_agent_path, "src", "child-data-protection.interceptor.ts"), "w") as f:
    f.write("""import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ChildDataProtectionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const isChildData = request.headers['x-target-age-group'] === 'child';
    
    if (isChildData) {
      const parentKey = request.headers['x-parent-cryptographic-key'];
      if (!parentKey) {
        throw new ForbiddenException('Child data access denied. Valid parent cryptographic key required.');
      }
    }

    return next.handle().pipe(
      tap(() => {
        // Enforce Zero-Knowledge Proof encryption layer for outbound child data.
      }),
    );
  }
}
""")

with open(os.path.join(sec_agent_path, "src", "app.module.ts"), "w") as f:
    f.write("""import { Module } from '@nestjs/common';
import { ThreatDetectionService } from './threat-detection.service';

@Module({
  imports: [],
  controllers: [],
  providers: [ThreatDetectionService],
})
export class AppModule {}
""")

# ==========================================
# 2. Consent Service
# ==========================================
consent_path = os.path.join(platform_dir, "consent-service")
create_base_files(consent_path, "consent-service", 4104)

with open(os.path.join(consent_path, "src", "consent.service.ts"), "w") as f:
    f.write("""import { Injectable } from '@nestjs/common';

export interface ConsentRecord {
  userId: string;
  allowHealthDataForAI: boolean;
  allowMarketing: boolean;
  allowThirdPartyMarketplace: boolean;
}

@Injectable()
export class ConsentService {
  // Mock database for now
  private readonly consents = new Map<string, ConsentRecord>();

  async verifyConsent(userId: string, actionCategory: keyof Omit<ConsentRecord, 'userId'>): Promise<boolean> {
    const record = this.consents.get(userId);
    if (!record) return false; // Default to deny
    return record[actionCategory] === true;
  }

  async updateConsent(userId: string, updates: Partial<ConsentRecord>): Promise<void> {
    const existing = this.consents.get(userId) || { userId, allowHealthDataForAI: false, allowMarketing: false, allowThirdPartyMarketplace: false };
    this.consents.set(userId, { ...existing, ...updates });
  }
}
""")

with open(os.path.join(consent_path, "src", "consent.controller.ts"), "w") as f:
    f.write("""import { Controller, Get, Post, Body, Query, ForbiddenException } from '@nestjs/common';
import { ConsentService } from './consent.service';

@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('check')
  async checkConsent(@Query('userId') userId: string, @Query('action') action: string) {
    const isAllowed = await this.consentService.verifyConsent(userId, action as any);
    if (!isAllowed) {
        throw new ForbiddenException(`Consent not granted for action: ${action}`);
    }
    return { allowed: true };
  }

  @Post('update')
  async updateConsent(@Body() body: { userId: string, updates: any }) {
    await this.consentService.updateConsent(body.userId, body.updates);
    return { status: 'updated' };
  }
}
""")

with open(os.path.join(consent_path, "src", "consent-enforcement.guard.ts"), "w") as f:
    f.write("""import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConsentService } from './consent.service';

@Injectable()
export class ConsentEnforcementGuard implements CanActivate {
  constructor(private readonly consentService: ConsentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-user-id'];
    const requiredAction = request.route?.path; // Simplified mapping
    
    if (!userId) return false;

    // A real implementation would map routes to specific consent requirements
    // For now, we assume all actions require some specific check
    const allowed = await this.consentService.verifyConsent(userId, 'allowHealthDataForAI');
    if (!allowed) {
      throw new ForbiddenException('User has not consented to this data usage.');
    }
    
    return true;
  }
}
""")

with open(os.path.join(consent_path, "src", "app.module.ts"), "w") as f:
    f.write("""import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';

@Module({
  imports: [],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class AppModule {}
""")

# ==========================================
# 3. Privacy Engine
# ==========================================
privacy_path = os.path.join(platform_dir, "privacy-engine")
create_base_files(privacy_path, "privacy-engine", 5100)

with open(os.path.join(privacy_path, "src", "anonymization.service.ts"), "w") as f:
    f.write("""import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnonymizationService {
  private readonly logger = new Logger(AnonymizationService.name);

  applyDifferentialPrivacy(data: number[], epsilon: number): number[] {
    this.logger.log(`Applying differential privacy with epsilon=${epsilon}`);
    // Simplified Laplacian noise addition
    return data.map(value => {
        const noise = this.generateLaplaceNoise(1 / epsilon);
        return value + noise;
    });
  }

  private generateLaplaceNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}
""")

with open(os.path.join(privacy_path, "src", "deletion-queue.service.ts"), "w") as f:
    f.write("""import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DeletionQueueService {
  private readonly logger = new Logger(DeletionQueueService.name);

  async registerDeletionRequest(userId: string): Promise<string> {
    const jobId = `del-${Date.now()}-${userId}`;
    this.logger.log(`Registered GDPR deletion request for user ${userId}. Job ID: ${jobId}`);
    
    // In production: Publish event to Kafka to trigger cascaded deletion across:
    // Postgres, Neo4j, TimescaleDB, VectorDB, Data Lake, and Object Storage.
    
    return jobId;
  }
}
""")

with open(os.path.join(privacy_path, "src", "app.module.ts"), "w") as f:
    f.write("""import { Module } from '@nestjs/common';
import { AnonymizationService } from './anonymization.service';
import { DeletionQueueService } from './deletion-queue.service';

@Module({
  imports: [],
  controllers: [],
  providers: [AnonymizationService, DeletionQueueService],
})
export class AppModule {}
""")

print("Successfully scaffolded Security Agent, Consent Service, and Privacy Engine.")
