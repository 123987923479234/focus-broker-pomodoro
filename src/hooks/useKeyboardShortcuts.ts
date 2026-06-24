import { useEffect } from 'react';
import { usePomodoroStore } from '../store/usePomodoroStore';

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function useKeyboardShortcuts() {
  const timer = usePomodoroStore((state) => state.timer);
  const currentTaskId = usePomodoroStore((state) => state.currentTaskId);
  const tasks = usePomodoroStore((state) => state.tasks);
  const startTimer = usePomodoroStore((state) => state.startTimer);
  const pauseTimer = usePomodoroStore((state) => state.pauseTimer);
  const resumeTimer = usePomodoroStore((state) => state.resumeTimer);
  const resetTimer = usePomodoroStore((state) => state.resetTimer);
  const completeTimer = usePomodoroStore((state) => state.completeTimer);
  const skipBreak = usePomodoroStore((state) => state.skipBreak);
  const setImmersive = usePomodoroStore((state) => state.setImmersive);
  const isImmersive = usePomodoroStore((state) => state.isImmersive);

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (timer.status === 'running') pauseTimer('keyboard');
        else if (timer.status === 'paused') resumeTimer();
        else if (timer.status === 'idle' && (timer.mode !== 'focus' || tasks.some((task) => task.id === currentTaskId && task.status !== 'done'))) startTimer(timer.mode);
      }
      if (event.key.toLowerCase() === 'r') resetTimer();
      if (event.key.toLowerCase() === 'n') {
        if (timer.mode === 'focus') completeTimer();
        else skipBreak();
      }
      if (event.key.toLowerCase() === 'f') {
        const next = !isImmersive;
        setImmersive(next);
        if (next) await document.documentElement.requestFullscreen?.();
        else if (document.fullscreenElement) await document.exitFullscreen?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [completeTimer, currentTaskId, isImmersive, pauseTimer, resetTimer, resumeTimer, setImmersive, skipBreak, startTimer, tasks, timer.mode, timer.status]);
}

