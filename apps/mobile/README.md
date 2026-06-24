# Flutter Mobile Application


> This folder is intentionally documentation-only for now. It defines ownership, responsibilities, data flow, and future implementation boundaries. No application code is included in this generated structure.



The mobile app is the native iOS/Android experience. It should prioritize the Life Hub, AI companion, notifications, family safety, health insights, and daily orchestration.

## Mobile-specific priorities

- Bottom tab navigation.
- Floating AI companion button.
- Swipeable AI briefing cards.
- Quick actions for health, family, tasks, learning, and messages.
- Secure biometric unlock for sensitive domains.
- Offline-friendly shell for daily tasks and cached briefing summaries.
- Push notification intelligence.

## Key screens

- Onboarding.
- Personal dashboard.
- AI chat with Life Orchestrator.
- Health overview.
- Education/tutor screen.
- Fitness/recovery screen.
- Family Hub.
- Child Safe Mode.
- Digital Twin activity log.
- Memory timeline.
- Notification centre.
- Corporate mode screens for SMB owners and employees.

## Boundaries

Flutter should consume APIs from `apps/api` and should not call Python AI services directly. Sensitive actions should be confirmed and auditable.
