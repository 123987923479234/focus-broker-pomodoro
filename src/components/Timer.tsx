import { motion } from 'framer-motion';
import { CheckCircle2, FastForward, Maximize2, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { formatTimer } from '../lib/format';
import { usePomodoroStore } from '../store/usePomodoroStore';
import { FocusCycleProgress } from './FocusCycleProgress';
import { ProgressRing } from './ProgressRing';

interface TimerProps {
  remainingMs: number;
  progress: number;
  isSprint: boolean;
}

function phaseLabel(mode: string) {
  if (mode === 'longBreak') return '长休息';
  if (mode === 'shortBreak' || mode === 'break') return '短休息';
  return '专注';
}

function nextStageText(mode: string, cycleIndex: number, settings: { breakMinutes: number; longBreakMinutes: number; roundsBeforeLongBreak: number }) {
  if (mode === 'longBreak') return '休息后回到第 1 轮专注';
  if (mode === 'shortBreak' || mode === 'break') return `休息后进入第 ${(cycleIndex % settings.roundsBeforeLongBreak) + 1} 轮专注`;
  const nextCompleted = cycleIndex + 1;
  return nextCompleted % settings.roundsBeforeLongBreak === 0
    ? `长休息 ${settings.longBreakMinutes} 分钟`
    : `短休息 ${settings.breakMinutes} 分钟`;
}

export function Timer({ remainingMs, progress, isSprint }: TimerProps) {
  const timer = usePomodoroStore((state) => state.timer);
  const settings = usePomodoroStore((state) => state.settings);
  const currentTaskId = usePomodoroStore((state) => state.currentTaskId);
  const tasks = usePomodoroStore((state) => state.tasks);
  const startTimer = usePomodoroStore((state) => state.startTimer);
  const pauseTimer = usePomodoroStore((state) => state.pauseTimer);
  const resumeTimer = usePomodoroStore((state) => state.resumeTimer);
  const resetTimer = usePomodoroStore((state) => state.resetTimer);
  const completeTimer = usePomodoroStore((state) => state.completeTimer);
  const skipBreak = usePomodoroStore((state) => state.skipBreak);
  const extendFocus = usePomodoroStore((state) => state.extendFocus);
  const setImmersive = usePomodoroStore((state) => state.setImmersive);
  const adaptiveSuggestion = usePomodoroStore((state) => state.adaptiveSuggestion);

  const selectedTask = tasks.find((task) => task.id === currentTaskId && task.status !== 'done');
  const suggestion = adaptiveSuggestion();
  const taskProgressText = selectedTask ? `${selectedTask.completedPomodoros}/${selectedTask.estimatePomodoros} 番茄` : '未绑定任务';
  const isBreak = timer.mode === 'shortBreak' || timer.mode === 'longBreak' || timer.mode === 'break';
  const activeTaskName = selectedTask?.name ?? '';
  const canStart = isBreak || activeTaskName.trim().length > 0;
  const color = isSprint ? '#EF4444' : isBreak ? '#16A34A' : '#2563EB';
  const statusText = timer.status === 'running' ? '进行中' : timer.status === 'paused' ? '已暂停' : timer.status === 'completed' ? '待复盘' : '待开始';
  const nextStage = nextStageText(timer.mode, timer.cycleIndex, settings);

  const handleStart = async () => {
    if (!canStart) return;
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => undefined);
    }
    startTimer(timer.mode === 'focus' ? 'focus' : timer.mode);
  };

  const handleAdaptiveStart = async () => {
    if (!activeTaskName.trim()) return;
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => undefined);
    }
    startTimer('focus', suggestion.focusMinutes);
  };

  const enterImmersive = async () => {
    setImmersive(true);
    await document.documentElement.requestFullscreen?.();
  };

  return (
    <section className="timer-shell" aria-label="番茄计时器">
      <div className="timer-meta">
        <span>{phaseLabel(timer.mode)} · {statusText}</span>
        <span>{settings.focusMinutes}/{settings.breakMinutes}/{settings.longBreakMinutes} 分钟</span>
      </div>

      <div className="timer-ring">
        <motion.div
          className="timer-ring-glow"
          animate={{ boxShadow: isSprint ? '0 0 42px rgba(239,68,68,0.18)' : isBreak ? '0 0 34px rgba(22,163,74,0.14)' : '0 0 38px rgba(37,99,235,0.16)' }}
        />
        <ProgressRing progress={progress} color={color} />
        <div className="timer-ring-content">
          <span className={`timer-phase-badge ${isSprint ? 'sprint' : ''}`}>{isSprint ? '冲刺' : phaseLabel(timer.mode)}</span>
          <motion.div
            className={`timer-time ${isSprint ? 'sprint' : ''}`}
            animate={{ scale: isSprint ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 1, repeat: isSprint ? Infinity : 0 }}
          >
            {formatTimer(remainingMs, timer.status === 'running')}
          </motion.div>
        </div>
      </div>

      <div className={`timer-current-task ${!activeTaskName && !isBreak ? 'empty' : ''}`} aria-live="polite">
        <div>
          <span>当前任务</span>
          <strong>{isBreak ? '休息恢复' : activeTaskName || '请先选择或创建一个任务'}</strong>
        </div>
        <div>
          <span>任务进度</span>
          <strong>{isBreak ? '本轮不计任务' : taskProgressText}</strong>
        </div>
        <div>
          <span>下一阶段</span>
          <strong>{nextStage}</strong>
        </div>
      </div>

      <FocusCycleProgress />

      <div className="timer-actions">
        {timer.status === 'idle' && (
          <>
            <button className="primary-button" onClick={handleStart} disabled={!canStart} title={!canStart ? '请先选择或创建一个任务' : isBreak ? '开始休息' : '开始标准番茄'}>
              <Play size={18} />{!canStart ? '先选任务' : isBreak ? '开始休息' : '开始专注'}
            </button>
            {!isBreak && (
              <button className="ghost-button" onClick={handleAdaptiveStart} disabled={!activeTaskName.trim()} title={suggestion.reason}>
                <Sparkles size={18} />应用建议 {suggestion.focusMinutes} 分钟
              </button>
            )}
          </>
        )}
        {timer.status === 'running' && (
          <>
            <button className="primary-button" onClick={() => pauseTimer('manual')}>
              <Pause size={18} />暂停
            </button>
            <button className="ghost-button" onClick={completeTimer}>
              <CheckCircle2 size={18} />{isBreak ? '结束休息' : '结束本轮'}
            </button>
          </>
        )}
        {timer.status === 'paused' && (
          <>
            <button className="primary-button" onClick={resumeTimer}>
              <Play size={18} />继续
            </button>
            <button className="ghost-button" onClick={completeTimer}>
              <CheckCircle2 size={18} />结束本轮
            </button>
          </>
        )}
        {timer.status === 'completed' && timer.mode === 'focus' && (
          <button className="primary-button" onClick={() => extendFocus(15)}>
            <Sparkles size={18} />续杯 +15
          </button>
        )}
        {isBreak && <button className="icon-button" onClick={skipBreak} aria-label="跳过休息"><FastForward size={18} /></button>}
        <button className="icon-button" onClick={resetTimer} aria-label="重置计时器">
          <RotateCcw size={18} />
        </button>
        <button className="icon-button" onClick={enterImmersive} aria-label="进入极简模式">
          <Maximize2 size={18} />
        </button>
      </div>
      {!isBreak && activeTaskName && timer.status === 'idle' && (
        <p className="timer-suggestion">{suggestion.reason}</p>
      )}
    </section>
  );
}
