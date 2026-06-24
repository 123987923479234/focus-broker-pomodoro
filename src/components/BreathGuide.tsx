import { useEffect, useMemo, useState } from 'react';
import { Wind } from 'lucide-react';
import { usePomodoroStore } from '../store/usePomodoroStore';

const cycle = [
  { name: '吸气', seconds: 4 },
  { name: '屏息', seconds: 7 },
  { name: '呼气', seconds: 8 },
];

export function BreathGuide() {
  const timer = usePomodoroStore((state) => state.timer);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (timer.mode !== 'shortBreak' && timer.mode !== 'longBreak' && timer.mode !== 'break') return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [timer.mode, timer.status]);

  const phase = useMemo(() => {
    const total = cycle.reduce((sum, item) => sum + item.seconds, 0);
    let position = elapsed % total;
    for (const item of cycle) {
      if (position < item.seconds) return item;
      position -= item.seconds;
    }
    return cycle[0];
  }, [elapsed]);

  if (timer.mode !== 'shortBreak' && timer.mode !== 'longBreak' && timer.mode !== 'break') return null;

  return (
    <section className="panel flex min-h-72 flex-col items-center justify-center text-center">
      <div className="panel-title mb-5"><Wind size={18} />呼吸引导</div>
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-breathe" />
        <div className="absolute inset-7 rounded-full border border-emerald-300/50" />
        <div className="relative text-center">
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">{phase.name}</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">4 · 7 · 8</div>
        </div>
      </div>
    </section>
  );
}

