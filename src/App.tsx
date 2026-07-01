import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BarChart3, History, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AmbientPanel } from './components/AmbientPanel';
import { AnalyticsModal } from './components/AnalyticsModal';
import { BreathGuide } from './components/BreathGuide';
import { GlassModal } from './components/GlassModal';
import { HistoryModal } from './components/HistoryModal';
import { IdleCheckModal } from './components/IdleCheckModal';
import { ProgressRing } from './components/ProgressRing';
import { ReviewModal } from './components/ReviewModal';
import { SettingsModal } from './components/SettingsModal';
import { ScenicBackground } from './components/ScenicBackground';
import { StatsPanel } from './components/StatsPanel';
import { TaskList } from './components/TaskList';
import { Timer } from './components/Timer';
import { listPomodoroRecords } from './lib/db';
import { formatTimer } from './lib/format';
import { isEffectivePomodoro } from './lib/pomodoroRules';
import { useAttentionGuard } from './hooks/useAttentionGuard';
import { useBroadcastSync } from './hooks/useBroadcastSync';
import { useEnergySampling } from './hooks/useEnergySampling';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePreciseTimer } from './hooks/usePreciseTimer';
import { useThemeMode } from './hooks/useThemeMode';
import { useTimerEffects } from './hooks/useTimerEffects';
import { useWhiteNoise } from './hooks/useWhiteNoise';
import { usePomodoroStore } from './store/usePomodoroStore';

function notificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function NotificationDeniedBanner() {
  const notificationsEnabled = usePomodoroStore((state) => state.settings.notificationsEnabled);
  const [permission, setPermission] = useState(notificationPermission);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const update = () => setPermission(notificationPermission());
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [notificationsEnabled]);

  if (!notificationsEnabled || permission !== 'denied' || dismissed) return null;

  return (
    <div className="notification-banner" role="status">
      <AlertTriangle size={16} />
      <span>通知权限已关闭，阶段结束不会弹出提醒。可在浏览器设置中重新开启。</span>
      <button type="button" onClick={() => setDismissed(true)} aria-label="关闭通知提示"><X size={15} /></button>
    </div>
  );
}

function modalTitle(activeModal: ReturnType<typeof usePomodoroStore.getState>['activeModal']) {
  if (activeModal === 'settings') return '设置与白名单';
  if (activeModal === 'history') return '历史记录';
  if (activeModal === 'analytics') return '数据总览';
  if (activeModal === 'review') return '本轮复盘';
  if (activeModal === 'idle-check') return '专注确认';
  return '';
}

function ModalContent() {
  const activeModal = usePomodoroStore((state) => state.activeModal);
  if (activeModal === 'settings') return <SettingsModal />;
  if (activeModal === 'history') return <HistoryModal />;
  if (activeModal === 'analytics') return <AnalyticsModal />;
  if (activeModal === 'review') return <ReviewModal />;
  if (activeModal === 'idle-check') return <IdleCheckModal />;
  return null;
}

function ImmersiveOverlay({ remainingMs, progress, isSprint }: { remainingMs: number; progress: number; isSprint: boolean }) {
  const timer = usePomodoroStore((state) => state.timer);
  const currentTask = usePomodoroStore((state) => state.currentTask);
  const setImmersive = usePomodoroStore((state) => state.setImmersive);
  const color = isSprint ? '#EF4444' : timer.mode === 'focus' ? '#2563EB' : '#16A34A';

  return (
    <motion.main className="immersive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setImmersive(false)}>
      <div className="text-center">
        <div className="relative mx-auto aspect-square w-[min(76vw,520px)]">
          <ProgressRing progress={progress} color={color} size={520} stroke={20} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`font-display text-[clamp(3.5rem,12vw,8rem)] font-black tabular-nums ${isSprint ? 'text-red-400' : 'text-white'}`}>
              {formatTimer(remainingMs, true)}
            </div>
          </div>
        </div>
        <p className="mt-5 text-sm font-bold text-slate-300">{currentTask.name}</p>
      </div>
    </motion.main>
  );
}

export default function App() {
  const clock = usePreciseTimer();
  const settings = usePomodoroStore((state) => state.settings);
  const timer = usePomodoroStore((state) => state.timer);
  const records = usePomodoroStore((state) => state.records);
  const tasks = usePomodoroStore((state) => state.tasks);
  const setRecords = usePomodoroStore((state) => state.setRecords);
  const activeModal = usePomodoroStore((state) => state.activeModal);
  const openModal = usePomodoroStore((state) => state.openModal);
  const closeModal = usePomodoroStore((state) => state.closeModal);
  const isImmersive = usePomodoroStore((state) => state.isImmersive);
  const setImmersive = usePomodoroStore((state) => state.setImmersive);

  useThemeMode();
  useAttentionGuard();
  useEnergySampling();
  useBroadcastSync();
  useTimerEffects(clock.remainingMs);
  const whiteNoiseScene = settings.audioScene === 'none' ? 'none' : 'rainKeyboard';
  useWhiteNoise({ enabled: settings.whiteNoiseEnabled && timer.status === 'running', volume: settings.baseVolume, decay: clock.isFinalFive, scene: whiteNoiseScene });

  useEffect(() => {
    listPomodoroRecords().then(setRecords).catch(() => setRecords([]));
  }, [setRecords]);

  useEffect(() => {
    const syncFullscreen = () => setImmersive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, [setImmersive]);

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayRecords = records.filter((record) => new Date(record.endedAt).toDateString() === today);
    const effectiveRecords = todayRecords.filter(isEffectivePomodoro);
    return {
      pomodoros: effectiveRecords.length,
      minutes: todayRecords.reduce((sum, record) => sum + (record.focusMs > 0 ? Math.max(1, Math.round(record.focusMs / 60000)) : 0), 0),
      doneTasks: tasks.filter((task) => task.status === 'done').length,
    };
  }, [records, tasks]);

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-950 dark:text-white">
      <AnimatePresence>{isImmersive && <ImmersiveOverlay remainingMs={clock.remainingMs} progress={clock.progress} isSprint={clock.isSprint} />}</AnimatePresence>

      <ScenicBackground />
      <main className="app-shell">
        <header className="compact-header">
          <div className="brand-line">
            <strong>Focus Broker</strong>
            <span>用任务驱动番茄钟，让每一轮专注都有记录和复盘。</span>
          </div>
          <div className="top-stats" aria-label="今日概览">
            <span><b>{todayStats.pomodoros}</b> 轮</span>
            <span><b>{todayStats.minutes}</b> 分钟</span>
            <span><b>{todayStats.doneTasks}</b> 项完成</span>
          </div>
          <nav className="toolbar" aria-label="全局操作">
            <button className="icon-button" onClick={() => openModal('analytics')} aria-label="打开数据统计" title="数据统计"><BarChart3 size={18} /><span>统计</span></button>
            <button className="icon-button" onClick={() => openModal('history')} aria-label="打开历史记录" title="历史记录"><History size={18} /><span>历史</span></button>
            <button className="icon-button" onClick={() => openModal('settings')} aria-label="打开设置" title="设置"><Settings size={18} /><span>设置</span></button>
          </nav>
        </header>
        <NotificationDeniedBanner />

        <motion.div className={`workbench-grid ${settings.minimalMode ? 'minimal' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
          <div className="workbench-main">
            <Timer remainingMs={clock.remainingMs} progress={clock.progress} isSprint={clock.isSprint} />
            <BreathGuide />
          </div>
          <aside className="workbench-side">
            <TaskList />
          </aside>
          {!settings.minimalMode && (
            <>
              <div className="workbench-stats"><StatsPanel /></div>
              <div className="workbench-ambient"><AmbientPanel /></div>
            </>
          )}
        </motion.div>
      </main>

      <AnimatePresence>
        {activeModal && (
          <GlassModal title={modalTitle(activeModal)} onClose={closeModal} wide={activeModal === 'history' || activeModal === 'analytics'}>
            <ModalContent />
          </GlassModal>
        )}
      </AnimatePresence>
    </div>
  );
}
