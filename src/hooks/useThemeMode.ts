import { useEffect } from 'react';
import { usePomodoroStore } from '../store/usePomodoroStore';

export function useThemeMode() {
  const themeMode = usePomodoroStore((state) => state.settings.themeMode);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const shouldUseNight = themeMode === 'night' || (themeMode === 'system' && media.matches);
      root.dataset.theme = shouldUseNight ? 'night' : 'day';
      root.classList.toggle('dark', shouldUseNight);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [themeMode]);
}
