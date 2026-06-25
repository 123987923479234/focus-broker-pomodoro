import { CloudRain, Headphones, Moon, Music2, Settings2, Sparkles, Sun, Trees, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePomodoroStore } from '../store/usePomodoroStore';
import type { AudioScene, ThemeMode, VisualScene } from '../types/pomodoro';

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '系统' },
  { value: 'day', label: '日间' },
  { value: 'night', label: '深夜' },
];

const visualScenes: Array<{ value: VisualScene; label: string; hint: string }> = [
  { value: 'blueLakeTulips', label: '蓝湖郁金香', hint: '花丛、水面、微光漂浮' },
  { value: 'mistForest', label: '薄雾森林', hint: '远山、林影、慢雾' },
  { value: 'rainWindow', label: '雨夜窗边', hint: '雨痕、玻璃、暖光' },
  { value: 'starLake', label: '星河湖面', hint: '月光、群星、倒影' },
];

const audioScenes: Array<{ value: AudioScene; label: string; hint: string; icon: LucideIcon }> = [
  { value: 'rainKeyboard', label: '雨声 + 键盘', hint: '轻雨和低频敲击', icon: CloudRain },
  { value: 'softRain', label: '轻雨', hint: '更柔和的雨幕', icon: CloudRain },
  { value: 'forestStream', label: '林间溪流', hint: '水流和远处鸟鸣', icon: Trees },
  { value: 'lofiPiano', label: '极简钢琴', hint: '稀疏、安静、无鼓点', icon: Music2 },
  { value: 'warmPads', label: '暖色铺底', hint: '缓慢和弦氛围', icon: Waves },
  { value: 'none', label: '关闭声音', hint: '只保留视觉沉浸', icon: Sparkles },
];

export function AmbientPanel() {
  const settings = usePomodoroStore((state) => state.settings);
  const setSettings = usePomodoroStore((state) => state.setSettings);
  const activeAudio = settings.audioScene ?? 'rainKeyboard';
  const activeVisual = settings.visualScene ?? 'blueLakeTulips';
  const visualLabel = visualScenes.find((scene) => scene.value === activeVisual)?.label ?? '蓝湖郁金香';
  const audioLabel = audioScenes.find((scene) => scene.value === activeAudio)?.label ?? '雨声 + 键盘';

  const chooseAudio = (audioScene: AudioScene) => {
    setSettings({ audioScene, whiteNoiseEnabled: audioScene !== 'none' });
  };

  return (
    <section className="panel ambient-panel" aria-labelledby="ambient-panel-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div id="ambient-panel-title" className="panel-title"><Headphones size={18} />沉浸氛围</div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">辅助专注，不打断任务流。</p>
        </div>
        <button className="ghost-button h-9 min-h-9 px-3" onClick={() => setSettings({ ambienceExpanded: !settings.ambienceExpanded })}>
          <Settings2 size={16} />{settings.ambienceExpanded ? '收起' : '更换氛围'}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="ambient-summary"><span>风景</span><strong>{visualLabel}</strong></div>
        <div className="ambient-summary"><span>声音</span><strong>{settings.whiteNoiseEnabled && activeAudio !== 'none' ? audioLabel : '静音'}</strong></div>
        <label className={`ambient-summary ${(!settings.whiteNoiseEnabled || activeAudio === 'none') ? 'opacity-55' : ''}`}>
          <span>音量</span>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.01}
            value={settings.baseVolume}
            disabled={!settings.whiteNoiseEnabled || activeAudio === 'none'}
            onChange={(event) => setSettings({ baseVolume: Number(event.target.value) })}
            className="mt-2 w-full accent-cyan-600"
            aria-label="音量"
          />
        </label>
      </div>

      {settings.ambienceExpanded && (
        <div className="mt-4 space-y-4 border-t border-white/[0.35] pt-4 dark:border-white/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>动态风景</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-300">默认低干扰</span>
            </div>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="动态风景选择">
              {visualScenes.map((scene) => (
                <button
                  key={scene.value}
                  type="button"
                  aria-pressed={activeVisual === scene.value}
                  className={`scene-choice ${activeVisual === scene.value ? 'active' : ''}`}
                  onClick={() => setSettings({ visualScene: scene.value })}
                >
                  <span>{scene.label}</span>
                  <small>{scene.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>音景 / 纯音乐</span>
              <input
                type="checkbox"
                checked={settings.whiteNoiseEnabled && activeAudio !== 'none'}
                onChange={(event) => setSettings({ whiteNoiseEnabled: event.target.checked, audioScene: event.target.checked && activeAudio === 'none' ? 'rainKeyboard' : activeAudio })}
                className="h-5 w-5 accent-blue-500"
                aria-label="开启或关闭音景"
              />
            </label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="音景选择">
              {audioScenes.map((scene) => {
                const Icon = scene.icon;
                return (
                  <button
                    key={scene.value}
                    type="button"
                    aria-pressed={activeAudio === scene.value}
                    className={`sound-choice ${activeAudio === scene.value ? 'active' : ''}`}
                    onClick={() => chooseAudio(scene.value)}
                  >
                    <Icon size={16} />
                    <span>{scene.label}</span>
                    <small>{activeAudio === scene.value && settings.whiteNoiseEnabled ? '正在使用' : scene.hint}</small>
                  </button>
                );
              })}
            </div>
          </div>

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
        </div>
      )}
    </section>
  );
}



