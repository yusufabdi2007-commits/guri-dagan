export type Platform = "TikTok" | "YouTube" | "Instagram" | "Facebook";
export type ContentStatus = "Idea" | "Recorded" | "Edited" | "Posted";
export type VideoStatus = "Recorded" | "Editing" | "Edited" | "Posted";
export type ContentCategory =
  | "Parenting Tips"
  | "Communication"
  | "Child Development"
  | "Family Peace"
  | "Islamic Parenting"
  | "Teen Parenting"
  | "Early Childhood"
  | "Motivation"
  | "Q&A"
  | "Story";

export interface ContentIdea {
  id: string;
  user_id: string;
  title: string;
  hook: string;
  platform: Platform;
  category: ContentCategory;
  status: ContentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  title: string;
  status: VideoStatus;
  platform: Platform;
  url?: string;
  thumbnail_url?: string;
  recorded_at?: string;
  edited_at?: string;
  posted_at?: string;
  notes?: string;
  idea_id?: string;
  created_at: string;
  views?: number;
  likes?: number;
  saves?: number;
  comments?: number;
  performance_notes?: string;
}

export interface CalendarItem {
  id: string;
  user_id: string;
  idea_id?: string;
  title: string;
  scheduled_date: string;
  status: ContentStatus;
  platform: Platform;
  created_at: string;
}

export interface DailyCompletion {
  id: string;
  user_id: string;
  completed_date: string;
  platform: Platform;
  video_id?: string;
  notes?: string;
  created_at: string;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_post_date: string | null;
  total_posts: number;
}

export interface DashboardStats {
  videos_this_week: number;
  pending_videos: number;
  current_streak: number;
  longest_streak: number;
  total_posts: number;
  ideas_count: number;
  consistency_score: number;
}

export interface GeneratedContent {
  hooks: string[];
  titles: string[];
  captions: string[];
  script: string;
  cta: string[];
  hashtags: string[];
}

export interface GenerateRequest {
  topic: string;
  platform: Platform;
  tone: string;
  audience: string;
}
