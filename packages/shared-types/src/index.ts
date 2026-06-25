export interface User {
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
