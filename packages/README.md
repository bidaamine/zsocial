# Shared Packages

Shared packages prevent code duplication across apps and microservices. They establish a single source of truth for types, schemas, and configurations.

## Folder Structure and Responsibilities

- **`api-contracts`**: Centralized OpenAPI/Swagger specifications and shared interface contracts for REST APIs.
- **`config`**: Standardized configuration schemas, environment variable validation, and setup scripts.
- **`constants`**: Global application constants, enums, and static maps used across the ecosystem.
- **`core-infra`**: Core infrastructure definitions, including Docker Compose files and database seed scripts.
- **`design-tokens`**: Shared UI/UX design tokens (colors, typography, spacing) mapped to CSS/Tailwind for frontend applications.
- **`eslint-config`**: Monorepo-wide ESLint configurations to enforce code style consistency.
- **`event-contracts`**: Kafka topic definitions, event payload schemas, and messaging contracts for async communication.
- **`localization`**: Shared i18n translation strings, locales, and formatting rules.
- **`permissions`**: Role-Based Access Control (RBAC) definitions, action constants, and security policies.
- **`sdk`**: Auto-generated or manually maintained internal SDKs for typed service-to-service communication.
- **`shared-types`**: Common TypeScript data models, DTOs, and utility types.
- **`tsconfig`**: Monorepo-wide TypeScript compiler configurations (base, nest, next, react).
- **`validators`**: Shared validation logic (e.g., class-validator decorators, Zod schemas) applied to both client and server inputs.
