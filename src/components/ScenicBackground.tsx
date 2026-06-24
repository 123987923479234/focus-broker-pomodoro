import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { usePomodoroStore } from '../store/usePomodoroStore';
import type { VisualScene } from '../types/pomodoro';

const petals = Array.from({ length: 16 }, (_, index) => index);
const flowers = Array.from({ length: 14 }, (_, index) => index);
const stars = Array.from({ length: 42 }, (_, index) => index);
const rainDrops = Array.from({ length: 36 }, (_, index) => index);

function BlueLakeTulips() {
  return (
    <>
      <div className="scene-horizon" />
      <div className="scene-water" />
      <div className="scene-reflection" />
      <div className="scene-tree scene-tree-left" />
      <div className="scene-tree scene-tree-right" />
      <div className="scene-flowerbed">
        {flowers.map((item) => (
          <span key={item} className="scene-flower" style={{ '--i': item } as CSSProperties} />
        ))}
      </div>
      <div className="scene-petals">
        {petals.map((item) => (
          <span key={item} className="scene-petal" style={{ '--i': item } as CSSProperties} />
        ))}
      </div>
    </>
  );
}

function MistForest() {
  return (
    <>
      <div className="forest-sky" />
      <div className="forest-ridge ridge-back" />
      <div className="forest-ridge ridge-front" />
      <div className="forest-mist mist-one" />
      <div className="forest-mist mist-two" />
      <div className="forest-ground" />
    </>
  );
}

function RainWindow() {
  return (
    <>
      <div className="rain-window-glow" />
      <div className="rain-window-pane" />
      <div className="rain-streaks">
        {rainDrops.map((item) => (
          <span key={item} className="rain-drop" style={{ '--i': item } as CSSProperties} />
        ))}
      </div>
      <div className="rain-sill" />
    </>
  );
}

function StarLake() {
  return (
    <>
      <div className="star-moon" />
      <div className="star-field">
        {stars.map((item) => (
          <span key={item} className="star-dot" style={{ '--i': item } as CSSProperties} />
        ))}
      </div>
      <div className="star-mountain" />
      <div className="star-lake" />
      <div className="star-reflection" />
    </>
  );
}

function SceneBody({ scene }: { scene: VisualScene }) {
  if (scene === 'mistForest') return <MistForest />;
  if (scene === 'rainWindow') return <RainWindow />;
  if (scene === 'starLake') return <StarLake />;
  return <BlueLakeTulips />;
}

export function ScenicBackground() {
  const scene = usePomodoroStore((state) => state.settings.visualScene ?? 'blueLakeTulips');

  return (
    <div className="scenic-bg" aria-hidden="true">
      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          className={`scenic-scene scene-${scene}`}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <SceneBody scene={scene} />
          <div className="scene-vignette" />
          <div className="scene-readability" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

