# Auth Service


> **Status**: Fully implemented. This service forms part of the core NEXUS Foundation Layer and contains live application code.



## Responsibility

Central identity, sessions, MFA, device trust, OAuth, passkeys, account recovery, and identity risk checks.

## Interactions

This service should communicate through stable APIs and event contracts. It should emit domain events to the event bus where downstream AI, analytics, notifications, or audit systems need to react.

## Data sensitivity

Each service must classify data as public, internal, personal, sensitive, child, health, financial, corporate confidential, or regulated before storing or sharing it.
