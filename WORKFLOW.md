# NEXUS AI End-to-End Workflow

This file maps how the system works from frontend to database, including backend services, AI services, memory, event streaming, security, and user-visible responses.

## 1. Standard Frontend to Database Flow

```text
User action in Next.js / Flutter
        ↓
Client state + validation
        ↓
API request to NestJS API Gateway
        ↓
Authentication + permission check
        ↓
Business module / platform service
        ↓
Database read/write
        ↓
Response DTO / event emission
        ↓
Frontend renders updated state
```

### Example: User opens the Personal Dashboard

1. The frontend requests the user's dashboard summary.
2. NestJS validates the access token and loads user permissions.
3. The dashboard module queries user profile, family state, recent activity, health summaries, learning progress, tasks, and AI briefing records.
4. The API calls the AI Orchestrator only if fresh intelligence is required.
5. The response returns as a structured dashboard payload.
6. The frontend shows prioritized insight cards, module panels, and recommended actions.

## 2. AI Request Flow

```text
Frontend request
        ↓
NestJS API Gateway
        ↓
Permission + consent check
        ↓
AI Orchestrator Python service
        ↓
Context and memory retrieval
        ↓
Domain AI service selection
        ↓
LLM router / fine-tuned model / prediction model
        ↓
Safety, policy, explainability checks
        ↓
Structured AI response
        ↓
NestJS stores audit log and returns response
        ↓
Frontend displays answer + explanation
```

### Example: “Should I train today?”

1. Mobile app sends the question to the API.
2. API validates identity and wearable-data consent.
3. AI Orchestrator identifies a cross-domain decision.
4. It calls:
   - Health AI for sleep, HRV, illness risk, and recovery indicators.
   - Fitness + Life AI for current training plan and adaptation logic.
   - Emotional AI for stress and cognitive load.
   - Memory AI for previous injuries, preferences, and long-term goals.
5. The Orchestrator resolves conflicts and returns one recommendation.
6. API stores the AI decision, reason summary, and user-visible audit trail.
7. Mobile shows the recommendation with confidence and “why this was suggested.”

## 3. Background Orchestration Flow

The document describes the Life Orchestrator as always-on and proactive. In implementation, this should be handled by event-driven and scheduled workflows.

```text
Scheduled trigger / event stream
        ↓
AI Orchestrator checks user state
        ↓
Fetches health, calendar, finance, education, family, social signals
        ↓
Builds or updates life-state model
        ↓
Ranks urgency, importance, and emotional readiness
        ↓
Creates insight, notification, draft action, or escalation
        ↓
Writes result to database and event bus
        ↓
Notification service decides when/how to deliver
```

## 4. Event-Driven Data Flow

```text
User event / device event / corporate event
        ↓
Kafka or event bus
        ↓
Stream processor
        ↓
Feature store + operational DBs
        ↓
AI prediction service
        ↓
Analytics warehouse
        ↓
Dashboards and model retraining pipelines
```

Events should be immutable, auditable, and privacy-tagged. Every event should carry tenant/user context, consent classification, data sensitivity classification, and retention policy.

## 5. Memory Flow

```text
Conversation / action / milestone / document
        ↓
Memory classification
        ↓
PII and consent check
        ↓
Summarization into episodic memory
        ↓
Embedding generation
        ↓
Vector DB storage
        ↓
Long-term semantic memory update
        ↓
Retrieval during future AI tasks
```

Memory is central to Digital Twin, Generational Memory, personalization, and cross-domain intelligence. It must never become hidden surveillance; the user needs visibility, editing controls, deletion controls, and an audit trail.

## 6. Corporate Command Flow

```text
Company user opens Command Centre
        ↓
NestJS corporate API validates company role
        ↓
Corporate services fetch operations, HR, finance, marketing, CRM signals
        ↓
AI Operations service scores organizational health
        ↓
AI Orchestrator prioritizes alerts
        ↓
Dashboard shows recommended actions, not only data
```

## 7. Notification Intelligence Flow

```text
New alert / insight / AI action
        ↓
Notification service classifies urgency
        ↓
Emotional AI checks user state
        ↓
Focus/calendar/family safety rules applied
        ↓
Delivery decision: immediate, delayed, grouped, or suppressed
        ↓
User receives notification with one-tap action
```

High-urgency health, safety, and child-protection events bypass normal suppression. Low-priority engagement notifications should be delayed or bundled.

## 8. Security and Consent Flow

```text
Every request
        ↓
Identity verification
        ↓
Authorization check
        ↓
Consent policy check
        ↓
Data sensitivity classification
        ↓
Service execution
        ↓
Audit event written
```

Health data, child data, financial data, and emotional state data must be treated as high-sensitivity data. Child data should receive the strictest controls.

## 9. Deployment Flow

```text
Developer change
        ↓
CI pipeline
        ↓
Static checks + tests + security scans
        ↓
Build container / package
        ↓
Deploy to staging
        ↓
Smoke test + AI safety evals
        ↓
Progressive production rollout
        ↓
Observability and rollback monitoring
```

## 10. MVP Workflow Priority

Build the first version around:

1. Auth and user profiles.
2. Personal dashboard.
3. AI Life Orchestrator basic briefing.
4. Health Advisor basic summary.
5. Education Engine basic learner profile.
6. Family Hub basic parent/child account structure.
7. Corporate profile and basic brand builder.
8. AI memory foundation.
9. Audit logs and consent controls.
10. Notifications.
