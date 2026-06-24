import { useEffect } from 'react';
import { usePomodoroStore } from '../store/usePomodoroStore';

export function useEnergySampling() {
  const timer = usePomodoroStore((state) => state.timer);
  const currentEnergy = usePomodoroStore((state) => state.currentEnergy);
  const setEnergy = usePomodoroStore((state) => state.setEnergy);

  useEffect(() => {
    if (timer.status !== 'running' || timer.mode !== 'focus') return;
    const id = window.setInterval(() => setEnergy(currentEnergy), 10_000);
    return () => window.clearInterval(id);
  }, [currentEnergy, setEnergy, timer.mode, timer.status]);
}
