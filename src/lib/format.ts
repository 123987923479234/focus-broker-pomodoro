export function formatTimer(ms: number, includeMs = false) {
  const safeMs = Math.max(0, ms);
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = Math.floor((safeMs % 1000) / 10);
  const base = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return includeMs ? `${base}.${String(millis).padStart(2, '0')}` : base;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sameDay(timestamp: number, date: string) {
  if (!date) return true;
  return new Date(timestamp).toISOString().slice(0, 10) === date;
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function humanMinutes(ms: number) {
  return Math.round(ms / 60000);
}

export function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    coding: '编码',
    writing: '写作',
    learning: '学习',
    planning: '规划',
    research: '研究',
    other: '其他',
  };
  return labels[category] ?? category;
}

export function difficultyLabel(difficulty: string) {
  const labels: Record<string, string> = {
    simple: '简单',
    medium: '中等',
    hard: '困难',
  };
  return labels[difficulty] ?? difficulty;
}
