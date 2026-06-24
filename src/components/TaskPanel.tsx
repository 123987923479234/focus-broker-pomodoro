import { Target } from 'lucide-react';
import type { Difficulty, TaskCategory } from '../types/pomodoro';
import { usePomodoroStore } from '../store/usePomodoroStore';

const difficulties: Array<{ value: Difficulty; label: string }> = [
  { value: 'simple', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
];

const categories: Array<{ value: TaskCategory; label: string }> = [
  { value: 'coding', label: '编码' },
  { value: 'writing', label: '写作' },
  { value: 'learning', label: '学习' },
  { value: 'planning', label: '规划' },
  { value: 'research', label: '研究' },
  { value: 'other', label: '其他' },
];

export function TaskPanel() {
  const task = usePomodoroStore((state) => state.currentTask);
  const setTask = usePomodoroStore((state) => state.setTask);
  const timer = usePomodoroStore((state) => state.timer);
  const disabled = timer.status === 'running';

  return (
    <section className="panel space-y-4" aria-labelledby="task-panel-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div id="task-panel-title" className="panel-title"><Target size={18} />当前任务</div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">用一个具体目标启动本轮专注。</p>
        </div>
        <span className="rounded-full bg-slate-950/6 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">必填</span>
      </div>

      <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        任务名称
        <input
          className="field"
          value={task.name}
          disabled={disabled}
          maxLength={36}
          placeholder="例如：完成周报分析模块"
          onChange={(event) => setTask({ name: event.target.value })}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          难度
          <select className="field" value={task.difficulty} disabled={disabled} onChange={(event) => setTask({ difficulty: event.target.value as Difficulty })}>
            {difficulties.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          类型
          <select className="field" value={task.category} disabled={disabled} onChange={(event) => setTask({ category: event.target.value as TaskCategory })}>
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
