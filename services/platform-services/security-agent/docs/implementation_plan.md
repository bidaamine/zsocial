# Security & Privacy Core: Documentation & Testing

This plan addresses the organization of our architectural documentation and the implementation of automated tests for our newly scaffolded Security and Privacy services.

## Proposed Changes

### 1. Documentation Relocation
- **[MODIFY]** The current `implementation_plan.md`, `walkthrough.md`, and `task.md` will be moved into a new `docs` directory inside `services/platform-services/security-agent/docs`. This ensures that the reasoning and tracking for the zero-trust architecture live directly alongside the code that enforces it.

### 2. Testing Dependencies
- **[MODIFY] Root `package.json`**: Add the necessary testing frameworks to the monorepo root as development dependencies (`jest`, `@types/jest`, `ts-jest`, `@nestjs/testing`).

### 3. Security Agent Tests (`services/platform-services/security-agent`)
- **[MODIFY] `package.json`**: Add the `test` script and Jest configuration.
- **[NEW] `src/zero-trust.guard.spec.ts`**: Test the `ZeroTrustGuard` to verify that requests missing an authorization context throw an `UnauthorizedException`.
- **[NEW] `src/threat-detection.service.spec.ts`**: Test the `ThreatDetectionService` logic for risk assessment.
- **[NEW] `src/child-data-protection.interceptor.spec.ts`**: Test the `ChildDataProtectionInterceptor` to verify that it blocks child data requests if the parental cryptographic key is missing, and allows them if present.

### 4. Consent Service Tests (`services/platform-services/consent-service`)
- **[MODIFY] `package.json`**: Add the `test` script and Jest configuration.
- **[NEW] `src/consent.service.spec.ts`**: Verify that consent updates are correctly saved and that unauthorized actions resolve to `false`.
- **[NEW] `src/consent-enforcement.guard.spec.ts`**: Verify that the guard blocks the request if the consent service denies the action, and allows it otherwise.

### 5. Privacy Engine Tests (`services/platform-services/privacy-engine`)
- **[MODIFY] `package.json`**: Add the `test` script and Jest configuration.
- **[NEW] `src/anonymization.service.spec.ts`**: Verify that `applyDifferentialPrivacy` accurately alters the datasets by adding mathematical noise.
- **[NEW] `src/deletion-queue.service.spec.ts`**: Verify that GDPR deletion requests generate properly formatted job IDs.

## Verification Plan

### Automated Tests
- Run `pnpm install` at the root to resolve new Jest dependencies.
- Run `pnpm turbo test --filter=@nexus/security-agent --filter=@nexus/consent-service --filter=@nexus/privacy-engine` to execute the full test suite.
- I will debug and resolve any failing tests directly to ensure the core is robust and error-free.
