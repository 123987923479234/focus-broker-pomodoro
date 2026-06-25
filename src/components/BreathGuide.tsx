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
  const [expanded, setExpanded] = useState(false);

  const isBreak = timer.mode === 'shortBreak' || timer.mode === 'longBreak' || timer.mode === 'break';

  useEffect(() => {
    if (!isBreak) {
      setExpanded(false);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [isBreak, timer.status]);

  const phase = useMemo(() => {
    const total = cycle.reduce((sum, item) => sum + item.seconds, 0);
    let position = elapsed % total;
    for (const item of cycle) {
      if (position < item.seconds) return item;
      position -= item.seconds;
    }
    return cycle[0];
  }, [elapsed]);

  if (!isBreak) return null;

  return (
    <section className="break-guide" aria-label="休息提示">
      <div className="break-guide-summary">
        <div className="break-guide-title"><Wind size={17} /><span>休息提示</span></div>
        <strong>{phase.name} · 4-7-8</strong>
        <button className="ghost-button" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? '收起呼吸引导' : '展开呼吸引导'}
        </button>
      </div>

      {expanded && (
        <div className="breath-detail">
          <div className="breath-orb" aria-hidden="true">
            <div />
          </div>
          <div>
            <div className="breath-phase">{phase.name}</div>
            <p>按 4 秒吸气、7 秒屏息、8 秒呼气恢复节奏。</p>
          </div>
        </div>
      )}
    </section>
  );
}
