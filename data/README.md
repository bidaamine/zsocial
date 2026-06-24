# Data Platform Layer


> This folder is intentionally documentation-only for now. It defines ownership, responsibilities, data flow, and future implementation boundaries. No application code is included in this generated structure.



This folder documents database ownership, data flows, storage technologies, privacy rules, and analytics architecture.

NEXUS uses polyglot persistence because each data type has different access patterns:

- PostgreSQL for transactional product data.
- Neo4j or graph database for social, family, company, and professional graph relationships.
- TimescaleDB/InfluxDB for time-series health, wearable, emotional, activity, and financial trend data.
- Vector DB for AI memory and retrieval.
- Redis for cache, sessions, and realtime state.
- Object storage for files, media, documents, and datasets.
- Data lake and warehouse for analytics, feature generation, and privacy-preserving aggregate intelligence.
