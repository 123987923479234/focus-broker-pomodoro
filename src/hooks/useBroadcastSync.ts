import { useEffect } from 'react';
import { usePomodoroStore } from '../store/usePomodoroStore';

export function useBroadcastSync() {
  const currentTask = usePomodoroStore((state) => state.currentTask);
  const timer = usePomodoroStore((state) => state.timer);

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('luxury-pomodoro-sync');
    channel.postMessage({ type: 'snapshot', currentTask, timer });
    return () => channel.close();
  }, [currentTask, timer]);
}
