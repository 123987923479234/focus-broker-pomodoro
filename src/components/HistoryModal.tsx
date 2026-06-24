import { CalendarDays, Filter } from 'lucide-react';
import { sameDay, humanMinutes, categoryLabel, difficultyLabel } from '../lib/format';
import { usePomodoroStore } from '../store/usePomodoroStore';
import type { TaskCategory } from '../types/pomodoro';

function completionLabel(value: string | undefined) {
  if (value === 'done') return '完成';
  if (value === 'partial') return '部分完成';
  if (value === 'missed') return '未完成';
  return '未标记';
}

function displayMinutes(ms: number) {
  if (ms <= 0) return 0;
  return Math.max(1, humanMinutes(ms));
}

const categories: Array<{ value: TaskCategory | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'coding', label: '编码' },
  { value: 'writing', label: '写作' },
  { value: 'learning', label: '学习' },
  { value: 'planning', label: '规划' },
  { value: 'research', label: '研究' },
  { value: 'other', label: '其他' },
];

export function HistoryModal() {
  const records = usePomodoroStore((state) => state.records);
  const filters = usePomodoroStore((state) => state.filters);
  const setFilters = usePomodoroStore((state) => state.setFilters);

  const filtered = records.filter((record) => {
    const categoryPass = filters.category === 'all' || record.task.category === filters.category;
    const datePass = sameDay(record.endedAt, filters.date);
    const durationPass = displayMinutes(record.focusMs) >= filters.minMinutes;
    return categoryPass && datePass && durationPass;
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border border-white/25 bg-white/35 p-4 dark:border-white/10 dark:bg-white/5 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <CalendarDays size={16} className="inline" /> 日期
          <input className="field" type="date" value={filters.date} onChange={(event) => setFilters({ date: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Filter size={16} className="inline" /> 类型
          <select className="field" value={filters.category} onChange={(event) => setFilters({ category: event.target.value as TaskCategory | 'all' })}>
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          最小时长
          <input className="field" type="number" min={0} value={filters.minMinutes} onChange={(event) => setFilters({ minMinutes: Number(event.target.value) })} />
        </label>
      </div>

      <div className="space-y-3">
        {filtered.map((record) => (
          <article key={record.id} className="record-card">
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">{record.task.name}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {new Date(record.endedAt).toLocaleString('zh-CN')} · {categoryLabel(record.task.category)} · {difficultyLabel(record.task.difficulty)}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">状态：{completionLabel(record.review.completion)} · 收获：{record.review.gain || '未填写'} / 阻碍：{record.review.blocker || '未填写'}</p>
            </div>
            <div className="text-right">
              <strong className="text-2xl text-blue-600 dark:text-blue-300">{displayMinutes(record.focusMs)}</strong>
              <p className="text-xs text-slate-500 dark:text-slate-400">分钟</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">精力 {record.averageEnergy}</p>
            </div>
          </article>
        ))}
        {!filtered.length && <div className="empty-state">还没有符合条件的番茄记录</div>}
      </div>
    </div>
  );
}
