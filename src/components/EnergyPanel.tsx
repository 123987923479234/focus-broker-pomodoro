import { Activity } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePomodoroStore } from '../store/usePomodoroStore';

export function EnergyPanel() {
  const currentEnergy = usePomodoroStore((state) => state.currentEnergy);
  const setEnergy = usePomodoroStore((state) => state.setEnergy);
  const series = usePomodoroStore((state) => state.energySeries);
  const hasSeries = series.length > 1;

  return (
    <section className="panel space-y-4" aria-labelledby="energy-panel-title">
      <div id="energy-panel-title" className="panel-title"><Activity size={18} />精力反馈</div>
      <label className="flex items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="sr-only">当前精力值</span>
        <input
          type="range"
          min={1}
          max={10}
          value={currentEnergy}
          onChange={(event) => setEnergy(Number(event.target.value))}
          className="w-full accent-blue-600"
          aria-label="当前精力值"
        />
        <strong className="w-10 text-center text-2xl text-slate-950 dark:text-white">{currentEnergy}</strong>
      </label>
      <div className="chart-shell">
        {hasSeries ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: -24, right: 8, top: 10, bottom: 0 }}>
              <XAxis dataKey="label" hide />
              <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(label) => `时间 ${label}`} formatter={(value) => [`${value}`, '精力']} />
              <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} dot={false} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">
            <strong>完成第一轮后生成精力曲线</strong>
            <span>开始专注后，精力变化会实时记录在这里。</span>
          </div>
        )}
      </div>
    </section>
  );
}

