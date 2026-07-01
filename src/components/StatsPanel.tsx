import { BarChart3, Flame, LineChart, PieChart, TimerReset } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { categoryLabel, humanMinutes } from '../lib/format';
import { effectiveRuleText, isEffectivePomodoro } from '../lib/pomodoroRules';
import { usePomodoroStore } from '../store/usePomodoroStore';

const palette = ['#2563EB', '#0F766E', '#7C3AED', '#0EA5E9', '#16A34A'];
const weeklyMinuteGoal = 150;

function isToday(timestamp: number) {
  return new Date(timestamp).toDateString() === new Date().toDateString();
}

function startOfDay(offset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function displayMinutes(ms: number) {
  if (ms <= 0) return 0;
  return Math.max(1, humanMinutes(ms));
}

function consecutiveDays(weekly: Array<{ minutes: number }>) {
  let streak = 0;
  for (let index = weekly.length - 1; index >= 0; index -= 1) {
    if (weekly[index].minutes <= 0) break;
    streak += 1;
  }
  return streak;
}

function reviewConclusion(params: { totalRecords: number; effectiveCount: number; ineffectiveCount: number; minutes: number; completedTasks: number; topCategory?: string }) {
  const { totalRecords, effectiveCount, ineffectiveCount, minutes, completedTasks, topCategory } = params;
  if (effectiveCount > 0) {
    return `今天已形成 ${effectiveCount} 个有效番茄，累计推进 ${minutes} 分钟。${topCategory ? `主要投入在 ${topCategory} 类任务。` : ''}${completedTasks > 0 ? `已归档 ${completedTasks} 项任务。` : '建议把已完成成果及时归档。'}`;
  }
  if (totalRecords > 0 && ineffectiveCount > 0) {
    return `你有 ${minutes} 分钟启动记录，但还没有达到有效番茄标准。建议先完成 1 个完整专注轮次。`;
  }
  return '今天还没有形成有效番茄。建议先选择一个明确任务，并完成 1 个完整专注轮次。';
}

function nextActionSuggestion(params: { hasTasks: boolean; effectiveCount: number; ineffectiveCount: number; weeklyGap: number; topCategory?: string }) {
  const { hasTasks, effectiveCount, ineffectiveCount, weeklyGap, topCategory } = params;
  if (!hasTasks) return '先别扩展计划。添加一个最小任务，完成一轮 25 分钟，让今天先有一个可靠推进点。';
  if (effectiveCount === 0 && ineffectiveCount > 0) return '刚才已经启动过一次，但还没形成有效番茄。下一轮先减少干扰，完整跑完 1 个番茄。';
  if (effectiveCount === 0) return '先选一个最具体的任务开始，不追求多任务，把第一轮完整跑完。';
  if (weeklyGap > 0) return `今天已经有推进记录。接下来优先归档已完成任务，再安排 1 轮${topCategory ? ` ${topCategory} 类` : ''}任务；本周基础目标还差 ${weeklyGap} 分钟。`;
  return '本周基础目标已达成。现在更适合回看中断原因，整理下一轮要推进的任务。';
}
export function StatsPanel() {
  const records = usePomodoroStore((state) => state.records);
  const tasks = usePomodoroStore((state) => state.tasks);
  const todayRecords = records.filter((record) => isToday(record.endedAt));
  const effectiveTodayRecords = todayRecords.filter(isEffectivePomodoro);
  const ineffectiveTodayRecords = todayRecords.filter((record) => !isEffectivePomodoro(record));
  const reviewedRecords = todayRecords.filter((record) => typeof record.review.energy === 'number' || Number.isFinite(record.averageEnergy));
  const todayMinutes = todayRecords.reduce((sum, record) => sum + displayMinutes(record.focusMs), 0);
  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const avgEnergy = reviewedRecords.length
    ? (reviewedRecords.reduce((sum, record) => sum + (record.review.energy ?? record.averageEnergy), 0) / reviewedRecords.length).toFixed(1)
    : '--';

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const start = startOfDay(index - 6);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const dayRecords = records.filter((record) => record.endedAt >= start.getTime() && record.endedAt < end.getTime());
    return {
      day: start.toLocaleDateString('zh-CN', { weekday: 'short' }),
      minutes: dayRecords.reduce((sum, record) => sum + displayMinutes(record.focusMs), 0),
      pomodoros: dayRecords.filter(isEffectivePomodoro).length,
    };
  });
  const hasWeeklyData = weekly.some((item) => item.minutes > 0 || item.pomodoros > 0);
  const bestDay = weekly.reduce((best, item) => (item.minutes > best.minutes ? item : best), weekly[0]);
  const weeklyMinutes = weekly.reduce((sum, item) => sum + item.minutes, 0);
  const weeklyGap = Math.max(0, weeklyMinuteGoal - weeklyMinutes);
  const streak = consecutiveDays(weekly);

  const categoryMap = effectiveTodayRecords.reduce<Record<string, number>>((map, record) => {
    map[record.task.category] = (map[record.task.category] ?? 0) + 1;
    return map;
  }, {});
  const categoryData = Object.entries(categoryMap).map(([category, value]) => ({ category: categoryLabel(category), value }));
  const topCategory = categoryData[0]?.category;
  const hasCurrentTasks = tasks.length > 0;
  const conclusion = reviewConclusion({
    totalRecords: todayRecords.length,
    effectiveCount: effectiveTodayRecords.length,
    ineffectiveCount: ineffectiveTodayRecords.length,
    minutes: todayMinutes,
    completedTasks,
    topCategory,
  });
  const nextAction = nextActionSuggestion({
    hasTasks: hasCurrentTasks,
    effectiveCount: effectiveTodayRecords.length,
    ineffectiveCount: ineffectiveTodayRecords.length,
    weeklyGap,
    topCategory,
  });

  return (
    <section className="panel stats-panel" aria-labelledby="stats-panel-title">
      <div className="review-report-head">
        <div id="stats-panel-title" className="panel-title"><BarChart3 size={18} />今日复盘</div>
        <p className="review-conclusion">{conclusion}</p>
        <p className="review-action">{nextAction}</p>
        {!hasCurrentTasks && todayRecords.length > 0 && (
          <p className="review-note">当前任务列表为空；统计来自今日历史记录。删除任务不会删除历史记录。</p>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <div className="stat-card"><TimerReset size={16} /><span>有效番茄</span><strong>{effectiveTodayRecords.length}</strong></div>
        <div className="stat-card"><Flame size={16} /><span>专注分钟</span><strong>{todayMinutes}</strong></div>
        <div className="stat-card"><PieChart size={16} /><span>完成任务</span><strong>{completedTasks}</strong></div>
        <div className="stat-card"><LineChart size={16} /><span>复盘精力</span><strong>{avgEnergy}</strong></div>
      </div>

      <div className="mt-3 space-y-1 text-xs font-medium text-slate-500 dark:text-slate-300">
        <p>{effectiveRuleText()}</p>
        {todayRecords.length > 0 && ineffectiveTodayRecords.length > 0 && (
          <p>今日有 {ineffectiveTodayRecords.length} 条未计入有效番茄的启动记录；专注分钟和复盘精力会保留，方便回看中断原因。</p>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="stats-chart compact">
          <h3>近 7 天节奏</h3>
          {hasWeeklyData ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:grid-cols-4">
                <span>本周累计：{weeklyMinutes} 分钟</span>
                <span>最高：{bestDay.day} {bestDay.minutes} 分钟</span>
                <span>连续专注：{streak} 天</span>
                <span>距目标：{weeklyGap} 分钟</span>
              </div>
              <ResponsiveContainer width="100%" height={96}>
                <BarChart data={weekly} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [name === 'minutes' ? `${value} 分钟` : `${value} 个`, name === 'minutes' ? '时长' : '有效番茄']} />
                  <Bar dataKey="minutes" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="empty-state h-28">连续使用后，这里会显示你的任务推进节奏。</div>
          )}
        </div>
        <div className="stats-chart compact">
          <h3>今日任务类型</h3>
          {categoryData.length ? (
            <div className="space-y-2 pt-1">
              {categoryData.map((item, index) => (
                <div key={item.category} className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: palette[index % palette.length] }} />{item.category}</span>
                  <span>{item.value} 轮</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state h-28">完成第一轮有效番茄后，显示任务类型占比。</div>
          )}
        </div>
      </div>
    </section>
  );
}
