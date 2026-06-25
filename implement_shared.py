import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"

# 1. shared-types
st_dir = os.path.join(base_dir, "packages", "shared-types", "src")
os.makedirs(st_dir, exist_ok=True)
with open(os.path.join(st_dir, "index.ts"), "w") as f:
    f.write("""export interface User {
  id: string;
  email: string;
  name: string;
  ageGroup: 'child' | 'teen' | 'adult' | 'senior';
  isActive: boolean;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  members: string[]; // User IDs
  createdAt: string;
}

export interface TelemetryEvent {
  id: string;
  service: string;
  metric: string;
  value: number;
  tags: Record<string, string>;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  resourceId: string;
  timestamp: string;
  metadata?: any;
}

export interface StandardError {
  code: string;
  message: string;
  status: number;
  timestamp: string;
}
""")

# 2. api-contracts
ac_dir = os.path.join(base_dir, "packages", "api-contracts", "src")
os.makedirs(ac_dir, exist_ok=True)
with open(os.path.join(ac_dir, "index.ts"), "w") as f:
    f.write("""export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface PaginationDto {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}
""")

# 3. design-tokens
dt_dir = os.path.join(base_dir, "packages", "design-tokens", "src")
os.makedirs(dt_dir, exist_ok=True)
with open(os.path.join(dt_dir, "index.ts"), "w") as f:
    f.write("""export const colors = {
  primary: {
    DEFAULT: '#3b82f6',
    dark: '#2563eb',
    light: '#60a5fa',
  },
  secondary: {
    DEFAULT: '#10b981',
    dark: '#059669',
    light: '#34d399',
  },
  background: '#0f172a',
  surface: '#1e293b',
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  }
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

export const typography = {
  fontFamily: "Inter, -apple-system, sans-serif",
  sizes: {
    sm: '12px',
    base: '16px',
    lg: '20px',
    xl: '24px',
    h1: '32px',
  }
};
""")

# 4. Append to docker-compose.yml
docker_file = os.path.join(base_dir, "infra", "local", "docker-compose.yml")
with open(docker_file, "a") as f:
    f.write("""
  nexus_flink_stream_processor:
    image: flink:1.17
    container_name: nexus_flink_jobmanager
    ports:
      - "8081:8081"
    command: jobmanager
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: nexus_flink_jobmanager

  nexus_data_warehouse:
    image: clickhouse/clickhouse-server:23.8
    container_name: nexus_data_warehouse
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
""")

print("Successfully wrote shared packages and docker append logic!")
