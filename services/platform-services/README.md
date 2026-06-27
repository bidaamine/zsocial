# Platform Services

This folder contains the core backend microservices that power the NEXUS platform. These services run independently of the edge gateways and handle specific business domains.

## Folder Structure and Responsibilities

### Core & Identity
- **`auth-service`**: Handles authentication (JWT generation/validation), identity management, OAuth integrations, and MFA.
- **`user-profile-service`**: Manages user profiles, preferences, avatars, and biographical data.
- **`consent-service`**: Manages user consents, GDPR tracking, opt-ins, and caches permissions in Redis for rapid verification.

### Privacy, Security & Compliance
- **`privacy-engine`**: Handles PII anonymization, Differential Privacy noise injection, and coordinates GDPR "Right to be Forgotten" cascading deletion queues.
- **`security-agent`**: Provides Threat Detection, Zero-Knowledge Proof (ZKP) payload encryption for protected demographics (e.g., minors), and anomaly detection.
- **`audit-observability-service`**: Write-Once-Read-Many (WORM) audit logging, system telemetry, and EU AI Act-compliant AI Decision Explainability logging.
- **`audit-compliance-service`**: Processes deep compliance scans and generates legal reporting.
- **`child-safety-service`**: Enforces strict restrictions, COPPA/GDPR-K compliance, parental controls, and content filtering for minors.

### Data & Content
- **`media-file-service`**: Handles raw file uploads (Minio/S3), presigned URLs, and triggers async virus scanning pipelines.
- **`media-service`**: Processes rich media (video transcoding, image optimization, thumbnail generation).
- **`content-service`**: Manages posts, articles, feeds, and user-generated text content.
- **`search-service`**: Indexes data into ElasticSearch/Vector databases and serves complex query requests.

### Communication & Social
- **`social-relationship-service`**: Manages connections, follower graphs, and network dynamics.
- **`family-service`**: Manages family trees, household accounts, and delegate/guardian permissions.
- **`messaging-service`**: Handles direct messaging, group chats, and inbox persistence.
- **`notification-service`**: Dispatches push notifications, emails, and SMS via provider integrations.
- **`event-bus-service`**: Centralized Kafka event processing and message routing utilities.

### Business & Growth
- **`analytics-service`**: Aggregates product usage data and metrics for business intelligence.
- **`billing-service`**: Stripe/payment gateway integrations, subscriptions, and invoicing.
- **`branding-marketing-service`**: Manages dynamic branding, campaigns, and corporate whitelabeling.
- **`business-growth-service`**: CRM hooks, lead generation, and B2B user pipelines.
- **`company-service`**: B2B multi-tenant organization management and corporate hierarchies.
- **`hr-talent-service`**: Specialized module for corporate hiring, talent matching, and HR integrations.
- **`marketplace-service`**: Handles digital goods, marketplace listings, and eCommerce transactions.
- **`personal-finance-service`**: Handles user wallets, internal currency, and fintech integrations.

### Specialized Domains
- **`education-service`**: Manages courses, learning paths, and ed-tech modules.
- **`fitness-life-service`**: Manages health integrations (Apple Health/Google Fit APIs), workout tracking, and lifestyle goals.
- **`health-service`**: High-security module for handling HIPPA/GDPR-compliant health records and tele-health data.

### Platform Operations
- **`feature-flag-service`**: Dynamic configuration and A/B testing toggles.
- **`integration-service`**: Webhook dispatchers and 3rd-party API adapters.
- **`operations-command-service`**: Back-office administrative tools, user bans, and platform-wide killswitches.
- **`realtime-service`**: Internal backend logic supporting the Realtime WebSocket Gateway.
