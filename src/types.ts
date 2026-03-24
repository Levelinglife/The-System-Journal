export interface UserProfile {
  streak: number;
  lastCheckin?: string;
  startDate?: string;
  score: number;
  notificationTime?: string; // HH:mm — Wake / Day Start Time
  sleepTime?: string; // HH:mm — Sleep / Day End Time
  workStart?: string; // HH:mm — Active hours start
  workEnd?: string; // HH:mm — Active hours end
  naggingEnabled?: boolean;
  naggingFrequency?: number;
  weeklyReviewDay?: number; // 0-6 (0=Sunday)
  weeklyReviewTime?: string; // HH:mm
  graceDaysUsed?: number; // out of 1 per 7 days
  lastGraceDayWeek?: string; // ISO week identifier
  goalStreak?: number; // Streak for achieving all goals
  lastGoalCheckin?: string; // Date of last goal completion
  quotas?: {
    learning: number; // in minutes, default 60
    entertainment: number; // in minutes, default 60
  };
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: any; // Firestore Timestamp
  deadline?: string; // yyyy-MM-dd (optional)
  priority?: 'low' | 'medium' | 'high'; // optional
}

export interface Journal {
  id: string;
  text: string;
  date: string;
  createdAt: any; // Firestore Timestamp
}

export interface InputLog {
  id: string;
  category: string; // Games, YouTube, Manga/Comics, Instagram, Other
  subcategory?: string; // News, Learning, Podcast, Entertainment
  durationMinutes: number;
  date: string;
  scoreImpact: number; // Negative or 0
  mood?: number; // 1-5 emoji scale (optional)
  createdAt: number;
}

export interface Submission {
  id: string;
  category: string; // Thought, Writing, Scripting, Video Editing, Website/Code, Problem Solving, New Skill, House Chores, Fitness, Other
  text: string;
  proofUrl: string;
  proofType: 'url' | 'file' | 'none';
  date: string;
  score: number;
  feedback: string;
  mood?: number; // 1-5 emoji scale (optional)
  createdAt: number;
  // Fitness specific
  fitnessType?: string; // Cardio, Strength, Yoga, Sport, Walk
  fitnessIntensity?: 'Low' | 'Medium' | 'High';
  durationMinutes?: number;
}

export interface ScoreHistory {
  date: string;
  score: number;
}

// Constants
export const INPUT_CATEGORIES = [
  { id: 'games', label: 'Games', icon: '🎮' },
  { id: 'youtube', label: 'YouTube', icon: '📺' },
  { id: 'manga', label: 'Manga/Comics', icon: '📖' },
  { id: 'instagram', label: 'Instagram', icon: '📱' },
  { id: 'other', label: 'Other', icon: '💬' },
] as const;

export const YOUTUBE_SUBCATEGORIES = [
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'learning', label: 'Learning', icon: '🎓' },
  { id: 'podcast', label: 'Podcast', icon: '🎙' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎭' },
] as const;

export const OUTPUT_CATEGORIES = [
  { id: 'thought', label: 'Thought', icon: '💭', baseScore: 5 },
  { id: 'writing', label: 'Writing', icon: '✍️', baseScore: 15 },
  { id: 'scripting', label: 'Scripting', icon: '📜', baseScore: 15 },
  { id: 'video-editing', label: 'Video Editing', icon: '🎬', baseScore: 20 },
  { id: 'website', label: 'Website/Code', icon: '🌐', baseScore: 25 },
  { id: 'problem-solving', label: 'Problem Solving', icon: '🔧', baseScore: 15 },
  { id: 'new-skill', label: 'New Skill', icon: '📚', baseScore: 20 },
  { id: 'house-chores', label: 'House Chores', icon: '🏠', baseScore: 8 },
  { id: 'fitness', label: 'Fitness', icon: '💪', baseScore: 15 },
  { id: 'other', label: 'Other', icon: '🎨', baseScore: 10 },
] as const;

export const FITNESS_TYPES = ['Cardio', 'Strength', 'Yoga', 'Sport', 'Walk'] as const;

export const DURATION_PRESETS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h+', value: 120 },
] as const;

export const MOOD_EMOJIS = ['😩', '😕', '😐', '🙂', '😃'] as const;

export function getInputScoreImpact(
  category: string,
  subcategory: string | undefined,
  durationMinutes: number,
  usedMinutesToday: number,
  quotaMinutes: number
): number {
  // YouTube Learning is always neutral
  if (category === 'youtube' && subcategory === 'learning') return 0;

  const overQuota = usedMinutesToday + durationMinutes > quotaMinutes;
  const overAmount = overQuota ? (usedMinutesToday + durationMinutes - quotaMinutes) : 0;
  const underAmount = Math.min(durationMinutes, Math.max(0, quotaMinutes - usedMinutesToday));

  let underRate = 0; // pts per 15 min below quota
  let overRate = 0;  // pts per 15 min over quota

  if (category === 'youtube' && (subcategory === 'podcast' || subcategory === 'news')) {
    underRate = -0.5;
    overRate = -2;
  } else {
    // Games, Instagram, YouTube Entertainment, Manga, Other
    underRate = -1;
    overRate = category === 'youtube' ? -4 : -5;
  }

  const underPenalty = Math.floor(underAmount / 15) * underRate;
  const overPenalty = overQuota ? Math.ceil(overAmount / 15) * overRate : 0;

  return Math.round(underPenalty + overPenalty);
}
