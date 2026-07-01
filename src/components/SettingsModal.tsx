import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AlertTriangle, Bell, Clock, Database, Download, FileUp, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { clearPomodoroRecords, savePomodoroRecords } from '../lib/db';
import { usePomodoroStore } from '../store/usePomodoroStore';
import type { PomodoroRecord, TaskCategory, Difficulty } from '../types/pomodoro';

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

const categories = new Set<TaskCategory>(['coding', 'writing', 'learning', 'planning', 'research', 'other']);
const difficulties = new Set<Difficulty>(['simple', 'medium', 'hard']);

function normalizeRecord(value: unknown): PomodoroRecord | null {
  if (!isObject(value)) return null;
  const task = value.task;
  const review = value.review;
  if (typeof value.id !== 'string' || !isObject(task) || !isObject(review)) return null;
  if (typeof task.name !== 'string' || !categories.has(task.category as TaskCategory) || !difficulties.has(task.difficulty as Difficulty)) return null;
  if (!finiteNumber(value.startedAt) || !finiteNumber(value.endedAt) || !finiteNumber(value.focusMs)) return null;

  const energySeries = Array.isArray(value.energySeries) ? value.energySeries.filter((point) => isObject(point) && finiteNumber(point.time) && finiteNumber(point.value)) as PomodoroRecord['energySeries'] : [];
  const averageEnergy = finiteNumber(value.averageEnergy)
    ? value.averageEnergy
    : finiteNumber(review.energy)
      ? review.energy
      : 0;

  return {
    id: value.id,
    task: {
      name: task.name,
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
    review: review as unknown as PomodoroRecord['review'],
    extendedMinutes: finiteNumber(value.extendedMinutes) ? value.extendedMinutes : 0,
    interruptionCount: finiteNumber(value.interruptionCount) ? value.interruptionCount : 0,
    cycleIndex: finiteNumber(value.cycleIndex) ? value.cycleIndex : undefined,
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

  const records = parsed.records.map(normalizeRecord);
  if (records.some((record) => record === null)) {
    throw new Error('文件中存在不完整记录。每条记录至少需要 id、task、startedAt、endedAt、focusMs 和 review。');
  }
  return (records as PomodoroRecord[]).sort((a, b) => b.endedAt - a.endedAt);
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
    if (!window.confirm(`确定清空当前任务列表吗？这会移除 ${tasks.length} 个今日任务，但不会删除历史记录。`)) return;
    clearTodayTasks();
    setDataMessage({ type: 'success', text: '当前任务列表已清空，历史记录已保留。' });
  };

  const clearHistory = async () => {
    if (!ensureUnlocked()) return;
    const phrase = window.prompt('该操作会影响今日复盘、近 7 天趋势、任务类型统计和历史列表，且无法撤销。请输入“清空历史”确认。');
    if (phrase !== '清空历史') {
      setDataMessage({ type: 'warning', text: '未输入确认短语，历史记录未清空。' });
      return;
    }
    await clearPomodoroRecords();
    clearHistoryState();
    setDataMessage({ type: 'success', text: '历史记录已清空，今日复盘和趋势会同步更新。' });
  };

  const resetAll = async () => {
    if (!ensureUnlocked()) return;
    const phrase = window.prompt('该操作会清空任务、历史记录、复盘状态和本应用设置，且无法撤销。请输入 RESET 确认。');
    if (phrase !== 'RESET') {
      setDataMessage({ type: 'warning', text: '未输入确认短语，未执行全部重置。' });
      return;
    }
    await clearPomodoroRecords();
    resetLocalWorkspace();
  };

  const triggerImport = (mode: 'merge' | 'replace') => {
    if (!ensureUnlocked()) return;
    if (mode === 'replace') {
      const phrase = window.prompt('覆盖导入会替换当前全部历史记录，并影响今日复盘、近 7 天趋势和历史列表。请输入“导入覆盖”确认。');
      if (phrase !== '导入覆盖') {
        setDataMessage({ type: 'warning', text: '未输入确认短语，未执行覆盖导入。' });
        return;
      }
    }
    setImportMode(mode);
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
        setDataMessage({ type: 'success', text: `已覆盖导入 ${incoming.length} 条历史记录。` });
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
        <p>这些操作只影响 Focus Broker 的本地任务、设置和历史记录，不会触碰浏览器中其他网站的数据。</p>
        {dataLocked && <div className="data-lock-note"><AlertTriangle size={15} />{blockedMessage}</div>}
        {dataMessage && <div className={`data-message ${dataMessage.type}`} role="status">{dataMessage.text}</div>}
        <input ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void handleImportFile(event)} />
        <div className="data-actions">
          <button className="ghost-button" type="button" onClick={exportHistory}><Download size={16} />导出历史 JSON</button>
          <button className="ghost-button" type="button" onClick={() => triggerImport('merge')} disabled={dataLocked}><FileUp size={16} />导入历史 JSON</button>
          <button className="ghost-button danger" type="button" onClick={() => triggerImport('replace')} disabled={dataLocked}><FileUp size={16} />覆盖导入</button>
          <button className="ghost-button" type="button" onClick={clearTasks} disabled={dataLocked}><Trash2 size={16} />清空今日任务</button>
          <button className="ghost-button danger" type="button" onClick={() => void clearHistory()} disabled={dataLocked}><Trash2 size={16} />清空历史记录</button>
          <button className="ghost-button danger" type="button" onClick={() => void resetAll()} disabled={dataLocked}><RotateCcw size={16} />全部重置</button>
        </div>
      </section>
    </div>
  );
}