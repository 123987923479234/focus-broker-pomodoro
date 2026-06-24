import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AudioScene,
  Difficulty,
  EnergyPoint,
  FocusTask,
  HistoryFilters,
  PendingReview,
  PomodoroRecord,
  ReviewNote,
  TaskCategory,
  TaskStatus,
  ThemeMode,
  TimerMode,
  TimerSnapshot,
  TodayTask,
  VisualScene,
} from '../types/pomodoro';
import { average, clamp } from '../lib/format';
import { effectivePomodoroFromReview } from '../lib/pomodoroRules';

type ModalName = 'settings' | 'history' | 'analytics' | 'review' | 'idle-check' | null;

interface SettingsState {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  roundsBeforeLongBreak: number;
  autoStartBreak: boolean;
  autoStartNextFocus: boolean;
  notificationsEnabled: boolean;
  minimalMode: boolean;
  ambienceExpanded: boolean;
  themeMode: ThemeMode;
  whiteNoiseEnabled: boolean;
  audioScene: AudioScene;
  visualScene: VisualScene;
  baseVolume: number;
  whitelist: string[];
}

interface PomodoroStore {
  timer: TimerSnapshot;
  settings: SettingsState;
  tasks: TodayTask[];
  currentTaskId: string | null;
  currentTask: FocusTask;
  currentEnergy: number;
  energySeries: EnergyPoint[];
  pendingReview: PendingReview | null;
  records: PomodoroRecord[];
  filters: HistoryFilters;
  activeModal: ModalName;
  isImmersive: boolean;
  hydrated: boolean;
  adaptiveSuggestion: () => { focusMinutes: number; breakMinutes: number; reason: string };
  setHydrated: (hydrated: boolean) => void;
  setTask: (task: Partial<FocusTask>) => void;
  addTask: (task: { name: string; category?: TaskCategory; difficulty?: Difficulty; estimatePomodoros?: number }) => void;
  updateTask: (id: string, task: Partial<TodayTask>) => void;
  deleteTask: (id: string) => void;
  selectTask: (id: string) => void;
  markTaskDone: (id: string) => void;
  reorderTask: (id: string, direction: -1 | 1) => void;
  setEnergy: (value: number) => void;
  setSettings: (settings: Partial<SettingsState>) => void;
  addWhitelistSite: (site: string) => void;
  removeWhitelistSite: (site: string) => void;
  setRecords: (records: PomodoroRecord[]) => void;
  addRecord: (record: PomodoroRecord) => void;
  setFilters: (filters: Partial<HistoryFilters>) => void;
  openModal: (name: ModalName) => void;
  closeModal: () => void;
  setImmersive: (value: boolean) => void;
  startTimer: (mode?: TimerMode, durationMinutes?: number) => void;
  pauseTimer: (reason?: string) => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  completeTimer: () => void;
  skipBreak: () => void;
  extendFocus: (minutes: number) => void;
  finishReview: (review: ReviewNote) => PendingReview | null;
}

const defaultTask: FocusTask = {
  name: '',
  difficulty: 'medium',
  category: 'coding',
};

const defaultSettings: SettingsState = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreak: false,
  autoStartNextFocus: false,
  notificationsEnabled: true,
  minimalMode: false,
  ambienceExpanded: false,
  themeMode: 'system',
  whiteNoiseEnabled: false,
  audioScene: 'rainKeyboard',
  visualScene: 'blueLakeTulips',
  baseVolume: 0.36,
  whitelist: ['notion.so', 'github.com'],
};


function categoryName(category: TaskCategory) {
  const names: Record<TaskCategory, string> = {
    coding: '编码',
    writing: '写作',
    learning: '学习',
    planning: '规划',
    research: '研究',
    other: '其他',
  };
  return names[category];
}
const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const createIdleTimer = (focusMinutes = 25, cycleIndex = 0): TimerSnapshot => ({
  mode: 'focus',
  status: 'idle',
  durationMs: focusMinutes * 60 * 1000,
  startedAt: null,
  endsAt: null,
  pausedRemainingMs: null,
  extendedMinutes: 0,
  cycleIndex,
  interruptions: 0,
});

function getSelectableTask(tasks: TodayTask[], currentTaskId: string | null) {
  const selected = tasks.find((task) => task.id === currentTaskId && task.status !== 'done');
  return selected ?? tasks.find((task) => task.status === 'active') ?? tasks.find((task) => task.status === 'todo') ?? null;
}

function selectedTaskFrom(state: Pick<PomodoroStore, 'tasks' | 'currentTaskId' | 'currentTask'>): FocusTask {
  const selected = getSelectableTask(state.tasks, state.currentTaskId);
  return selected ? { name: selected.name, category: selected.category, difficulty: selected.difficulty } : defaultTask;
}

function nextBreakMode(completedFocusCount: number, roundsBeforeLongBreak: number): TimerMode {
  return completedFocusCount > 0 && completedFocusCount % roundsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';
}

function durationForMode(settings: SettingsState, mode: TimerMode) {
  if (mode === 'focus') return settings.focusMinutes;
  if (mode === 'longBreak') return settings.longBreakMinutes;
  return settings.breakMinutes;
}

function startSnapshot(mode: TimerMode, minutes: number, cycleIndex: number): TimerSnapshot {
  const now = Date.now();
  const durationMs = minutes * 60 * 1000;
  return {
    mode,
    status: 'running',
    durationMs,
    startedAt: now,
    endsAt: now + durationMs,
    pausedRemainingMs: null,
    extendedMinutes: 0,
    cycleIndex,
    interruptions: 0,
  };
}

function idleSnapshot(mode: TimerMode, minutes: number, cycleIndex: number): TimerSnapshot {
  return {
    mode,
    status: 'idle',
    durationMs: minutes * 60 * 1000,
    startedAt: null,
    endsAt: null,
    pausedRemainingMs: null,
    extendedMinutes: 0,
    cycleIndex,
    interruptions: 0,
  };
}


function taskSnapshot(tasks: TodayTask[], currentTaskId: string | null, fallback: FocusTask): FocusTask {
  const selected = getSelectableTask(tasks, currentTaskId);
  return selected ? { name: selected.name, category: selected.category, difficulty: selected.difficulty } : fallback;
}

function restoredPendingFromTimer(timer: TimerSnapshot, tasks: TodayTask[], currentTaskId: string | null, currentTask: FocusTask): PendingReview {
  const endedAt = timer.endsAt ?? Date.now();
  const startedAt = timer.startedAt ?? endedAt - timer.durationMs;
  return {
    task: taskSnapshot(tasks, currentTaskId, currentTask),
    taskId: currentTaskId,
    startedAt,
    endedAt,
    focusMs: Math.max(0, endedAt - startedAt),
    plannedFocusMs: timer.durationMs,
    energySeries: [],
    extendedMinutes: timer.extendedMinutes,
    interruptionCount: timer.interruptions,
    cycleIndex: timer.cycleIndex + 1,
  };
}

function shouldOpenRestoredReview(timer?: TimerSnapshot, pendingReview?: PendingReview | null) {
  if (pendingReview) return true;
  return Boolean(timer?.status === 'running' && timer.mode === 'focus' && timer.endsAt && Date.now() >= timer.endsAt);
}

function restorePendingReview(timer: TimerSnapshot | undefined, pendingReview: PendingReview | null | undefined, tasks: TodayTask[], currentTaskId: string | null, currentTask: FocusTask) {
  if (pendingReview) return pendingReview;
  if (timer?.status === 'running' && timer.mode === 'focus' && timer.endsAt && Date.now() >= timer.endsAt) {
    return restoredPendingFromTimer(timer, tasks, currentTaskId, currentTask);
  }
  return null;
}

function restoreTimer(timer: TimerSnapshot | undefined, pendingReview: PendingReview | null | undefined, settings: SettingsState, tasks: TodayTask[], currentTaskId: string | null, currentTask: FocusTask) {
  if (!timer) return createIdleTimer(settings.focusMinutes);
  const now = Date.now();
  if (pendingReview) return { ...timer, status: 'completed' as const, endsAt: null, pausedRemainingMs: 0 };
  if (timer.status === 'running' && timer.endsAt && now >= timer.endsAt) {
    if (timer.mode === 'focus') {
      return { ...timer, status: 'completed' as const, endsAt: null, pausedRemainingMs: 0, cycleIndex: timer.cycleIndex + 1 };
    }
    const nextCycle = timer.mode === 'longBreak' ? 0 : timer.cycleIndex;
    return idleSnapshot('focus', settings.focusMinutes, nextCycle);
  }
  if (timer.status === 'idle' && timer.mode === 'focus') return { ...timer, durationMs: settings.focusMinutes * 60 * 1000 };
  return timer;
}

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      timer: createIdleTimer(),
      settings: defaultSettings,

      tasks: [],
      currentTaskId: null,
      currentTask: defaultTask,
      currentEnergy: 7,
      energySeries: [],
      pendingReview: null,
      records: [],
      filters: { date: '', category: 'all', minMinutes: 0 },
      activeModal: null,
      isImmersive: false,
      hydrated: false,

      adaptiveSuggestion: () => {
        const state = get();
        const task = getSelectableTask(state.tasks, state.currentTaskId);
        const hour = new Date().getHours();
        const energy = state.currentEnergy;
        let focusMinutes = hour >= 8 && hour < 12 ? 45 : hour >= 13 && hour < 18 ? 35 : 20;
        if (task?.difficulty === 'hard') focusMinutes += 5;
        if (task?.difficulty === 'simple') focusMinutes -= 5;
        if (energy <= 4) focusMinutes = Math.min(focusMinutes, 20);
        if (energy >= 8 && task?.difficulty !== 'simple') focusMinutes += 5;
        focusMinutes = clamp(focusMinutes, 15, 50);
        const difficultyText = task?.difficulty === 'hard' ? '困难' : task?.difficulty === 'simple' ? '简单' : '中等';
        const reason = task
          ? `根据当前精力 ${energy}/10、${difficultyText}难度和${categoryName(task.category)}类任务建议 ${focusMinutes} 分钟。`
          : `未选择任务时按当前时段给出 ${focusMinutes} 分钟快速时长。`;
        return { focusMinutes, breakMinutes: Math.max(5, Math.round(focusMinutes / 5)), reason };
      },
      setHydrated: (hydrated) => set({ hydrated }),
      setTask: (task) => set((state) => {
        const nextTask = { ...state.currentTask, ...task };
        const tasks = state.currentTaskId
          ? state.tasks.map((item) => (item.id === state.currentTaskId ? { ...item, ...task, updatedAt: Date.now() } : item))
          : state.tasks;
        return { currentTask: nextTask, tasks };
      }),
      addTask: (task) => set((state) => {
        const now = Date.now();
        const shouldSelect = !getSelectableTask(state.tasks, state.currentTaskId);
        const newTask: TodayTask = {
          id: makeId(),
          name: task.name.trim(),
          category: task.category ?? 'coding',
          difficulty: task.difficulty ?? 'medium',
          estimatePomodoros: clamp(task.estimatePomodoros ?? 1, 1, 12),
          completedPomodoros: 0,
          status: shouldSelect ? 'active' : 'todo',
          priority: state.tasks.length,
          createdAt: now,
          updatedAt: now,
        };
        if (!newTask.name) return state;
        return {
          tasks: [...state.tasks, newTask],
          currentTaskId: shouldSelect ? newTask.id : state.currentTaskId,
          currentTask: shouldSelect ? { name: newTask.name, category: newTask.category, difficulty: newTask.difficulty } : state.currentTask,
        };
      }),
      updateTask: (id, task) => set((state) => {
        const tasks = state.tasks.map((item) => (item.id === id ? { ...item, ...task, updatedAt: Date.now() } : item));
        const selected = tasks.find((item) => item.id === state.currentTaskId);
        return {
          tasks,
          currentTask: selected ? { name: selected.name, category: selected.category, difficulty: selected.difficulty } : state.currentTask,
        };
      }),
      deleteTask: (id) => set((state) => {
        const tasks = state.tasks.filter((task) => task.id !== id).map((task, index) => ({ ...task, priority: index }));
        if (state.currentTaskId !== id) return { tasks };
        const nextTask = getSelectableTask(tasks, null);
        return {
          tasks,
          currentTaskId: nextTask?.id ?? null,
          currentTask: nextTask ? { name: nextTask.name, category: nextTask.category, difficulty: nextTask.difficulty } : defaultTask,
        };
      }),
      selectTask: (id) => set((state) => {
        const selected = state.tasks.find((task) => task.id === id);
        if (!selected || selected.status === 'done') return state;
        return {
          currentTaskId: id,
          currentTask: { name: selected.name, category: selected.category, difficulty: selected.difficulty },
          tasks: state.tasks.map((task) => ({
            ...task,
            status: task.id === id ? 'active' : task.status === 'active' ? 'todo' : task.status,
            updatedAt: task.id === id ? Date.now() : task.updatedAt,
          })),
        };
      }),
      markTaskDone: (id) => set((state) => {
        const tasks = state.tasks.map((task) => (task.id === id ? { ...task, status: 'done' as TaskStatus, completedPomodoros: Math.max(task.completedPomodoros, task.estimatePomodoros), updatedAt: Date.now() } : task));
        if (state.currentTaskId !== id) return { tasks };
        const nextTask = getSelectableTask(tasks, null);
        return {
          tasks,
          currentTaskId: nextTask?.id ?? null,
          currentTask: nextTask ? { name: nextTask.name, category: nextTask.category, difficulty: nextTask.difficulty } : defaultTask,
        };
      }),
      reorderTask: (id, direction) => set((state) => {
        const tasks = [...state.tasks].sort((a, b) => a.priority - b.priority);
        const index = tasks.findIndex((task) => task.id === id);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= tasks.length) return state;
        const [item] = tasks.splice(index, 1);
        tasks.splice(nextIndex, 0, item);
        return { tasks: tasks.map((task, priority) => ({ ...task, priority, updatedAt: task.id === id ? Date.now() : task.updatedAt })) };
      }),
      setEnergy: (value) => {
        const nextValue = clamp(value, 1, 10);
        set((state) => {
          const shouldSample = state.timer.status === 'running' && state.timer.mode === 'focus';
          const point: EnergyPoint = {
            time: Date.now(),
            value: nextValue,
            label: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
          return {
            currentEnergy: nextValue,
            energySeries: shouldSample ? [...state.energySeries.slice(-80), point] : state.energySeries,
          };
        });
      },
      setSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings },
        timer: state.timer.status === 'idle' && state.timer.mode === 'focus' && settings.focusMinutes
          ? { ...state.timer, durationMs: settings.focusMinutes * 60 * 1000 }
          : state.timer,
      })),
      addWhitelistSite: (site) => {
        const normalized = site.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
        if (!normalized) return;
        set((state) => ({
          settings: {
            ...state.settings,
            whitelist: Array.from(new Set([...state.settings.whitelist, normalized])),
          },
        }));
      },
      removeWhitelistSite: (site) => set((state) => ({
        settings: { ...state.settings, whitelist: state.settings.whitelist.filter((item) => item !== site) },
      })),
      setRecords: (records) => set({ records }),
      addRecord: (record) => set((state) => ({ records: [record, ...state.records] })),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      openModal: (name) => set({ activeModal: name }),
      closeModal: () => set((state) => ({ activeModal: state.activeModal === 'review' ? state.activeModal : null })),
      setImmersive: (value) => set({ isImmersive: value }),

      startTimer: (mode = 'focus', durationMinutes) => {
        const state = get();
        if (mode === 'focus' && !selectedTaskFrom(state).name.trim()) return;
        const normalizedMode = mode === 'break' ? nextBreakMode(Math.max(1, state.timer.cycleIndex), state.settings.roundsBeforeLongBreak) : mode;
        const minutes = durationMinutes ?? durationForMode(state.settings, normalizedMode);
        const timer = startSnapshot(normalizedMode, minutes, normalizedMode === 'focus' ? state.timer.cycleIndex : state.timer.cycleIndex);
        const now = timer.startedAt ?? Date.now();
        set({
          timer,
          energySeries: normalizedMode === 'focus'
            ? [{ time: now, value: state.currentEnergy, label: new Date(now).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]
            : state.energySeries,
          pendingReview: null,
          activeModal: null,
        });
      },
      pauseTimer: () => set((state) => {
        if (state.timer.status !== 'running' || !state.timer.endsAt) return state;
        return {
          timer: {
            ...state.timer,
            status: 'paused',
            interruptions: state.timer.mode === 'focus' ? state.timer.interruptions + 1 : state.timer.interruptions,
            pausedRemainingMs: Math.max(0, state.timer.endsAt - Date.now()),
            endsAt: null,
          },
        };
      }),
      resumeTimer: () => set((state) => {
        if (state.timer.status !== 'paused' || state.timer.pausedRemainingMs == null) return state;
        const now = Date.now();
        return {
          timer: {
            ...state.timer,
            status: 'running',
            endsAt: now + state.timer.pausedRemainingMs,
            pausedRemainingMs: null,
          },
          activeModal: state.activeModal === 'idle-check' ? null : state.activeModal,
        };
      }),
      resetTimer: () => set((state) => ({
        timer: createIdleTimer(state.settings.focusMinutes, state.timer.mode === 'longBreak' ? 0 : state.timer.cycleIndex),
        energySeries: [],
        pendingReview: null,
        activeModal: null,
      })),
      completeTimer: () => set((state) => {
        if (state.timer.status !== 'running' && state.timer.status !== 'paused') return state;
        const endedAt = Date.now();
        if (state.timer.mode !== 'focus') {
          const nextCycle = state.timer.mode === 'longBreak' ? 0 : state.timer.cycleIndex;
          const shouldAutoFocus = state.settings.autoStartNextFocus && selectedTaskFrom(state).name.trim().length > 0;
          return {
            timer: shouldAutoFocus
              ? startSnapshot('focus', state.settings.focusMinutes, nextCycle)
              : idleSnapshot('focus', state.settings.focusMinutes, nextCycle),
            activeModal: null,
          };
        }
        const startedAt = state.timer.startedAt ?? endedAt - state.timer.durationMs;
        const focusMs = Math.max(0, endedAt - startedAt);
        const currentTask = selectedTaskFrom(state);
        const completedFocusCount = state.timer.cycleIndex + 1;
        return {
          timer: { ...state.timer, status: 'completed', endsAt: null, pausedRemainingMs: 0, cycleIndex: completedFocusCount },
          pendingReview: {
            task: currentTask,
            taskId: state.currentTaskId,
            startedAt,
            endedAt,
            focusMs,
            plannedFocusMs: state.timer.durationMs,
            energySeries: state.energySeries,
            extendedMinutes: state.timer.extendedMinutes,
            interruptionCount: state.timer.interruptions,
            cycleIndex: completedFocusCount,
          },
          activeModal: 'review',
        };
      }),
      skipBreak: () => set((state) => {
        const nextCycle = state.timer.mode === 'longBreak' ? 0 : state.timer.cycleIndex;
        return { timer: idleSnapshot('focus', state.settings.focusMinutes, nextCycle), activeModal: null };
      }),
      extendFocus: (minutes) => set((state) => {
        const now = Date.now();
        const extraMs = minutes * 60 * 1000;
        return {
          timer: {
            ...state.timer,
            mode: 'focus',
            status: 'running',
            durationMs: state.timer.durationMs + extraMs,
            startedAt: state.timer.startedAt ?? now,
            endsAt: now + extraMs,
            pausedRemainingMs: null,
            extendedMinutes: state.timer.extendedMinutes + minutes,
          },
          pendingReview: null,
          activeModal: null,
        };
      }),
      finishReview: (review) => {
        const state = get();
        const pending = state.pendingReview;
        if (!pending) return null;
        const breakMode = nextBreakMode(pending.cycleIndex, state.settings.roundsBeforeLongBreak);
        const breakMinutes = durationForMode(state.settings, breakMode);
        const timer = state.settings.autoStartBreak
          ? startSnapshot(breakMode, breakMinutes, pending.cycleIndex)
          : idleSnapshot(breakMode, breakMinutes, pending.cycleIndex);
        const effectivePomodoro = effectivePomodoroFromReview(pending.focusMs, pending.plannedFocusMs ?? pending.focusMs, review);
        const shouldCountPomodoro = effectivePomodoro && review.completion !== 'missed';
        const updatedTasks = state.tasks.map((task) => {
          if (task.id !== pending.taskId) return task;
          const completedPomodoros = shouldCountPomodoro ? Math.min(task.completedPomodoros + 1, task.estimatePomodoros) : task.completedPomodoros;
          const status: TaskStatus = effectivePomodoro && review.completion === 'done' ? 'done' : 'active';
          return { ...task, completedPomodoros, status, updatedAt: Date.now() };
        });
        const completedCurrent = updatedTasks.find((task) => task.id === pending.taskId)?.status === 'done';
        const nextTask = completedCurrent ? getSelectableTask(updatedTasks, null) : getSelectableTask(updatedTasks, pending.taskId ?? state.currentTaskId);
        const normalizedTasks = updatedTasks.map((task) => ({
          ...task,
          status: task.id === nextTask?.id && task.status !== 'done' ? 'active' : task.status === 'active' && task.id !== nextTask?.id ? 'todo' : task.status,
        }));
        set({
          pendingReview: null,
          timer,
          activeModal: null,
          tasks: normalizedTasks,
          currentTaskId: nextTask?.id ?? null,
          currentTask: nextTask ? { name: nextTask.name, category: nextTask.category, difficulty: nextTask.difficulty } : defaultTask,
        });
        return { ...pending, isEffective: effectivePomodoro };
      },
    }),
    {
      name: 'luxury-pomodoro-state',
      partialize: (state) => ({
        settings: state.settings,
        tasks: state.tasks,
        currentTaskId: state.currentTaskId,
        currentTask: state.currentTask,
        currentEnergy: state.currentEnergy,
        filters: state.filters,
        timer: state.timer,
        pendingReview: state.pendingReview,
        energySeries: state.energySeries,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<PomodoroStore> | undefined;
        const settings = { ...defaultSettings, ...(saved?.settings ?? {}) };
        let tasks = saved?.tasks ?? current.tasks;
        let currentTask = saved?.currentTask ?? current.currentTask;
        let currentTaskId = saved?.currentTaskId ?? current.currentTaskId;
        if (!tasks.length && currentTask.name.trim()) {
          const now = Date.now();
          const restoredTask: TodayTask = {
            id: makeId(),
            name: currentTask.name,
            category: currentTask.category,
            difficulty: currentTask.difficulty,
            estimatePomodoros: 1,
            completedPomodoros: 0,
            status: 'active',
            priority: 0,
            createdAt: now,
            updatedAt: now,
          };
          tasks = [restoredTask];
          currentTaskId = restoredTask.id;
        }
        const selected = getSelectableTask(tasks, currentTaskId);
        currentTaskId = selected?.id ?? null;
        currentTask = selected ? { name: selected.name, category: selected.category, difficulty: selected.difficulty } : defaultTask;
        return {
          ...current,
          ...saved,
          settings,
          tasks,
          currentTaskId,
          currentTask,
          timer: restoreTimer(saved?.timer, saved?.pendingReview, settings, tasks, currentTaskId, currentTask),
          pendingReview: restorePendingReview(saved?.timer, saved?.pendingReview, tasks, currentTaskId, currentTask),
          activeModal: shouldOpenRestoredReview(saved?.timer, saved?.pendingReview) ? 'review' : current.activeModal,
        };
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

export function createRecordFromReview(pending: PendingReview, review: ReviewNote): PomodoroRecord {
  const energyValues = pending.energySeries.map((point) => point.value);
  return {
    id: makeId(),
    task: pending.task,
    taskId: pending.taskId,
    startedAt: pending.startedAt,
    endedAt: pending.endedAt,
    focusMs: pending.focusMs,
    plannedFocusMs: pending.plannedFocusMs,
    isEffective: pending.isEffective ?? effectivePomodoroFromReview(pending.focusMs, pending.plannedFocusMs ?? pending.focusMs, review),
    energySeries: pending.energySeries,
    averageEnergy: Number(average(energyValues).toFixed(1)),
    review,
    extendedMinutes: pending.extendedMinutes,
    interruptionCount: pending.interruptionCount,
    cycleIndex: pending.cycleIndex,
  };
}












