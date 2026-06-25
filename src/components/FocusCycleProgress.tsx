import { Coffee, TimerReset } from 'lucide-react';
import { usePomodoroStore } from '../store/usePomodoroStore';

export function FocusCycleProgress() {
  const timer = usePomodoroStore((state) => state.timer);
  const settings = usePomodoroStore((state) => state.settings);
  const rounds = Math.max(2, settings.roundsBeforeLongBreak);
  const completed = timer.mode === 'longBreak' ? rounds : timer.cycleIndex % rounds;
  const currentRound = timer.mode === 'focus' ? Math.min(rounds, completed + 1) : completed;
  const nextBreakLabel = (completed + 1) % rounds === 0 || timer.mode === 'longBreak'
    ? `长休息 ${settings.longBreakMinutes}m`
    : `短休息 ${settings.breakMinutes}m`;

  return (
    <div className="cycle-progress" aria-label="番茄循环进度">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-300">
        <span>循环进度</span>
        <span>{timer.mode === 'longBreak' ? '长休息' : `第 ${currentRound || 1}/${rounds} 轮`}</span>
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${rounds}, minmax(0, 1fr))` }}>
        {Array.from({ length: rounds }, (_, index) => {
          const done = index < completed;
          const active = timer.mode === 'focus' && index === completed;
          return (
            <div key={index} className={`cycle-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
              <TimerReset size={14} />
              <span>{index + 1}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.45] px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
        <span>{timer.mode === 'focus' ? '本轮结束后' : '当前休息'}</span>
        <span className="inline-flex items-center gap-1"><Coffee size={14} />{nextBreakLabel}</span>
      </div>
    </div>
  );
}

