import { CheckCircle2, ChevronDown, ChevronUp, Circle, Flag, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { categoryLabel, difficultyLabel } from '../lib/format';
import { isEffectivePomodoro } from '../lib/pomodoroRules';
import { usePomodoroStore } from '../store/usePomodoroStore';
import type { Difficulty, TaskCategory, TodayTask } from '../types/pomodoro';

const categories: Array<{ value: TaskCategory; label: string }> = [
  { value: 'coding', label: '编码' },
  { value: 'writing', label: '写作' },
  { value: 'learning', label: '学习' },
  { value: 'planning', label: '规划' },
  { value: 'research', label: '研究' },
  { value: 'other', label: '其他' },
];

const difficulties: Array<{ value: Difficulty; label: string }> = [
  { value: 'simple', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
];

function taskProgress(task: TodayTask) {
  return Math.min(100, Math.round((task.completedPomodoros / Math.max(1, task.estimatePomodoros)) * 100));
}

interface TaskItemProps {
  task: TodayTask;
  index: number;
  total: number;
  selected: boolean;
  locked: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
}

function TaskItem({ task, index, total, selected, locked, openMenuId, setOpenMenuId }: TaskItemProps) {
  const selectTask = usePomodoroStore((state) => state.selectTask);
  const updateTask = usePomodoroStore((state) => state.updateTask);
  const deleteTask = usePomodoroStore((state) => state.deleteTask);
  const markTaskDone = usePomodoroStore((state) => state.markTaskDone);
  const reorderTask = usePomodoroStore((state) => state.reorderTask);
  const [editing, setEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuOpen = openMenuId === task.id;
  const lockedTitle = locked ? '专注进行中，暂不可编辑任务。' : undefined;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen, setOpenMenuId]);

  const confirmDelete = () => {
    if (!locked) deleteTask(task.id);
    setOpenMenuId(null);
  };

  return (
    <article className={`task-card ${selected ? 'active' : ''} ${task.status === 'done' ? 'done' : ''}`}>
      <div className="task-card-head">
        <button className="task-main" onClick={() => !locked && task.status !== 'done' && selectTask(task.id)} disabled={locked || task.status === 'done'}>
          {task.status === 'done' ? <CheckCircle2 size={18} /> : selected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          <span className="task-text">
            <strong>{task.name}</strong>
            <small>{task.completedPomodoros}/{task.estimatePomodoros} 番茄 · {categoryLabel(task.category)} · {difficultyLabel(task.difficulty)}</small>
          </span>
        </button>
        <span className="task-state">{task.status === 'done' ? '已完成' : selected ? '当前' : '待开始'}</span>
      </div>

      <div className="task-progress" aria-label={`任务进度 ${taskProgress(task)}%`}><span style={{ width: `${taskProgress(task)}%` }} /></div>

      {editing && task.status !== 'done' && (
        <div className="task-edit-row">
          <input className="field" value={task.name} disabled={locked} onChange={(event) => updateTask(task.id, { name: event.target.value })} aria-label="编辑任务名称" />
          <input className="field" type="number" min={1} max={12} value={task.estimatePomodoros} disabled={locked} onChange={(event) => updateTask(task.id, { estimatePomodoros: Number(event.target.value) })} aria-label="编辑预计番茄数" />
        </div>
      )}

      <div className="task-actions">
        {task.status !== 'done' && <button className="task-action-primary" onClick={() => selectTask(task.id)} disabled={locked || selected}>设为当前</button>}
        {task.status !== 'done' && <button onClick={() => markTaskDone(task.id)} disabled={locked}>完成</button>}
        <div className="task-more" ref={menuRef}>
          <button type="button" className="task-more-trigger" aria-expanded={menuOpen} aria-label="更多任务操作" title={lockedTitle ?? '更多任务操作'} onClick={() => setOpenMenuId(menuOpen ? null : task.id)}>
            <MoreHorizontal size={16} /><span>更多</span>
          </button>
          {menuOpen && (
            <div className="task-more-menu" role="menu">
              {task.status !== 'done' && <button role="menuitem" onClick={() => { setEditing((value) => !value); setOpenMenuId(null); }} disabled={locked} title={lockedTitle}><Pencil size={14} />{editing ? '收起编辑' : '编辑'}</button>}
              {task.status !== 'done' && <button role="menuitem" onClick={() => { reorderTask(task.id, -1); setOpenMenuId(null); }} disabled={index === 0 || locked} title={lockedTitle}><ChevronUp size={14} />上移</button>}
              {task.status !== 'done' && <button role="menuitem" onClick={() => { reorderTask(task.id, 1); setOpenMenuId(null); }} disabled={index === total - 1 || locked} title={lockedTitle}><ChevronDown size={14} />下移</button>}
              <button role="menuitem" className="danger" onClick={confirmDelete} disabled={locked} title={lockedTitle}><Trash2 size={14} />删除</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

interface TaskSectionProps {
  title: string;
  tasks: TodayTask[];
  currentTaskId: string | null;
  locked: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  collapsible?: boolean;
}

function TaskSection({ title, tasks, currentTaskId, locked, openMenuId, setOpenMenuId, collapsible = false }: TaskSectionProps) {
  const [open, setOpen] = useState(!collapsible);
  if (!tasks.length) return null;

  return (
    <div className={`task-section ${collapsible ? 'collapsible' : ''}`}>
      {collapsible ? (
        <button className="task-section-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <span>{title}<small>{tasks.length}</small></span>
          <ChevronDown size={16} className={open ? 'rotate-180' : ''} />
        </button>
      ) : (
        <h3>{title}<small>{tasks.length}</small></h3>
      )}
      {open && (
        <div className="task-section-list">
          {tasks.map((task, index) => (
            <TaskItem key={task.id} task={task} index={index} total={tasks.length} selected={task.id === currentTaskId} locked={locked} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskList() {
  const rawTasks = usePomodoroStore((state) => state.tasks);
  const records = usePomodoroStore((state) => state.records);
  const tasks = useMemo(() => [...rawTasks].sort((a, b) => a.priority - b.priority), [rawTasks]);
  const currentTaskId = usePomodoroStore((state) => state.currentTaskId);
  const timer = usePomodoroStore((state) => state.timer);
  const addTask = usePomodoroStore((state) => state.addTask);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TaskCategory>('coding');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [estimate, setEstimate] = useState(2);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const isLocked = timer.status === 'running' && timer.mode === 'focus';
  const activeTask = tasks.filter((task) => task.status !== 'done' && task.id === currentTaskId);
  const todoTasks = tasks.filter((task) => task.status !== 'done' && task.id !== currentTaskId);
  const doneTasks = tasks.filter((task) => task.status === 'done');
  const todayRecords = records.filter((record) => new Date(record.endedAt).toDateString() === new Date().toDateString());
  const effectiveTodayRecords = todayRecords.filter(isEffectivePomodoro);

  const submit = () => {
    if (!name.trim()) return;
    addTask({ name, category, difficulty, estimatePomodoros: estimate });
    setName('');
  };

  return (
    <section className="panel task-list-panel" aria-labelledby="task-list-title">
      <div className="task-list-head">
        <div>
          <div id="task-list-title" className="panel-title"><Flag size={18} />当前任务列表</div>
          <p>{doneTasks.length}/{tasks.length} 已完成 · 今日有效 {effectiveTodayRecords.length} 轮。</p>
        </div>
      </div>

      <div className="quick-add">
        <div className="quick-add-row">
          <input
            className="field"
            value={name}
            maxLength={42}
            placeholder="添加任务，例如：整理演示脚本"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
          />
          <button className="icon-button" onClick={submit} disabled={!name.trim()} aria-label="添加今日任务"><Plus size={18} /></button>
        </div>
        <details className="task-options">
          <summary>设置类型、难度和预计番茄</summary>
          <div className="task-options-grid">
            <select className="field" value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)} aria-label="任务类型">
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select className="field" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} aria-label="任务难度">
              {difficulties.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input className="field" type="number" min={1} max={12} value={estimate} onChange={(event) => setEstimate(Number(event.target.value))} aria-label="预计番茄数" />
          </div>
        </details>
      </div>

      <div className="task-sections">
        {!tasks.length && <div className="empty-state">{todayRecords.length ? '当前任务列表为空；今日专注记录已保留在复盘区。添加任务后才能开始新一轮专注。' : '添加第一个今日任务后，才能开始专注。'}</div>}
        <TaskSection title="正在进行" tasks={activeTask} currentTaskId={currentTaskId} locked={isLocked} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} />
        <TaskSection title="待开始" tasks={todoTasks} currentTaskId={currentTaskId} locked={isLocked} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} />
        <TaskSection title="已完成" tasks={doneTasks} currentTaskId={currentTaskId} locked={isLocked} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} collapsible />
      </div>
    </section>
  );
}
