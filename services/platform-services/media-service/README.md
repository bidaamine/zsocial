# Media Service


> This folder is intentionally documentation-only for now. It defines ownership, responsibilities, data flow, and future implementation boundaries. No application code is included in this generated structure.



## Responsibility

Image, video, voice, document, medical file, corporate asset, and AR/VR asset metadata and storage references.

## Interactions

This service should communicate through stable APIs and event contracts. It should emit domain events to the event bus where downstream AI, analytics, notifications, or audit systems need to react.

## Data sensitivity

Each service must classify data as public, internal, personal, sensitive, child, health, financial, corporate confidential, or regulated before storing or sharing it.
