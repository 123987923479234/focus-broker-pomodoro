import { useEffect, useMemo, useState } from 'react';
import { savePomodoroRecord } from '../lib/db';
import { effectivePomodoroFromReview, effectiveRuleText } from '../lib/pomodoroRules';
import { createRecordFromReview, usePomodoroStore } from '../store/usePomodoroStore';
import type { EfficiencyLevel, ReviewCompletion } from '../types/pomodoro';

const completionOptions: Array<{ value: ReviewCompletion; label: string; hint: string }> = [
  { value: 'done', label: '完成', hint: '归档任务，并自动切换到下一个待开始任务。' },
  { value: 'partial', label: '部分完成', hint: '累计本轮番茄，任务继续留在当前。' },
  { value: 'missed', label: '未完成', hint: '记录复盘，但不增加任务番茄进度。' },
];

const efficiencyOptions: Array<{ value: EfficiencyLevel; label: string }> = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

function displayMinutes(ms: number) {
  if (ms <= 0) return 0;
  return Math.max(1, Math.round(ms / 60000));
}

export function ReviewModal() {
  const pendingReview = usePomodoroStore((state) => state.pendingReview);
  const tasks = usePomodoroStore((state) => state.tasks);
  const finishReview = usePomodoroStore((state) => state.finishReview);
  const addRecord = usePomodoroStore((state) => state.addRecord);
  const currentEnergy = usePomodoroStore((state) => state.currentEnergy);
  const taskInQueue = useMemo(
    () => tasks.find((task) => task.id === pendingReview?.taskId),
    [pendingReview?.taskId, tasks],
  );
  const plannedFocusMs = pendingReview?.plannedFocusMs ?? pendingReview?.focusMs ?? 0;
  const meetsEffectiveTime = pendingReview ? effectivePomodoroFromReview(pendingReview.focusMs, plannedFocusMs, { completion: 'partial', gain: '', blocker: '' }) : false;
  const willReachEstimate = taskInQueue ? taskInQueue.completedPomodoros + 1 >= taskInQueue.estimatePomodoros : true;
  const nextProgress = taskInQueue
    ? `${Math.min(taskInQueue.completedPomodoros + 1, taskInQueue.estimatePomodoros)}/${taskInQueue.estimatePomodoros}`
    : '--';
  const [completion, setCompletion] = useState<ReviewCompletion>('done');
  const [efficiency, setEfficiency] = useState<EfficiencyLevel>('medium');
  const [energy, setEnergy] = useState(currentEnergy);
  const [interruptionReason, setInterruptionReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pendingReview) return;
    setCompletion(meetsEffectiveTime ? (willReachEstimate ? 'done' : 'partial') : 'missed');
    setEfficiency('medium');
    setEnergy(currentEnergy);
    setInterruptionReason('');
    setNote('');
    setSaving(false);
  }, [currentEnergy, meetsEffectiveTime, pendingReview, willReachEstimate]);

  const selectedCompletion = completionOptions.find((item) => item.value === completion);

  const submit = async () => {
    if (!pendingReview || saving) return;
    setSaving(true);
    const review = {
      gain: note.slice(0, 30),
      blocker: interruptionReason.slice(0, 30),
      completion,
      efficiency,
      energy,
      interruptionReason: interruptionReason.slice(0, 80),
      note: note.slice(0, 120),
    };
    const snapshot = finishReview(review);
    if (snapshot) {
      const record = createRecordFromReview(snapshot, review);
      await savePomodoroRecord(record);
      addRecord(record);
    }
    setSaving(false);
  };

  if (!pendingReview) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.35] bg-white/[0.45] p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{pendingReview.task.name}</strong>
          <span className="text-slate-500 dark:text-slate-400">实际 {displayMinutes(pendingReview.focusMs)} 分钟 · 中断 {pendingReview.interruptionCount} 次</span>
        </div>
        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <span>保存后进度：{completion === 'missed' ? `${taskInQueue?.completedPomodoros ?? 0}/${taskInQueue?.estimatePomodoros ?? 1}` : nextProgress} 番茄</span>
          <span>{meetsEffectiveTime ? (willReachEstimate ? '已达到预计番茄，请确认是否真的完成。' : '未达到预计番茄，默认继续推进。') : '未达到有效番茄标准，默认记录为未完成。'}</span>
        </div>
      </div>

      <p className="rounded-xl border border-amber-200/70 bg-amber-50/75 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">{effectiveRuleText()}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          完成状态
          <select className="field" value={completion} onChange={(event) => setCompletion(event.target.value as ReviewCompletion)}>
            {completionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{selectedCompletion?.hint}</span>
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          本轮效率
          <select className="field" value={efficiency} onChange={(event) => setEfficiency(event.target.value as EfficiencyLevel)}>
            {efficiencyOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        当前精力：{energy}/10
        <input className="w-full accent-blue-600" type="range" min={1} max={10} value={energy} onChange={(event) => setEnergy(Number(event.target.value))} />
      </label>

      <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        中断原因
        <input className="field" maxLength={80} value={interruptionReason} placeholder="例如：临时消息、查资料跑偏、身体疲劳" onChange={(event) => setInterruptionReason(event.target.value)} />
      </label>

      <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        备注
        <textarea className="field min-h-24 resize-none" maxLength={120} value={note} placeholder="记录本轮产出或下轮要接着做什么" onChange={(event) => setNote(event.target.value)} />
      </label>

      <div className="flex flex-wrap justify-end gap-3">
        <button className="ghost-button" onClick={() => usePomodoroStore.getState().extendFocus(15)}>继续 +15</button>
        <button className="primary-button" onClick={submit} disabled={saving}>{saving ? '保存中' : '保存并进入休息'}</button>
      </div>
    </div>
  );
}
