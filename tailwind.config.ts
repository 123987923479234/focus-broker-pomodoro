import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="night"]'],
  theme: {
    extend: {
      colors: {
        focus: { blue: '#3B82F6', cyan: '#22D3EE', ink: '#111827' },
        rest: { green: '#22C55E', mint: '#A7F3D0' },
        sprint: { red: '#EF4444', coral: '#FB7185' },
        glass: {
          day: 'rgba(255,255,255,0.64)',
          night: 'rgba(15,23,42,0.58)',
          line: 'rgba(255,255,255,0.26)',
        },
      },
      boxShadow: {
        glow: '0 0 60px rgba(59,130,246,0.32)',
        rest: '0 0 54px rgba(34,197,94,0.28)',
        sprint: '0 0 70px rgba(239,68,68,0.38)',
      },
      keyframes: {
        pulseRing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.75' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        breathe: {
          '0%, 21%': { transform: 'scale(0.72)' },
          '42%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.72)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 2.4s ease-in-out infinite',
        breathe: 'breathe 19s ease-in-out infinite',
        shimmer: 'shimmer 8s ease-in-out infinite alternate',
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
