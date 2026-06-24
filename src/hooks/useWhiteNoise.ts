import { useEffect, useRef } from 'react';
import type { AudioScene } from '../types/pomodoro';

interface WhiteNoiseOptions {
  enabled: boolean;
  volume: number;
  decay: boolean;
  scene: AudioScene;
}

type BrowserAudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

function createNoiseBuffer(context: AudioContext, seconds: number, amount = 0.35) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * amount;
  }
  return buffer;
}

function stopSource(source: AudioScheduledSourceNode) {
  try {
    source.stop();
  } catch {
    // 已自然结束的短音符不需要再次处理。
  }
  try {
    source.disconnect();
  } catch {
    // 断开失败通常表示节点已经释放。
  }
}

export function useWhiteNoise({ enabled, volume, decay, scene }: WhiteNoiseOptions) {
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<AudioScheduledSourceNode[]>([]);
  const timersRef = useRef<number[]>([]);

  const stopScene = () => {
    timersRef.current.forEach((timer) => window.clearInterval(timer));
    timersRef.current = [];
    sourcesRef.current.forEach(stopSource);
    sourcesRef.current = [];
  };

  const registerSource = (source: AudioScheduledSourceNode) => {
    sourcesRef.current.push(source);
    source.addEventListener('ended', () => {
      sourcesRef.current = sourcesRef.current.filter((item) => item !== source);
    }, { once: true });
  };

  const startNoiseLayer = (context: AudioContext, output: AudioNode, options: { frequency: number; q?: number; level?: number; seconds?: number }) => {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const layerGain = context.createGain();
    source.buffer = createNoiseBuffer(context, options.seconds ?? 2.5, 0.45);
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = options.frequency;
    filter.Q.value = options.q ?? 0.7;
    layerGain.gain.value = options.level ?? 0.65;
    source.connect(filter);
    filter.connect(layerGain);
    layerGain.connect(output);
    source.start();
    registerSource(source);
  };

  const playShortTone = (context: AudioContext, output: AudioNode, frequency: number, options: { type?: OscillatorType; duration?: number; peak?: number; attack?: number }) => {
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    const now = context.currentTime;
    const duration = options.duration ?? 1.6;
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.value = frequency;
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(options.peak ?? 0.035, now + (options.attack ?? 0.08));
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(noteGain);
    noteGain.connect(output);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.04);
    registerSource(oscillator);
  };

  const startKeyboardClicks = (context: AudioContext, output: AudioNode) => {
    const playKeyClick = () => {
      if (context.state === 'closed') return;
      const oscillator = context.createOscillator();
      const clickGain = context.createGain();
      const now = context.currentTime;
      oscillator.type = 'square';
      oscillator.frequency.value = 1000 + Math.random() * 850;
      clickGain.gain.setValueAtTime(0.0001, now);
      clickGain.gain.exponentialRampToValueAtTime(0.025, now + 0.008);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);
      oscillator.connect(clickGain);
      clickGain.connect(output);
      oscillator.start(now);
      oscillator.stop(now + 0.055);
      registerSource(oscillator);
    };
    timersRef.current.push(window.setInterval(playKeyClick, 520));
  };

  const startForestBirds = (context: AudioContext, output: AudioNode) => {
    const playBird = () => {
      if (Math.random() < 0.55) return;
      playShortTone(context, output, 900 + Math.random() * 520, { duration: 0.42, peak: 0.016, attack: 0.03 });
      window.setTimeout(() => playShortTone(context, output, 1100 + Math.random() * 420, { duration: 0.36, peak: 0.012, attack: 0.03 }), 180);
    };
    timersRef.current.push(window.setInterval(playBird, 5200));
  };

  const startMinimalPiano = (context: AudioContext, output: AudioNode) => {
    const notes = [261.63, 293.66, 329.63, 392, 440, 493.88];
    const playNote = () => {
      const frequency = notes[Math.floor(Math.random() * notes.length)];
      playShortTone(context, output, frequency, { type: 'triangle', duration: 2.8, peak: 0.026, attack: 0.04 });
      if (Math.random() > 0.55) {
        window.setTimeout(() => playShortTone(context, output, frequency * 1.5, { type: 'sine', duration: 2.2, peak: 0.014, attack: 0.05 }), 620);
      }
    };
    playNote();
    timersRef.current.push(window.setInterval(playNote, 4200));
  };

  const startWarmPads = (context: AudioContext, output: AudioNode) => {
    const chord = [174.61, 220, 261.63, 329.63];
    chord.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const padGain = context.createGain();
      oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = (index - 1.5) * 4;
      padGain.gain.setValueAtTime(0.0001, context.currentTime);
      padGain.gain.linearRampToValueAtTime(0.018, context.currentTime + 2.4 + index * 0.4);
      oscillator.connect(padGain);
      padGain.connect(output);
      oscillator.start();
      registerSource(oscillator);
    });
  };

  useEffect(() => {
    stopScene();
    if (!enabled || scene === 'none') return;

    const AudioContextClass = window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = contextRef.current ?? new AudioContextClass();
    contextRef.current = context;
    void context.resume().catch(() => undefined);

    if (!gainRef.current) {
      const masterGain = context.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(context.destination);
      gainRef.current = masterGain;
    }

    const output = gainRef.current;
    if (scene === 'rainKeyboard') {
      startNoiseLayer(context, output, { frequency: 1350, level: 0.62 });
      startKeyboardClicks(context, output);
    }
    if (scene === 'softRain') {
      startNoiseLayer(context, output, { frequency: 900, q: 0.5, level: 0.48, seconds: 3.5 });
    }
    if (scene === 'forestStream') {
      startNoiseLayer(context, output, { frequency: 1650, q: 1.4, level: 0.46, seconds: 2.2 });
      startNoiseLayer(context, output, { frequency: 420, q: 0.4, level: 0.24, seconds: 4 });
      startForestBirds(context, output);
    }
    if (scene === 'lofiPiano') {
      startNoiseLayer(context, output, { frequency: 520, q: 0.35, level: 0.1, seconds: 5 });
      startMinimalPiano(context, output);
    }
    if (scene === 'warmPads') {
      startWarmPads(context, output);
      startNoiseLayer(context, output, { frequency: 360, q: 0.2, level: 0.08, seconds: 6 });
    }

    return stopScene;
  }, [enabled, scene]);

  useEffect(() => {
    const context = contextRef.current;
    const gain = gainRef.current;
    if (!context || !gain) return;
    const targetVolume = enabled && scene !== 'none' ? volume * (decay ? 0.7 : 1) : 0;
    gain.gain.setTargetAtTime(targetVolume, context.currentTime, 0.18);
  }, [decay, enabled, scene, volume]);

  useEffect(() => () => {
    stopScene();
    contextRef.current?.close();
    contextRef.current = null;
  }, []);
}
