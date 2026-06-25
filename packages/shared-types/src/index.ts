export interface User {
  id: string;
  email: string;
  name: string;
  ageGroup: 'child' | 'teen' | 'adult' | 'senior';
}

export interface Family {
  id: string;
  members: User[];
  createdAt: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  domain: 'health' | 'education' | 'finance' | 'fitness' | 'social';
  insightType: 'alert' | 'recommendation' | 'update';
  message: string;
  timestamp: string;
}
