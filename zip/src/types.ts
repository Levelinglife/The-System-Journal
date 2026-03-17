export interface UserProfile {
  streak: number;
  lastCheckin?: string;
  startDate?: string;
  score: number;
  notificationTime?: string; // HH:mm format
  naggingEnabled?: boolean;
  naggingFrequency?: number;
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: any; // Firestore Timestamp
}

export interface Journal {
  id: string;
  text: string;
  date: string;
  createdAt: any; // Firestore Timestamp
}

export interface Submission {
  id: string;
  text: string;
  proofUrl: string;
  proofType: 'url' | 'file';
  date: string;
  score: number;
  feedback: string;
  createdAt: number;
}

export interface ScoreHistory {
  date: string;
  score: number;
}
