# AI Agent Workflow

## Request-time AI

```text
User asks a question
        ↓
API validates user, consent, and domain access
        ↓
AI Orchestrator receives normalized request
        ↓
Memory service retrieves relevant context
        ↓
Model router selects model/service
        ↓
Domain agents produce candidate outputs
        ↓
Orchestrator resolves conflicts
        ↓
Safety/evaluation layer checks response
        ↓
Explainability summary created
        ↓
Result returned to API and logged
```

## Background AI

Background AI is used for proactive briefings, predictions, health trend alerts, learning recommendations, campaign optimizations, and corporate command centre alerts.

```text
Event or schedule trigger
        ↓
State fetch from data stores
        ↓
Feature computation
        ↓
Domain model inference
        ↓
Priority ranking
        ↓
Notification/action/audit creation
```
