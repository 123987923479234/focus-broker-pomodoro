import { useEffect, useRef } from 'react';
import { usePomodoroStore } from '../store/usePomodoroStore';

const IDLE_LIMIT_MS = 30 * 1000;

export function useAttentionGuard() {
  const timer = usePomodoroStore((state) => state.timer);
  const pauseTimer = usePomodoroStore((state) => state.pauseTimer);
  const openModal = usePomodoroStore((state) => state.openModal);
  const lastActiveAt = useRef(Date.now());

  useEffect(() => {
    const markActive = () => {
      lastActiveAt.current = Date.now();
    };
    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, markActive));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (timer.status !== 'running' || timer.mode !== 'focus') return;
      if (Date.now() - lastActiveAt.current < IDLE_LIMIT_MS) return;
      pauseTimer();
      openModal('idle-check');
      lastActiveAt.current = Date.now();
    }, 1000);
    return () => window.clearInterval(id);
  }, [openModal, pauseTimer, timer.mode, timer.status]);
}
