import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, Clock, Database, Download, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { clearPomodoroRecords } from '../lib/db';
import { usePomodoroStore } from '../store/usePomodoroStore';

function notificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
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

export function SettingsModal() {
  const settings = usePomodoroStore((state) => state.settings);
  const records = usePomodoroStore((state) => state.records);
  const tasks = usePomodoroStore((state) => state.tasks);
  const setSettings = usePomodoroStore((state) => state.setSettings);
  const addWhitelistSite = usePomodoroStore((state) => state.addWhitelistSite);
  const removeWhitelistSite = usePomodoroStore((state) => state.removeWhitelistSite);
  const clearTodayTasks = usePomodoroStore((state) => state.clearTodayTasks);
  const clearHistoryState = usePomodoroStore((state) => state.clearHistoryState);
  const resetLocalWorkspace = usePomodoroStore((state) => state.resetLocalWorkspace);
  const [site, setSite] = useState('');
  const [permission, setPermission] = useState(notificationPermission);

  const deniedNotification = settings.notificationsEnabled && permission === 'denied';
  const exportPayload = useMemo(() => ({
    product: 'Focus Broker',
    version: '0.1.0-alpha',
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  }), [records]);

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
  };

  const clearTasks = () => {
    if (!window.confirm(`确定清空当前任务列表吗？这会移除 ${tasks.length} 个今日任务，但不会删除历史记录。`)) return;
    clearTodayTasks();
  };

  const clearHistory = async () => {
    if (!window.confirm('确定清空历史记录吗？该操作会影响今日复盘、7 天趋势和历史统计，且无法撤销。')) return;
    await clearPomodoroRecords();
    clearHistoryState();
  };

  const resetAll = async () => {
    if (!window.confirm('确定全部重置 Focus Broker 吗？这会清空任务、历史记录、复盘状态和本应用设置，无法撤销。')) return;
    await clearPomodoroRecords();
    resetLocalWorkspace();
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
        <div className="data-actions">
          <button className="ghost-button" type="button" onClick={exportHistory}><Download size={16} />导出历史 JSON</button>
          <button className="ghost-button" type="button" onClick={clearTasks}><Trash2 size={16} />清空今日任务</button>
          <button className="ghost-button danger" type="button" onClick={() => void clearHistory()}><Trash2 size={16} />清空历史记录</button>
          <button className="ghost-button danger" type="button" onClick={() => void resetAll()}><RotateCcw size={16} />全部重置</button>
        </div>
      </section>
    </div>
  );
}
