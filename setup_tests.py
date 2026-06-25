import os
import json
import shutil

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"
brain_dir = r"C:\Users\BIDA Mohamed Amine\.gemini\antigravity\brain\f404cd10-0f3b-4152-a6dc-837d9ae49046"
platform_dir = os.path.join(base_dir, "services", "platform-services")
sec_agent_dir = os.path.join(platform_dir, "security-agent")
consent_dir = os.path.join(platform_dir, "consent-service")
privacy_dir = os.path.join(platform_dir, "privacy-engine")

# 1. Copy documentation
docs_dir = os.path.join(sec_agent_dir, "docs")
os.makedirs(docs_dir, exist_ok=True)
for file_name in ["task.md", "walkthrough.md", "implementation_plan.md"]:
    src = os.path.join(brain_dir, file_name)
    dst = os.path.join(docs_dir, file_name)
    if os.path.exists(src):
        shutil.copy2(src, dst)

# 2. Add Jest to package.json for the 3 services
def add_jest_to_pkg(app_dir):
    pkg_path = os.path.join(app_dir, "package.json")
    with open(pkg_path, "r") as f:
        pkg = json.load(f)
    
    pkg["scripts"]["test"] = "jest"
    
    pkg["jest"] = {
      "moduleFileExtensions": ["js", "json", "ts"],
      "rootDir": "src",
      "testRegex": ".*\\\\.spec\\\\.ts$",
      "transform": {
        "^.+\\\\.(t|j)s$": "ts-jest"
      },
      "collectCoverageFrom": ["**/*.(t|j)s"],
      "coverageDirectory": "../coverage",
      "testEnvironment": "node"
    }
    
    with open(pkg_path, "w") as f:
        json.dump(pkg, f, indent=2)

add_jest_to_pkg(sec_agent_dir)
add_jest_to_pkg(consent_dir)
add_jest_to_pkg(privacy_dir)

# 3. Write Tests for Security Agent
with open(os.path.join(sec_agent_dir, "src", "zero-trust.guard.spec.ts"), "w") as f:
    f.write("""import { ZeroTrustGuard } from './zero-trust.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('ZeroTrustGuard', () => {
  let guard: ZeroTrustGuard;

  beforeEach(() => {
    guard = new ZeroTrustGuard();
  });

  it('should throw UnauthorizedException if no token is provided', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should return true if token is provided', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer token' } }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
""")

with open(os.path.join(sec_agent_dir, "src", "threat-detection.service.spec.ts"), "w") as f:
    f.write("""import { Test, TestingModule } from '@nestjs/testing';
import { ThreatDetectionService } from './threat-detection.service';

describe('ThreatDetectionService', () => {
  let service: ThreatDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThreatDetectionService],
    }).compile();

    service = module.get<ThreatDetectionService>(ThreatDetectionService);
  });

  it('should return baseline safe risk of 0', () => {
    expect(service.assessRisk('192.168.1.1', 'login', 'user1')).toBe(0);
  });
});
""")

with open(os.path.join(sec_agent_dir, "src", "child-data-protection.interceptor.spec.ts"), "w") as f:
    f.write("""import { ChildDataProtectionInterceptor } from './child-data-protection.interceptor';
import { ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';

describe('ChildDataProtectionInterceptor', () => {
  let interceptor: ChildDataProtectionInterceptor;

  beforeEach(() => {
    interceptor = new ChildDataProtectionInterceptor();
  });

  it('should block child data requests without parental key', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-target-age-group': 'child' }
        }),
      }),
    } as ExecutionContext;
    const mockHandler: CallHandler = { handle: () => of('next') };

    expect(() => interceptor.intercept(mockContext, mockHandler)).toThrow(ForbiddenException);
  });

  it('should allow child data requests with parental key', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-target-age-group': 'child',
            'x-parent-cryptographic-key': 'valid-key'
          }
        }),
      }),
    } as ExecutionContext;
    const mockHandler: CallHandler = { handle: () => of('next') };

    expect(() => interceptor.intercept(mockContext, mockHandler)).not.toThrow();
  });

  it('should allow regular data requests without parental key', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;
    const mockHandler: CallHandler = { handle: () => of('next') };

    expect(() => interceptor.intercept(mockContext, mockHandler)).not.toThrow();
  });
});
""")

# 4. Write Tests for Consent Service
with open(os.path.join(consent_dir, "src", "consent.service.spec.ts"), "w") as f:
    f.write("""import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from './consent.service';

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsentService],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
  });

  it('should default to deny if no record exists', async () => {
    const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
    expect(allowed).toBe(false);
  });

  it('should allow after consent is granted', async () => {
    await service.updateConsent('user1', { allowHealthDataForAI: true });
    const allowed = await service.verifyConsent('user1', 'allowHealthDataForAI');
    expect(allowed).toBe(true);
  });
});
""")

with open(os.path.join(consent_dir, "src", "consent-enforcement.guard.spec.ts"), "w") as f:
    f.write("""import { ConsentEnforcementGuard } from './consent-enforcement.guard';
import { ConsentService } from './consent.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('ConsentEnforcementGuard', () => {
  let guard: ConsentEnforcementGuard;
  let service: ConsentService;

  beforeEach(() => {
    service = new ConsentService();
    guard = new ConsentEnforcementGuard(service);
  });

  it('should block if userId is missing', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, route: { path: '/test' } }),
      }),
    } as ExecutionContext;
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(false);
  });

  it('should throw ForbiddenException if consent is not granted', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-user-id': 'user1' }, route: { path: '/test' } }),
      }),
    } as ExecutionContext;
    
    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it('should return true if consent is granted', async () => {
    await service.updateConsent('user1', { allowHealthDataForAI: true });
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-user-id': 'user1' }, route: { path: '/test' } }),
      }),
    } as ExecutionContext;
    
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});
""")

# 5. Write Tests for Privacy Engine
with open(os.path.join(privacy_dir, "src", "anonymization.service.spec.ts"), "w") as f:
    f.write("""import { Test, TestingModule } from '@nestjs/testing';
import { AnonymizationService } from './anonymization.service';

describe('AnonymizationService', () => {
  let service: AnonymizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnonymizationService],
    }).compile();

    service = module.get<AnonymizationService>(AnonymizationService);
  });

  it('should apply noise to dataset', () => {
    const input = [10, 20, 30];
    const output = service.applyDifferentialPrivacy(input, 0.5);
    expect(output.length).toBe(3);
    expect(output).not.toEqual(input); // Extremely unlikely to be exactly equal
  });
});
""")

with open(os.path.join(privacy_dir, "src", "deletion-queue.service.spec.ts"), "w") as f:
    f.write("""import { Test, TestingModule } from '@nestjs/testing';
import { DeletionQueueService } from './deletion-queue.service';

describe('DeletionQueueService', () => {
  let service: DeletionQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeletionQueueService],
    }).compile();

    service = module.get<DeletionQueueService>(DeletionQueueService);
  });

  it('should register deletion request and return job ID', async () => {
    const jobId = await service.registerDeletionRequest('user123');
    expect(jobId).toMatch(/^del-\d+-user123$/);
  });
});
""")

print("Successfully moved docs and configured Jest tests.")
