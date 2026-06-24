import type { PomodoroRecord, ReviewNote } from '../types/pomodoro';

export const EFFECTIVE_POMODORO_RATIO = 0.8;
export const DEFAULT_PLANNED_FOCUS_MS = 25 * 60 * 1000;

export function plannedFocusMsOf(item: Pick<PomodoroRecord, 'plannedFocusMs' | 'focusMs'>) {
  return item.plannedFocusMs ?? DEFAULT_PLANNED_FOCUS_MS;
}

export function isEffectivePomodoro(item: Pick<PomodoroRecord, 'focusMs' | 'plannedFocusMs' | 'review' | 'isEffective'>) {
  if (typeof item.isEffective === 'boolean') return item.isEffective;
  if (item.review.completion === 'missed') return false;
  const planned = plannedFocusMsOf(item);
  return planned > 0 && item.focusMs >= planned * EFFECTIVE_POMODORO_RATIO;
}

export function effectivePomodoroFromReview(focusMs: number, plannedFocusMs: number, review: ReviewNote) {
  return review.completion !== 'missed' && plannedFocusMs > 0 && focusMs >= plannedFocusMs * EFFECTIVE_POMODORO_RATIO;
}

export function effectiveRuleText() {
  return '有效番茄：完成或部分完成，且实际专注达到本轮设定时长的 80%。删除任务只移出当前列表，历史统计继续保留。';
}

