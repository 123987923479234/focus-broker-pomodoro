import { useEffect, useMemo, useRef, useState } from 'react';
import { usePomodoroStore } from '../store/usePomodoroStore';

export function usePreciseTimer() {
  const timer = usePomodoroStore((state) => state.timer);
  const completeTimer = usePomodoroStore((state) => state.completeTimer);
  const [now, setNow] = useState(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    if (timer.status !== 'running') {
      completedRef.current = false;
      setNow(Date.now());
      return;
    }

    let frame = 0;
    const tick = () => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (timer.endsAt && nextNow >= timer.endsAt && !completedRef.current) {
        completedRef.current = true;
        completeTimer();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [completeTimer, timer.endsAt, timer.status]);

  return useMemo(() => {
    const remainingMs = timer.status === 'running' && timer.endsAt
      ? Math.max(0, timer.endsAt - now)
      : timer.pausedRemainingMs ?? timer.durationMs;
    const progress = timer.durationMs > 0 ? 1 - remainingMs / timer.durationMs : 0;
    const isSprint = timer.mode === 'focus' && remainingMs <= 3 * 60 * 1000 && timer.status !== 'idle';
    const isFinalFive = timer.mode === 'focus' && remainingMs <= 5 * 60 * 1000 && timer.status === 'running';

    return {
      now,
      remainingMs,
      progress: Math.min(1, Math.max(0, progress)),
      isSprint,
      isFinalFive,
    };
  }, [now, timer]);
}
