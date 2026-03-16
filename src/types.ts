export interface UserProfile {
  streak: number;
  lastCheckin?: string;
  startDate?: string;
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
