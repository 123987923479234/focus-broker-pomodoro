import { usePomodoroStore } from '../store/usePomodoroStore';

export function ScenicBackground() {
  const scene = usePomodoroStore((state) => state.settings.visualScene ?? 'blueLakeTulips');

  return (
    <div className="scenic-bg" aria-hidden="true">
      <div className={`scenic-scene scene-${scene}`}>
        <div className="scene-vignette" />
        <div className="scene-readability" />
      </div>
    </div>
  );
}
