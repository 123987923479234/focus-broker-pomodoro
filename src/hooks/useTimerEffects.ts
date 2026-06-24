import { useEffect, useRef } from 'react';
import { formatTimer } from '../lib/format';
import { usePomodoroStore } from '../store/usePomodoroStore';

function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.55);
    window.setTimeout(() => void context.close(), 700);
  } catch {
    // 浏览器可能禁止无用户手势音频，通知仍会继续尝试。
  }
}

export function useTimerEffects(remainingMs: number) {
  const timer = usePomodoroStore((state) => state.timer);
  const currentTask = usePomodoroStore((state) => state.currentTask);
  const settings = usePomodoroStore((state) => state.settings);
  const pendingReview = usePomodoroStore((state) => state.pendingReview);
  const lastReviewRef = useRef<number | null>(null);

  useEffect(() => {
    const originalTitle = '超豪华版番茄钟';
    if (timer.status === 'running' || timer.status === 'paused') {
      const phase = timer.mode === 'focus' ? '专注' : timer.mode === 'longBreak' ? '长休息' : '短休息';
      document.title = `${formatTimer(remainingMs)} · ${phase}${currentTask.name ? ` · ${currentTask.name}` : ''}`;
    } else {
      document.title = originalTitle;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [currentTask.name, remainingMs, timer.mode, timer.status]);

  useEffect(() => {
    if (!pendingReview || lastReviewRef.current === pendingReview.endedAt) return;
    lastReviewRef.current = pendingReview.endedAt;
    if (settings.notificationsEnabled) {
      playBeep();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('本轮专注完成', {
          body: `${pendingReview.task.name} · ${Math.round(pendingReview.focusMs / 60000)} 分钟，回到页面完成复盘。`,
        });
      }
    }
  }, [pendingReview, settings.notificationsEnabled]);
}
