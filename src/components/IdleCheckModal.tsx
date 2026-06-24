import { AlertTriangle } from 'lucide-react';
import { usePomodoroStore } from '../store/usePomodoroStore';

export function IdleCheckModal() {
  const resumeTimer = usePomodoroStore((state) => state.resumeTimer);
  const resetTimer = usePomodoroStore((state) => state.resetTimer);

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 text-amber-500">
        <AlertTriangle size={30} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-950 dark:text-white">是否保持专注？</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">已检测到一段时间没有操作，计时已暂停。</p>
      </div>
      <div className="flex justify-center gap-3">
        <button className="primary-button" onClick={resumeTimer}>继续专注</button>
        <button className="ghost-button" onClick={resetTimer}>结束本轮</button>
      </div>
    </div>
  );
}
