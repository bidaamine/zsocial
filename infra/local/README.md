# Local Infrastructure Access Guide

This document provides a quick reference for accessing all the local infrastructure containers running via Docker Compose.

> [!NOTE]
> Only the **UI/Console** links can be opened in a web browser. The database and messaging ports use custom TCP protocols (like Bolt, RESP, or Postgres wire protocol) and must be accessed using their respective CLI tools or database clients (e.g., DBeaver, DataGrip, or psql).

## 🗄️ Relational & Timeseries Databases

### PostgreSQL (`nexus_postgresql`)
**Purpose:** Primary relational database for core application state, user profiles, authentication, and structured business data.
- **Port:** `5434` (Database Protocol)
- **Username:** `nexus`
- **Password:** `password`
- **Database:** `nexus_db`
- **Access Command:** `psql -h localhost -p 5434 -U nexus -d nexus_db`

### TimescaleDB (`nexus_timeseries_db`)
**Purpose:** Time-series database built on PostgreSQL, optimized for fast ingest and complex queries of telemetry, metrics, and temporal data.
- **Port:** `5433` (Database Protocol)
- **Username:** `nexus_ts`
- **Password:** `password123`
- **Database:** `nexus_telemetry`
- **Access Command:** `psql -h localhost -p 5433 -U nexus_ts -d nexus_telemetry`

---

## 📊 Graph & Vector Databases

### Neo4j (`nexus_neo4j_graph_db`)
**Purpose:** Graph database for mapping complex, highly-connected data such as family trees, user relationships, and social graphs.
- **Browser UI:** [http://localhost:7474](http://localhost:7474) *(Clickable in browser)*
- **Bolt Port:** `7687` (Database Protocol)
- **Username:** `neo4j`
- **Password:** `password`

### Milvus Vector DB (`nexus_vector_db`)
**Purpose:** Highly scalable vector database for storing and querying AI embeddings, powering semantic search, and recommendation engines.
- **gRPC API Port:** `19530` (gRPC Protocol)
- **Management Port:** [http://localhost:9091](http://localhost:9091) *(Metrics/Management API)*

---

## 🚀 Data Warehouse & Caching

### ClickHouse (`nexus_data_warehouse`)
**Purpose:** Fast columnar data warehouse for massive analytical queries, reporting, and storing immutable audit logs.
- **HTTP Port:** [http://localhost:8123](http://localhost:8123) *(HTTP API)*
- **Native Port:** `9009` (Database Protocol)
- **Access Command:** `clickhouse-client --host localhost --port 9009`

### Redis Cache (`nexus_redis_cache`)
**Purpose:** In-memory data structure store used as a high-performance cache, session store, and rate limiter.
- **Port:** `6379` (RESP Protocol)
- **Access Command:** `redis-cli -h localhost -p 6379`

---

## 💾 Object Storage & Streaming

### MinIO Object Storage (`nexus_object_storage`)
**Purpose:** S3-compatible object storage for unstructured data such as media uploads, avatars, documents, and backups.
- **Console UI:** [http://localhost:9001](http://localhost:9001) *(Clickable in browser)*
- **API Port:** [http://localhost:9000](http://localhost:9000) *(S3 API)*
- **Username (Access Key):** `nexus`
- **Password (Secret Key):** `password123`

### Kafka Event Stream (`nexus_kafka_event_stream`)
**Purpose:** Distributed event streaming platform for reliable, asynchronous microservice communication and real-time data pipelines.
- **Broker Port:** `9092` (Kafka Protocol)
- **Internal Port:** `29092` (used for internal docker network communication)

### Flink Stream Processor (`nexus_flink_jobmanager`)
**Purpose:** Distributed processing engine for stateful computations over unbounded real-time data streams and complex event processing.
- **Dashboard UI:** [http://localhost:8081](http://localhost:8081) *(Clickable in browser)*
