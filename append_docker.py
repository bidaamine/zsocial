  nexus_object_storage:
    image: minio/minio:RELEASE.2023-09-07T02-05-02Z
    container_name: nexus_object_storage
    environment:
      MINIO_ROOT_USER: nexus
      MINIO_ROOT_PASSWORD: password123
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  nexus_timeseries_db:
    image: timescale/timescaledb:latest-pg15
    container_name: nexus_timeseries_db
    environment:
      POSTGRES_USER: nexus_ts
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: nexus_telemetry
    ports:
      - "5433:5432"
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
