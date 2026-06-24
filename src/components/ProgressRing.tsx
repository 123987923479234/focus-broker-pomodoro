import { motion } from 'framer-motion';

interface ProgressRingProps {
  progress: number;
  color: string;
  size?: number;
  stroke?: number;
}

export function ProgressRing({ progress, color, size = 360, stroke = 18 }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90 overflow-visible">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-white/35 dark:text-white/10"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 18px ${color}66)` }}
      />
    </svg>
  );
}
