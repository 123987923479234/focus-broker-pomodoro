import { CloudRain, Headphones, Moon, Settings2, Sparkles, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePomodoroStore } from '../store/usePomodoroStore';
import type { AudioScene, ThemeMode } from '../types/pomodoro';

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '系统' },
  { value: 'day', label: '日间' },
  { value: 'night', label: '深夜' },
];

const audioScenes: Array<{ value: AudioScene; label: string; hint: string; icon: LucideIcon }> = [
  { value: 'rainKeyboard', label: '雨声 + 键盘', hint: '合成白噪音，开始专注后播放', icon: CloudRain },
  { value: 'none', label: '静音', hint: '只保留计时和复盘流程', icon: Sparkles },
];

export function AmbientPanel() {
  const settings = usePomodoroStore((state) => state.settings);
  const setSettings = usePomodoroStore((state) => state.setSettings);
  const activeAudio = settings.audioScene ?? 'rainKeyboard';
  const muted = !settings.whiteNoiseEnabled || activeAudio === 'none';
  const audioLabel = !muted
    ? audioScenes.find((scene) => scene.value === activeAudio)?.label ?? '雨声 + 键盘'
    : '静音';
  const themeLabel = themeOptions.find((option) => option.value === settings.themeMode)?.label ?? '系统';

  const chooseAudio = (audioScene: AudioScene) => {
    setSettings({ audioScene, whiteNoiseEnabled: audioScene !== 'none' });
  };

  return (
    <section className="panel ambient-panel" aria-labelledby="ambient-panel-title">
      <div className="ambient-toolbar">
        <div className="ambient-heading">
          <div id="ambient-panel-title" className="panel-title"><Headphones size={18} />专注环境</div>
          <p>必要声音与显示设置，保持低干扰。</p>
        </div>

        <div className="ambient-control"><span>声音</span><strong>{audioLabel}</strong></div>
        <label className={`ambient-control volume ${muted ? 'muted' : ''}`}>
          <span>音量</span>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.01}
            value={settings.baseVolume}
            disabled={muted}
            onChange={(event) => setSettings({ baseVolume: Number(event.target.value) })}
            aria-label="音量"
          />
        </label>
        <div className="ambient-control"><span>主题</span><strong>{themeLabel}</strong></div>
        <button className="ghost-button ambient-settings-button" onClick={() => setSettings({ ambienceExpanded: !settings.ambienceExpanded })}>
          <Settings2 size={16} />{settings.ambienceExpanded ? '收起' : '环境设置'}
        </button>
      </div>

      {settings.ambienceExpanded && (
        <div className="ambient-drawer">
          <div>
            <div className="ambient-section-head">
              <span>合成声音</span>
              <small>开始专注后播放</small>
            </div>
            <div className="sound-grid" role="group" aria-label="声音选择">
              {audioScenes.map((scene) => {
                const Icon = scene.icon;
                const active = activeAudio === scene.value && (scene.value === 'none' || settings.whiteNoiseEnabled);
                return (
                  <button
                    key={scene.value}
                    type="button"
                    aria-pressed={active}
                    className={`sound-choice ${active ? 'active' : ''}`}
                    onClick={() => chooseAudio(scene.value)}
                  >
                    <Icon size={16} />
                    <span>{scene.label}</span>
                    <small>{active ? '已选择' : scene.hint}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="ambient-section-head"><span>主题模式</span></div>
            <div className="segmented" role="group" aria-label="主题模式">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={settings.themeMode === option.value}
                  className={settings.themeMode === option.value ? 'active' : ''}
                  onClick={() => setSettings({ themeMode: option.value })}
                >
                  {option.value === 'night' ? <Moon size={15} /> : <Sun size={15} />}{option.label}
                </button>
              ))}
            </div>
            <p className="experimental-note">背景实验项已暂时收起。当前版本固定使用低干扰冷灰蓝背景，保证任务和复盘优先。</p>
          </div>
        </div>
      )}
    </section>
  );
}
