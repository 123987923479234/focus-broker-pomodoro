import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AlertTriangle, Bell, Clock, Database, Download, FileUp, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { clearPomodoroRecords, savePomodoroRecords } from '../lib/db';
import { usePomodoroStore } from '../store/usePomodoroStore';
import type { Difficulty, EfficiencyLevel, EnergyPoint, PomodoroRecord, ReviewCompletion, ReviewNote, TaskCategory } from '../types/pomodoro';

function notificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validEnergy(value: unknown): value is number {
  return finiteNumber(value) && value >= 1 && value <= 10;
}

const categories = new Set<TaskCategory>(['coding', 'writing', 'learning', 'planning', 'research', 'other']);
const difficulties = new Set<Difficulty>(['simple', 'medium', 'hard']);
const completions = new Set<ReviewCompletion>(['done', 'partial', 'missed']);
const efficiencies = new Set<EfficiencyLevel>(['low', 'medium', 'high']);

function stringIfPresent(value: unknown, field: string, index: number) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error(`第 ${index + 1} 条记录的 ${field} 必须是文本。`);
  return value;
}

function normalizeReview(review: Record<string, unknown>, index: number): ReviewNote {
  const completion = review.completion;
  const efficiency = review.efficiency;
  const energy = review.energy;

  if (completion !== undefined && !completions.has(completion as ReviewCompletion)) {
    throw new Error(`第 ${index + 1} 条记录的 review.completion 不是有效状态。`);
  }
  if (efficiency !== undefined && !efficiencies.has(efficiency as EfficiencyLevel)) {
    throw new Error(`第 ${index + 1} 条记录的 review.efficiency 不是有效状态。`);
  }
  if (energy !== undefined && !validEnergy(energy)) {
    throw new Error(`第 ${index + 1} 条记录的 review.energy 必须是 1 到 10。`);
  }

  return {
    gain: stringIfPresent(review.gain, 'review.gain', index) ?? '',
    blocker: stringIfPresent(review.blocker, 'review.blocker', index) ?? '',
    completion: completion as ReviewCompletion | undefined,
    efficiency: efficiency as EfficiencyLevel | undefined,
    energy: energy as number | undefined,
    interruptionReason: stringIfPresent(review.interruptionReason, 'review.interruptionReason', index),
    note: stringIfPresent(review.note, 'review.note', index),
  };
}

function normalizeEnergySeries(value: unknown, index: number) {
  if (!Array.isArray(value)) throw new Error(`第 ${index + 1} 条记录的 energySeries 必须是数组。`);
  return value.flatMap((point): EnergyPoint[] => {
    if (!isObject(point) || !finiteNumber(point.time) || !validEnergy(point.value)) return [];
    return [{ time: point.time, value: point.value, label: typeof point.label === 'string' ? point.label : '' }];
  });
}

function normalizeRecord(value: unknown, index: number): PomodoroRecord {
  if (!isObject(value)) throw new Error(`第 ${index + 1} 条记录不是有效对象。`);
  const task = value.task;
  const reviewValue = value.review;

  if (typeof value.id !== 'string' || !value.id.trim()) throw new Error(`第 ${index + 1} 条记录缺少有效 id。`);
  if (!isObject(task)) throw new Error(`第 ${index + 1} 条记录缺少 task 对象。`);
  if (!isObject(reviewValue)) throw new Error(`第 ${index + 1} 条记录缺少 review 对象。`);
  if (typeof task.name !== 'string' || !task.name.trim()) throw new Error(`第 ${index + 1} 条记录的 task.name 不能为空。`);
  if (!categories.has(task.category as TaskCategory)) throw new Error(`第 ${index + 1} 条记录的 task.category 不受支持。`);
  if (!difficulties.has(task.difficulty as Difficulty)) throw new Error(`第 ${index + 1} 条记录的 task.difficulty 不受支持。`);
  if (!finiteNumber(value.startedAt) || value.startedAt <= 0) throw new Error(`第 ${index + 1} 条记录的 startedAt 无效。`);
  if (!finiteNumber(value.endedAt) || value.endedAt <= 0) throw new Error(`第 ${index + 1} 条记录的 endedAt 无效。`);
  if (value.endedAt < value.startedAt) throw new Error(`第 ${index + 1} 条记录的 endedAt 不能早于 startedAt。`);
  if (!finiteNumber(value.focusMs) || value.focusMs < 0) throw new Error(`第 ${index + 1} 条记录的 focusMs 无效。`);
  if (value.focusMs > value.endedAt - value.startedAt + 5000) throw new Error(`第 ${index + 1} 条记录的 focusMs 超出开始和结束时间范围。`);
  if (value.plannedFocusMs !== undefined && (!finiteNumber(value.plannedFocusMs) || value.plannedFocusMs < 0)) {
    throw new Error(`第 ${index + 1} 条记录的 plannedFocusMs 无效。`);
  }

  const review = normalizeReview(reviewValue, index);
  const energySeries = normalizeEnergySeries(value.energySeries, index);
  const averageEnergy = validEnergy(value.averageEnergy)
    ? value.averageEnergy
    : validEnergy(review.energy)
      ? review.energy
      : energySeries.length
        ? energySeries.reduce((sum, point) => sum + point.value, 0) / energySeries.length
        : 0;

  return {
    id: value.id,
    task: {
      name: task.name.trim(),
      category: task.category as TaskCategory,
      difficulty: task.difficulty as Difficulty,
    },
    taskId: typeof value.taskId === 'string' || value.taskId === null ? value.taskId : undefined,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    focusMs: value.focusMs,
    plannedFocusMs: finiteNumber(value.plannedFocusMs) ? value.plannedFocusMs : value.focusMs,
    isEffective: typeof value.isEffective === 'boolean' ? value.isEffective : undefined,
    energySeries,
    averageEnergy,
    review,
    extendedMinutes: finiteNumber(value.extendedMinutes) && value.extendedMinutes >= 0 ? value.extendedMinutes : 0,
    interruptionCount: finiteNumber(value.interruptionCount) && value.interruptionCount >= 0 ? value.interruptionCount : 0,
    cycleIndex: finiteNumber(value.cycleIndex) && value.cycleIndex > 0 ? value.cycleIndex : undefined,
  };
}

function parseFocusBrokerImport(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON 无法解析，请选择 Focus Broker 导出的历史文件。');
  }

  if (!isObject(parsed) || parsed.product !== 'Focus Broker') {
    throw new Error('文件格式不匹配：product 必须是 Focus Broker。');
  }
  if (!Array.isArray(parsed.records)) {
    throw new Error('文件格式不匹配：records 必须是数组。');
  }

  return parsed.records.map((record, index) => normalizeRecord(record, index)).sort((a, b) => b.endedAt - a.endedAt);
}

interface DangerAction {
  title: string;
  description: string;
  confirmPhrase?: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

function DangerConfirmDialog({ action, onCancel }: { action: DangerAction; onCancel: () => void }) {
  const [typed, setTyped] = useState('');
  const canConfirm = !action.confirmPhrase || typed === action.confirmPhrase;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  const confirm = async () => {
    if (!canConfirm) return;
    await action.onConfirm();
    onCancel();
  };

  return (
    <div className="danger-confirm-backdrop" role="presentation">
      <section className="danger-confirm" role="dialog" aria-modal="true" aria-labelledby="danger-confirm-title">
        <div className="danger-confirm-header">
          <div>
            <h3 id="danger-confirm-title">{action.title}</h3>
            <p>{action.description}</p>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="关闭确认弹窗"><X size={16} /></button>
        </div>
        {action.confirmPhrase && (
          <label className="danger-confirm-field">
            <span>请输入：<strong>{action.confirmPhrase}</strong></span>
            <input className="field" value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus />
          </label>
        )}
        <div className="danger-confirm-actions">
          <button className="ghost-button" type="button" onClick={onCancel}>取消</button>
          <button className="ghost-button danger danger-confirm-primary" type="button" onClick={() => void confirm()} disabled={!canConfirm}>{action.confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

export function SettingsModal() {
  const settings = usePomodoroStore((state) => state.settings);
  const records = usePomodoroStore((state) => state.records);
  const tasks = usePomodoroStore((state) => state.tasks);
  const timer = usePomodoroStore((state) => state.timer);
  const setRecords = usePomodoroStore((state) => state.setRecords);
  const setSettings = usePomodoroStore((state) => state.setSettings);
  const addWhitelistSite = usePomodoroStore((state) => state.addWhitelistSite);
  const removeWhitelistSite = usePomodoroStore((state) => state.removeWhitelistSite);
  const clearTodayTasks = usePomodoroStore((state) => state.clearTodayTasks);
  const clearHistoryState = usePomodoroStore((state) => state.clearHistoryState);
  const resetLocalWorkspace = usePomodoroStore((state) => state.resetLocalWorkspace);
  const [site, setSite] = useState('');
  const [permission, setPermission] = useState(notificationPermission);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [dataMessage, setDataMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const dataLocked = timer.status === 'running' || timer.status === 'paused';
  const deniedNotification = settings.notificationsEnabled && permission === 'denied';
  const exportPayload = useMemo(() => ({
    product: 'Focus Broker',
    version: '0.1.0-alpha',
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  }), [records]);

  const blockedMessage = '专注进行中，结束或重置当前计时后才能执行数据管理操作。';
  const lockedTitle = dataLocked ? '当前计时未结束，暂不可操作。' : undefined;

  const add = () => {
    addWhitelistSite(site);
    setSite('');
  };

  const requestNotification = async (checked: boolean) => {
    if (checked && 'Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission().catch(() => Notification.permission);
      setPermission(result);
    } else {
      setPermission(notificationPermission());
    }
    setSettings({ notificationsEnabled: checked });
  };

  const exportHistory = () => {
    downloadJson(`focus-broker-history-${new Date().toISOString().slice(0, 10)}.json`, exportPayload);
    setDataMessage({ type: 'success', text: `已导出 ${records.length} 条历史记录。` });
  };

  const ensureUnlocked = () => {
    if (!dataLocked) return true;
    setDataMessage({ type: 'warning', text: blockedMessage });
    return false;
  };

  const clearTasks = () => {
    if (!ensureUnlocked()) return;
    setDangerAction({
      title: '清空今日任务',
      description: `这会移除 ${tasks.length} 个今日任务，但不会删除历史专注记录。`,
      confirmLabel: '清空任务',
      onConfirm: () => {
        clearTodayTasks();
        setDataMessage({ type: 'success', text: '当前任务列表已清空，历史记录已保留。' });
      },
    });
  };

  const clearHistory = () => {
    if (!ensureUnlocked()) return;
    setDangerAction({
      title: '清空历史记录',
      description: '该操作会影响今日复盘、近 7 天趋势、任务类型统计和历史列表，且无法撤销。',
      confirmPhrase: '清空历史',
      confirmLabel: '清空历史记录',
      onConfirm: async () => {
        await clearPomodoroRecords();
        clearHistoryState();
        setDataMessage({ type: 'success', text: '历史记录已清空，今日复盘和趋势已同步更新。' });
      },
    });
  };

  const resetAll = () => {
    if (!ensureUnlocked()) return;
    setDangerAction({
      title: '全部重置',
      description: '该操作会清空任务、历史记录、复盘状态和本应用设置，且无法撤销。',
      confirmPhrase: 'RESET',
      confirmLabel: '全部重置',
      onConfirm: async () => {
        await clearPomodoroRecords();
        resetLocalWorkspace();
      },
    });
  };

  const triggerImport = (mode: 'merge' | 'replace') => {
    if (!ensureUnlocked()) return;
    if (mode === 'replace') {
      setDangerAction({
        title: '覆盖导入历史',
        description: '覆盖导入会替换当前全部历史记录，并影响今日复盘、近 7 天趋势、任务类型统计和历史列表。建议先导出当前历史备份。',
        confirmPhrase: '导入覆盖',
        confirmLabel: '选择 JSON 文件',
        onConfirm: () => {
          setImportMode('replace');
          importInputRef.current?.click();
        },
      });
      return;
    }
    setImportMode('merge');
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ensureUnlocked()) return;

    try {
      const incoming = parseFocusBrokerImport(await file.text());
      if (importMode === 'replace') {
        await clearPomodoroRecords();
        await savePomodoroRecords(incoming);
        setRecords(incoming);
        setDataMessage({ type: 'success', text: `已覆盖导入 ${incoming.length} 条历史记录。今日复盘和趋势已同步刷新。` });
        return;
      }

      const seenIds = new Set(records.map((record) => record.id));
      const imported: PomodoroRecord[] = [];
      for (const record of incoming) {
        if (seenIds.has(record.id)) continue;
        seenIds.add(record.id);
        imported.push(record);
      }
      const skipped = incoming.length - imported.length;
      if (imported.length) await savePomodoroRecords(imported);
      setRecords([...records, ...imported].sort((a, b) => b.endedAt - a.endedAt));
      setDataMessage({ type: 'success', text: `已导入 ${imported.length} 条记录，跳过 ${skipped} 条重复记录。` });
    } catch (error) {
      setDataMessage({ type: 'error', text: error instanceof Error ? error.message : '导入失败，请检查文件格式。' });
    }
  };

  return (
    <div className="settings-layout">
      {deniedNotification && (
        <div className="settings-warning" role="status">
          <AlertTriangle size={16} />
          <span>浏览器通知权限已被拒绝，阶段结束提醒将不会弹出。可在浏览器设置中重新开启。</span>
        </div>
      )}

      <section className="settings-group">
        <h3><Clock size={16} />计时节奏</h3>
        <div className="settings-grid four">
          <label>
            <span>专注</span>
            <input className="field" type="number" min={5} max={120} value={settings.focusMinutes} onChange={(event) => setSettings({ focusMinutes: Number(event.target.value) })} />
          </label>
          <label>
            <span>短休息</span>
            <input className="field" type="number" min={1} max={45} value={settings.breakMinutes} onChange={(event) => setSettings({ breakMinutes: Number(event.target.value) })} />
          </label>
          <label>
            <span>长休息</span>
            <input className="field" type="number" min={5} max={60} value={settings.longBreakMinutes} onChange={(event) => setSettings({ longBreakMinutes: Number(event.target.value) })} />
          </label>
          <label>
            <span>每几轮长休息</span>
            <input className="field" type="number" min={2} max={8} value={settings.roundsBeforeLongBreak} onChange={(event) => setSettings({ roundsBeforeLongBreak: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      <section className="settings-group">
        <h3><Bell size={16} />流程与提醒</h3>
        <div className="settings-grid two">
          <label className="setting-toggle">
            <span><strong>自动开始休息</strong><small>复盘保存后直接进入短/长休息。</small></span>
            <input type="checkbox" checked={settings.autoStartBreak} onChange={(event) => setSettings({ autoStartBreak: event.target.checked })} />
          </label>
          <label className="setting-toggle">
            <span><strong>自动开始下一轮</strong><small>休息结束后自动进入下一次专注。</small></span>
            <input type="checkbox" checked={settings.autoStartNextFocus} onChange={(event) => setSettings({ autoStartNextFocus: event.target.checked })} />
          </label>
          <label className="setting-toggle">
            <span><strong>浏览器通知</strong><small>阶段结束时提醒你回到页面。</small></span>
            <input type="checkbox" checked={settings.notificationsEnabled} onChange={(event) => void requestNotification(event.target.checked)} />
          </label>
          <label className="setting-toggle">
            <span><strong>极简模式</strong><small>隐藏辅助面板，只保留任务和计时。</small></span>
            <input type="checkbox" checked={settings.minimalMode} onChange={(event) => setSettings({ minimalMode: event.target.checked })} />
          </label>
        </div>
      </section>

      <section className="settings-group">
        <h3>拦截白名单</h3>
        <div className="settings-inline-form">
          <input className="field" value={site} placeholder="github.com" onChange={(event) => setSite(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && add()} />
          <button className="icon-button" onClick={add} aria-label="添加"><Plus size={18} /></button>
        </div>
        <div className="settings-chips">
          {settings.whitelist.map((item) => (
            <span key={item} className="chip">
              {item}
              <button onClick={() => removeWhitelistSite(item)} aria-label={`移除 ${item}`}><X size={14} /></button>
            </span>
          ))}
        </div>
      </section>

      <section className="settings-group data-management">
        <h3><Database size={16} />数据管理</h3>
        <p>这些操作只影响 Focus Broker 的本地任务、设置和历史记录，不会触碰浏览器中其他网站的数据。导入恢复仍处于 Alpha 阶段，建议先导出现有历史备份。</p>
        {dataLocked && <div className="data-lock-note"><AlertTriangle size={15} />{blockedMessage}</div>}
        {dataMessage && <div className={`data-message ${dataMessage.type}`} role="status">{dataMessage.text}</div>}
        <input ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void handleImportFile(event)} />
        <div className="data-actions">
          <button className="ghost-button" type="button" onClick={exportHistory}><Download size={16} />导出历史 JSON</button>
          <button className="ghost-button" type="button" onClick={() => triggerImport('merge')} disabled={dataLocked} title={lockedTitle}><FileUp size={16} />导入历史 JSON</button>
          <button className="ghost-button danger" type="button" onClick={() => triggerImport('replace')} disabled={dataLocked} title={lockedTitle}><FileUp size={16} />覆盖导入</button>
          <button className="ghost-button" type="button" onClick={clearTasks} disabled={dataLocked} title={lockedTitle}><Trash2 size={16} />清空今日任务</button>
          <button className="ghost-button danger" type="button" onClick={clearHistory} disabled={dataLocked} title={lockedTitle}><Trash2 size={16} />清空历史记录</button>
          <button className="ghost-button danger" type="button" onClick={resetAll} disabled={dataLocked} title={lockedTitle}><RotateCcw size={16} />全部重置</button>
        </div>
      </section>

      {dangerAction && <DangerConfirmDialog action={dangerAction} onCancel={() => setDangerAction(null)} />}
    </div>
  );
}
