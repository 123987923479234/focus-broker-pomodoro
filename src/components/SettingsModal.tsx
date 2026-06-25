import { useState } from 'react';
import { Bell, Clock, Plus, X } from 'lucide-react';
import { usePomodoroStore } from '../store/usePomodoroStore';

export function SettingsModal() {
  const settings = usePomodoroStore((state) => state.settings);
  const setSettings = usePomodoroStore((state) => state.setSettings);
  const addWhitelistSite = usePomodoroStore((state) => state.addWhitelistSite);
  const removeWhitelistSite = usePomodoroStore((state) => state.removeWhitelistSite);
  const [site, setSite] = useState('');

  const add = () => {
    addWhitelistSite(site);
    setSite('');
  };

  const requestNotification = async (checked: boolean) => {
    if (checked && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => undefined);
    }
    setSettings({ notificationsEnabled: checked });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Clock size={16} className="inline" /> 专注
          <input className="field" type="number" min={5} max={120} value={settings.focusMinutes} onChange={(event) => setSettings({ focusMinutes: Number(event.target.value) })} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Clock size={16} className="inline" /> 短休息
          <input className="field" type="number" min={1} max={45} value={settings.breakMinutes} onChange={(event) => setSettings({ breakMinutes: Number(event.target.value) })} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Clock size={16} className="inline" /> 长休息
          <input className="field" type="number" min={5} max={60} value={settings.longBreakMinutes} onChange={(event) => setSettings({ longBreakMinutes: Number(event.target.value) })} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          每几轮长休息
          <input className="field" type="number" min={2} max={8} value={settings.roundsBeforeLongBreak} onChange={(event) => setSettings({ roundsBeforeLongBreak: Number(event.target.value) })} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="setting-toggle">
          <span><strong>自动开始休息</strong><small>复盘保存后直接进入短/长休息。</small></span>
          <input type="checkbox" checked={settings.autoStartBreak} onChange={(event) => setSettings({ autoStartBreak: event.target.checked })} />
        </label>
        <label className="setting-toggle">
          <span><strong>自动开始下一轮</strong><small>休息结束后自动进入下一次专注。</small></span>
          <input type="checkbox" checked={settings.autoStartNextFocus} onChange={(event) => setSettings({ autoStartNextFocus: event.target.checked })} />
        </label>
        <label className="setting-toggle">
          <span><strong><Bell size={15} className="inline" /> 浏览器通知</strong><small>阶段结束时提醒你回到页面。</small></span>
          <input type="checkbox" checked={settings.notificationsEnabled} onChange={(event) => void requestNotification(event.target.checked)} />
        </label>
        <label className="setting-toggle">
          <span><strong>极简模式</strong><small>隐藏辅助面板，只保留任务和计时。</small></span>
          <input type="checkbox" checked={settings.minimalMode} onChange={(event) => setSettings({ minimalMode: event.target.checked })} />
        </label>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">拦截白名单</h3>
        <div className="flex gap-2">
          <input className="field" value={site} placeholder="github.com" onChange={(event) => setSite(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && add()} />
          <button className="icon-button" onClick={add} aria-label="添加"><Plus size={18} /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.whitelist.map((item) => (
            <span key={item} className="chip">
              {item}
              <button onClick={() => removeWhitelistSite(item)} aria-label={`移除 ${item}`}><X size={14} /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

