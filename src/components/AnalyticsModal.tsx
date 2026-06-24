import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { average, categoryLabel, humanMinutes } from '../lib/format';
import { usePomodoroStore } from '../store/usePomodoroStore';

const palette = ['#3B82F6', '#22C55E', '#F97316', '#A855F7', '#14B8A6', '#EF4444'];

function startOfWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date.getTime();
}

export function AnalyticsModal() {
  const records = usePomodoroStore((state) => state.records);
  const totalFocusMs = records.reduce((sum, record) => sum + record.focusMs, 0);
  const totalEnergyPoints = records.flatMap((record) => record.energySeries.map((point) => point.value));
  const avgEnergy = average(totalEnergyPoints);

  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    minutes: records.reduce((sum, record) => {
      const started = new Date(record.startedAt).getHours();
      return started === hour ? sum + humanMinutes(record.focusMs) : sum;
    }, 0),
  }));
  const maxHour = Math.max(1, ...hourly.map((item) => item.minutes));

  const weeklyStart = startOfWeek();
  const weeklyMap = records
    .filter((record) => record.endedAt >= weeklyStart)
    .reduce<Record<string, number>>((map, record) => {
      map[record.task.category] = (map[record.task.category] ?? 0) + 1;
      return map;
    }, {});
  const weeklyData = Object.entries(weeklyMap).map(([category, count]) => ({ name: categoryLabel(category), count }));
  const dailyData = hourly.map((item) => ({ name: `${item.hour}:00`, minutes: item.minutes }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="metric"><span>总专注时长</span><strong>{Math.round(totalFocusMs / 3600000 * 10) / 10}h</strong></div>
        <div className="metric"><span>总番茄数</span><strong>{records.length}</strong></div>
        <div className="metric"><span>平均精力值</span><strong>{avgEnergy.toFixed(1)}</strong></div>
      </div>

      <section className="analytics-block">
        <h3>专注全景热力图</h3>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {hourly.map((item) => (
            <div key={item.hour} className="heat-cell" style={{ backgroundColor: `rgba(59, 130, 246, ${0.08 + (item.minutes / maxHour) * 0.82})` }}>
              <span>{item.hour}</span>
              <strong>{item.minutes}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="analytics-block h-80">
          <h3>每小时专注强度</h3>
          <ResponsiveContainer width="100%" height="84%">
            <BarChart data={dailyData} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [`${value} 分钟`, '时长']} />
              <Bar dataKey="minutes" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="analytics-block h-80">
          <h3>本周任务分布</h3>
          {weeklyData.length ? (
            <ResponsiveContainer width="100%" height="84%">
              <PieChart>
                <Pie data={weeklyData} dataKey="count" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                  {weeklyData.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} 个`, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state h-52">本周还没有完成记录</div>}
        </section>
      </div>
    </div>
  );
}
