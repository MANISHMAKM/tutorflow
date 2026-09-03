export type UserRole = 'tutor' | 'student';

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'ai_reviewed';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  created_at?: string;
}

export interface StudentProfile {
  id: string;
  tutor_id: string;
  name: string;
  subject: string;
  current_level: string;
  learning_goals: string[];
  weak_areas: string[];
  created_at?: string;
  user?: UserProfile;
}

export interface Session {
  id: string;
  tutor_id: string;
  student_id: string;
  scheduled_at: string;
  duration_minutes: number;
  topic: string;
  status: SessionStatus;
  created_at?: string;
  student?: StudentProfile;
  tutor?: UserProfile;
}

export interface SessionNotes {
  session_id: string;
  content: string;
  updated_at: string;
}

export interface HomeworkTask {
  task: string;
  description: string;
}

export interface Debrief {
  session_id: string;
  summary: string;
  homework: HomeworkTask[];
  next_focus: string;
  created_at?: string;
}

export interface SessionPlan {
  session_id: string;
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
  created_at?: string;
}

export interface StudentHomeworkItem {
  id: string;
  student_id: string;
  session_id: string;
  task: string;
  completed: boolean;
  created_at?: string;
}

export interface ProgressSummaryResult {
  summary: string;
  key_improvements: string[];
  persistent_weaknesses: string[];
  recommended_strategy: string;
}
