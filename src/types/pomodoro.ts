export type TimerMode = 'focus' | 'shortBreak' | 'longBreak' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type Difficulty = 'simple' | 'medium' | 'hard';
export type ThemeMode = 'system' | 'day' | 'night';
export type TaskCategory = 'coding' | 'writing' | 'learning' | 'planning' | 'research' | 'other';
export type VisualScene = 'focusDefault' | 'blueLakeTulips' | 'mistForest' | 'rainWindow' | 'starLake';
export type AudioScene = 'rainKeyboard' | 'softRain' | 'forestStream' | 'lofiPiano' | 'warmPads' | 'none';
export type TaskStatus = 'todo' | 'active' | 'done' | 'deferred';
export type ReviewCompletion = 'done' | 'partial' | 'missed';
export type EfficiencyLevel = 'low' | 'medium' | 'high';

export interface FocusTask {
  name: string;
  difficulty: Difficulty;
  category: TaskCategory;
}

export interface TodayTask extends FocusTask {
  id: string;
  estimatePomodoros: number;
  completedPomodoros: number;
  status: TaskStatus;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface EnergyPoint {
  time: number;
  value: number;
  label: string;
}

export interface ReviewNote {
  gain: string;
  blocker: string;
  completion?: ReviewCompletion;
  efficiency?: EfficiencyLevel;
  energy?: number;
  interruptionReason?: string;
  note?: string;
}

export interface PomodoroRecord {
  id: string;
  task: FocusTask;
  taskId?: string | null;
  startedAt: number;
  endedAt: number;
  focusMs: number;
  plannedFocusMs?: number;
  isEffective?: boolean;
  energySeries: EnergyPoint[];
  averageEnergy: number;
  review: ReviewNote;
  extendedMinutes: number;
  interruptionCount?: number;
  cycleIndex?: number;
}

export interface PendingReview {
  task: FocusTask;
  taskId?: string | null;
  startedAt: number;
  endedAt: number;
  focusMs: number;
  plannedFocusMs?: number;
  isEffective?: boolean;
  energySeries: EnergyPoint[];
  extendedMinutes: number;
  interruptionCount: number;
  cycleIndex: number;
}

export interface HistoryFilters {
  date: string;
  category: TaskCategory | 'all';
  minMinutes: number;
}

export interface TimerSnapshot {
  mode: TimerMode;
  status: TimerStatus;
  durationMs: number;
  startedAt: number | null;
  endsAt: number | null;
  pausedRemainingMs: number | null;
  extendedMinutes: number;
  cycleIndex: number;
  interruptions: number;
}
