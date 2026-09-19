import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ChoreTask, ChoreCategory, Child, TaskCompletionLog, AppTheme } from '../types';
import { ChoreIcon } from './ChoreIcon';
import { ChoreIconPicker } from './ChoreIconPicker';
import {
  Check,
  Plus,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Calendar,
  Search,
  Trash2,
  Edit2,
  Clock,
  Minimize2,
  Maximize2,
  Users,
  User,
} from 'lucide-react';
import { playChoreDing } from '../utils/sound';
import {
  DAYS_OF_WEEK,
  formatScheduleLabel,
  isChoreScheduledForDate,
  formatLocalDate,
} from '../utils/schedule';
import { getPacificDateStr, getPacificDayOfWeek } from '../utils/dateUtils';

interface TaskListViewProps {
  child: Child;
  childrenList?: Child[];
  tasks: ChoreTask[];
  todayLogs: TaskCompletionLog[];
  currencySymbol: string;
  soundEnabled: boolean;
  isParentMode: boolean;
  onCompleteTask: (taskId: string) => Promise<void>;
  onUndoTask: (logId: string) => Promise<void>;
  onAddNewTask: (task: Omit<ChoreTask, 'id'>) => void;
  onUpdateTask?: (task: ChoreTask) => void;
  onDeleteTask: (taskId: string) => void;
  theme?: AppTheme;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  child,
  childrenList = [],
  tasks,
  todayLogs,
  currencySymbol,
  soundEnabled,
  isParentMode,
  onCompleteTask,
  onUndoTask,
  onAddNewTask,
  onUpdateTask,
  onDeleteTask,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';
  const [scheduleViewFilter, setScheduleViewFilter] = useState<'due_today' | 'all'>('due_today');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);

  // Compact / Minimized view state for child's chore list (persisted in localStorage, defaults to true)
  const [isCompactView, setIsCompactView] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('chore_tracker_compact_view');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleCompactView = () => {
    setIsCompactView((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('chore_tracker_compact_view', String(next));
      } catch {}
      return next;
    });
  };

  const todayStr = formatLocalDate(new Date());

  // Task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPoints, setNewPoints] = useState(25);
  const [newCategory, setNewCategory] = useState<ChoreCategory>('daily_routine');
  const [newIcon, setNewIcon] = useState('sparkles');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'anytime'>('daily');
  const [newChoreType, setNewChoreType] = useState<'allowance' | 'bonus_points' | 'both'>('allowance');
  const [newDaysOfWeek, setNewDaysOfWeek] = useState<number[]>([getPacificDayOfWeek()]);
  const [newIntervalWeeks, setNewIntervalWeeks] = useState<number>(1);
  const [newScheduleStartDate, setNewScheduleStartDate] = useState<string>(todayStr);
  const [newAssignedTo, setNewAssignedTo] = useState<string[]>([]);

  // Set of completed task IDs for today
  const completedTaskMap = new Map<string, TaskCompletionLog>();
  todayLogs.forEach((log) => {
    if (log.childId === child.id) {
      completedTaskMap.set(log.taskId, log);
    }
  });

  const handleOpenAddModal = () => {
    setEditingTaskId(null);
    setNewTitle('');
    setNewDesc('');
    setNewPoints(25);
    setNewCategory('daily_routine');
    setNewIcon('sparkles');
    setNewFrequency('daily');
    setNewChoreType('allowance');
    setNewDaysOfWeek([getPacificDayOfWeek()]);
    setNewIntervalWeeks(1);
    setNewScheduleStartDate(todayStr);
    setNewAssignedTo([]);
    setShowModal(true);
  };

  const handleOpenEditModal = (task: ChoreTask) => {
    setEditingTaskId(task.id);
    setNewTitle(task.title);
    setNewDesc(task.description || '');
    setNewPoints(task.points);
    setNewCategory(task.category);
    setNewIcon(task.icon);
    setNewFrequency(task.frequency);
    setNewChoreType(task.choreType || 'allowance');
    setNewDaysOfWeek(task.daysOfWeek && task.daysOfWeek.length > 0 ? [...task.daysOfWeek] : [getPacificDayOfWeek()]);
    setNewIntervalWeeks(task.intervalWeeks || 1);
    setNewScheduleStartDate(task.scheduleStartDate || todayStr);
    setNewAssignedTo(task.assignedTo || []);
    setShowModal(true);
  };

  const filteredTasks = tasks.filter((task) => {
    // Check if task is assigned to this child
    if (task.assignedTo && task.assignedTo.length > 0 && !task.assignedTo.includes(child.id)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(q) || (task.description && task.description.toLowerCase().includes(q));
    }
    if (scheduleViewFilter === 'due_today') {
      const isDoneToday = completedTaskMap.has(task.id);
      const isDueToday = isChoreScheduledForDate(task, todayStr);
      return isDoneToday || isDueToday;
    }
    return true;
  });

  // Calculate counts for Due Today vs All Chores
  const assignedTasks = tasks.filter((t) => !t.assignedTo || t.assignedTo.length === 0 || t.assignedTo.includes(child.id));
  const dueTodayCount = assignedTasks.filter((t) => completedTaskMap.has(t.id) || isChoreScheduledForDate(t, todayStr)).length;
  const allCount = assignedTasks.length;

  // Sort tasks: incomplete daily/scheduled first, then incomplete anytime, then completed at bottom
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aDone = completedTaskMap.has(a.id);
    const bDone = completedTaskMap.has(b.id);
    if (aDone !== bDone) return aDone ? 1 : -1;
    const freqOrder: Record<string, number> = { daily: 0, weekly: 1, anytime: 2 };
    const aOrder = freqOrder[a.frequency] ?? 1;
    const bOrder = freqOrder[b.frequency] ?? 1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.points - a.points;
  });

  const handleComplete = async (taskId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger celebration effects
    setAnimatingTaskId(taskId);
    playChoreDing(soundEnabled);

    // Confetti from click coordinates
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 45,
      spread: 60,
      origin: { x, y },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      ticks: 200,
    });

    await onCompleteTask(taskId);
    setTimeout(() => {
      setAnimatingTaskId(null);
    }, 600);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const taskPayload = {
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      points: newChoreType === 'allowance' ? 0 : Math.max(1, Number(newPoints) || 1),
      category: newCategory,
      icon: newIcon,
      frequency: newFrequency,
      daysOfWeek: newFrequency === 'weekly' ? (newDaysOfWeek.length > 0 ? newDaysOfWeek : [getPacificDayOfWeek()]) : undefined,
      intervalWeeks: newFrequency === 'weekly' ? newIntervalWeeks : undefined,
      scheduleStartDate: newFrequency === 'weekly' && newIntervalWeeks === 2 ? newScheduleStartDate : undefined,
      isBonus: newChoreType === 'bonus_points' || newCategory === 'bonus',
      choreType: newChoreType,
      assignedTo: newAssignedTo.length > 0 ? newAssignedTo : undefined,
    };

    if (editingTaskId && onUpdateTask) {
      onUpdateTask({
        ...taskPayload,
        id: editingTaskId,
      });
    } else {
      onAddNewTask(taskPayload);
    }

    setShowModal(false);
  };

  // Preview label for recurrence schedule
  const previewScheduleLabel = formatScheduleLabel({
    id: 'preview',
    title: '',
    category: newCategory,
    points: 0,
    icon: '',
    frequency: newFrequency,
    daysOfWeek: newDaysOfWeek,
    intervalWeeks: newIntervalWeeks,
    scheduleStartDate: newScheduleStartDate,
  });

  return (
    <div id="tasks-view" className="space-y-3">
      {/* View Filter: Due Today vs All Scheduled & View Mode Toggle */}
      <div
        className={`flex items-center justify-between gap-2 flex-wrap p-1.5 rounded-2xl transition-colors ${
          isFintech ? 'bg-[#0d1628] border border-[#1b2a47]' : 'bg-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-1">
          <button
            id="tasks-filter-due-today"
            onClick={() => setScheduleViewFilter('due_today')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              scheduleViewFilter === 'due_today'
                ? isFintech
                  ? 'bg-[#182642] text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'bg-white text-indigo-700 shadow-xs'
                : isFintech
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isFintech ? 'text-emerald-400' : ''}`} />
            <span>Due Today</span>
            <span
              className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isFintech ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {dueTodayCount}
            </span>
          </button>

          <button
            id="tasks-filter-all"
            onClick={() => setScheduleViewFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              scheduleViewFilter === 'all'
                ? isFintech
                  ? 'bg-[#182642] text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'bg-white text-indigo-700 shadow-xs'
                : isFintech
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>All Tasks</span>
            <span
              className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isFintech ? 'bg-[#16223a] text-slate-300 border border-[#223356]' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {allCount}
            </span>
          </button>
        </div>

        {/* View Mode Toggle: Compact vs Detailed + Parent Add Button */}
        <div className="flex items-center gap-1.5">
          <button
            id="toggle-compact-view-btn"
            onClick={toggleCompactView}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 border ${
              isCompactView
                ? isFintech
                  ? 'bg-[#182644] text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-white text-indigo-700 border-indigo-200/80 shadow-xs'
                : isFintech
                ? 'bg-[#10192e] text-slate-400 border-[#1d2d4c] hover:text-white'
                : 'bg-white/80 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
            title={isCompactView ? 'Currently in Compact view (minimized). Click for Detailed cards.' : 'Currently in Detailed view. Click for Compact list.'}
          >
            {isCompactView ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-500" />
                <span>Compact View</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Detailed View</span>
              </>
            )}
          </button>

          {isParentMode && (
            <button
              id="parent-add-chore-btn"
              onClick={handleOpenAddModal}
              className={`flex items-center gap-1 active:scale-95 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition ${
                isFintech
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Subheader with Search */}
      <div className="relative">
        <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isFintech ? 'text-emerald-400' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder={isFintech ? "Search quests & bounties..." : "Search chores..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl focus:outline-none transition ${
            isFintech
              ? 'bg-[#10192e] border border-[#1d2d4c] text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              : 'bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-2xs'
          }`}
        />
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {sortedTasks.length === 0 ? (
          <div
            className={`text-center py-10 rounded-3xl p-6 transition ${
              isFintech ? 'bg-[#10192e] border border-[#1d2d4c] text-slate-300' : 'bg-white border border-slate-200/80'
            }`}
          >
            <Sparkles className={`w-10 h-10 mx-auto mb-2 opacity-60 ${isFintech ? 'text-emerald-400' : 'text-indigo-400'}`} />
            <h4 className={`text-sm font-bold ${isFintech ? 'text-white' : 'text-slate-800'}`}>
              {isFintech ? 'No Active Quests Found' : 'No chores found'}
            </h4>
            <p className={`text-xs mt-1 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
              {scheduleViewFilter === 'due_today'
                ? "No chores scheduled for today! Switch to 'All Tasks' above to view other days."
                : 'Try another category or add a new chore above.'}
            </p>
            {scheduleViewFilter === 'due_today' && (
              <button
                onClick={() => setScheduleViewFilter('all')}
                className={`mt-3 inline-flex items-center gap-1 text-xs font-bold hover:underline ${
                  isFintech ? 'text-emerald-400' : 'text-indigo-600'
                }`}
              >
                <span>View all scheduled tasks</span>
              </button>
            )}
          </div>
        ) : (
          sortedTasks.map((task) => {
            const completionLog = completedTaskMap.get(task.id);
            const isCompletedToday = !!completionLog;
            const isAnimating = animatingTaskId === task.id;
            const isDueToday = isChoreScheduledForDate(task, todayStr);

            if (isCompactView) {
              return (
                <div
                  key={task.id}
                  id={`task-item-${task.id}`}
                  className={`flex items-center justify-between py-2 px-3 sm:py-2.5 rounded-xl border transition-all ${
                    isCompletedToday
                      ? isFintech
                        ? 'bg-[#0b1222]/80 border-[#15233c] opacity-75'
                        : 'bg-emerald-50/70 border-emerald-200/80 opacity-85'
                      : isFintech
                      ? 'bg-[#111c33] hover:border-emerald-500/50 border-[#1e2f52] shadow-sm'
                      : 'bg-white hover:border-indigo-300 border-slate-200/90 shadow-2xs'
                  }`}
                >
                  {/* Left: Icon & Title */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-transform ${
                        isCompletedToday
                          ? isFintech
                            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                            : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : isFintech
                          ? 'bg-[#182644] border-[#22365e] text-emerald-400'
                          : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                      } ${isAnimating ? 'scale-125 rotate-12' : ''}`}
                    >
                      {isCompletedToday ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <ChoreIcon name={task.icon} className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <h4
                        className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
                          isCompletedToday
                            ? isFintech
                              ? 'text-slate-500 line-through'
                              : 'text-emerald-950 line-through'
                            : isFintech
                            ? 'text-white'
                            : 'text-slate-900'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </h4>

                      {/* Points / Allowance badge */}
                      {task.choreType === 'allowance' ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                            isFintech
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                          title="Monthly Allowance Chore"
                        >
                          💵
                        </span>
                      ) : task.choreType === 'both' ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 font-mono ${
                            isFintech
                              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          +{task.points} {currencySymbol} + 💵
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 font-mono ${
                            isFintech
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          +{task.points} {currencySymbol}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Complete Button / Undo & Parent actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCompletedToday ? (
                      <div className="flex items-center gap-1">
                        <span className={`text-[11px] font-bold mr-1 ${isFintech ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          Done ✓
                        </span>
                        <button
                          onClick={() => onUndoTask(completionLog.id)}
                          className={`p-1.5 rounded-lg active:scale-95 transition border ${
                            isFintech
                              ? 'text-slate-400 hover:text-rose-400 bg-[#15233c] border-[#22365e]'
                              : 'text-slate-400 hover:text-rose-600 bg-white border-slate-200'
                          }`}
                          title="Undo Chore Completion"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleComplete(task.id, e)}
                        className={`flex items-center gap-1 active:scale-95 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                          isFintech
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                            : task.choreType === 'allowance'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Complete</span>
                      </button>
                    )}

                    {isParentMode && (
                      <div className="flex items-center gap-0.5 ml-1">
                        <button
                          onClick={() => handleOpenEditModal(task)}
                          className={`p-1.5 rounded-lg transition ${
                            isFintech
                              ? 'text-slate-400 hover:text-emerald-400 hover:bg-[#1d2d4c]'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                          }`}
                          title="Edit Chore"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className={`p-1.5 rounded-lg transition ${
                            isFintech
                              ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Delete Chore"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={task.id}
                id={`task-item-${task.id}`}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isCompletedToday
                    ? isFintech
                      ? 'bg-[#0b1222]/80 border-[#15233c] opacity-80'
                      : 'bg-emerald-50/60 border-emerald-200/80 opacity-90'
                    : isFintech
                    ? 'bg-[#111c33] hover:border-emerald-500/50 border-[#1e2f52] shadow-md'
                    : 'bg-white hover:border-indigo-300 border-slate-200/80 shadow-xs'
                }`}
              >
                {/* Left info */}
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform ${
                      isCompletedToday
                        ? isFintech
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                          : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : isFintech
                        ? 'bg-[#182644] border-[#22365e] text-emerald-400'
                        : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                    } ${isAnimating ? 'scale-125 rotate-12' : ''}`}
                  >
                    {isCompletedToday ? (
                      <Check className="w-6 h-6 stroke-[3]" />
                    ) : (
                      <ChoreIcon name={task.icon} className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4
                        className={`text-sm font-bold tracking-tight truncate ${
                          isCompletedToday
                            ? isFintech
                              ? 'text-slate-500 line-through'
                              : 'text-emerald-950 line-through'
                            : isFintech
                            ? 'text-white'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {/* Allowance vs Bonus/Prize badge */}
                      {task.choreType === 'allowance' ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
                            isFintech
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          💵 Direct Deposit
                        </span>
                      ) : task.choreType === 'both' ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
                            isFintech
                              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          💵 + 💎 Bounty
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
                            isFintech
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          💎 Bonus Only
                        </span>
                      )}

                      {/* Schedule Badge */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isFintech
                            ? 'bg-[#182644] text-slate-300 border border-[#22365e]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Calendar className={`w-2.5 h-2.5 ${isFintech ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{formatScheduleLabel(task)}</span>
                      </span>

                      {/* Assigned Children Badge */}
                      {task.assignedTo && task.assignedTo.length > 0 ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isFintech
                              ? 'bg-purple-950/70 text-purple-300 border border-purple-500/30'
                              : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                          }`}
                          title={`Assigned to: ${task.assignedTo
                            .map((id) => childrenList.find((c) => c.id === id)?.name || id)
                            .join(', ')}`}
                        >
                          <User className="w-2.5 h-2.5 shrink-0" />
                          <span>
                            {task.assignedTo
                              .map((id) => {
                                const ch = childrenList.find((c) => c.id === id);
                                return ch ? `${ch.avatar} ${ch.name}` : id;
                              })
                              .join(', ')}
                          </span>
                        </span>
                      ) : isParentMode ? (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                            isFintech
                              ? 'bg-[#15233c] text-slate-400 border border-[#21355a]'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                          title="Shared task assigned to all children"
                        >
                          <Users className="w-2.5 h-2.5 shrink-0" />
                          <span>All Kids</span>
                        </span>
                      ) : null}

                      {/* Due Today Badge */}
                      {!isCompletedToday && isDueToday && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            isFintech
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                          }`}
                        >
                          Due Today
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className={`text-xs truncate mt-0.5 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                        {task.description}
                      </p>
                    )}

                    {isCompletedToday && (
                      <span
                        className={`text-[10px] font-semibold flex items-center gap-1 mt-0.5 ${
                          isFintech ? 'text-emerald-400 font-mono' : 'text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {completionLog.pointsEarned > 0 ? (
                          <>Executed (+{completionLog.pointsEarned} {currencySymbol})</>
                        ) : (
                          <>Executed (Earned towards Monthly Allowance 💵)</>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {isCompletedToday ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUndoTask(completionLog.id)}
                        className={`p-2 rounded-xl active:scale-95 transition border ${
                          isFintech
                            ? 'text-slate-400 hover:text-rose-400 bg-[#15233c] hover:bg-rose-950/40 border-[#22365e]'
                            : 'text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border-slate-200'
                        }`}
                        title="Undo Chore Completion"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleComplete(task.id, e)}
                      className={`flex items-center gap-1.5 active:scale-95 px-3.5 py-2 rounded-xl text-xs font-bold transition group ${
                        isFintech
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                          : task.choreType === 'allowance'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      }`}
                    >
                      {task.choreType === 'allowance' ? (
                        <>
                          <span className={isFintech ? 'text-slate-950 font-bold' : 'text-emerald-200'}>💵</span>
                          <span>Complete</span>
                        </>
                      ) : task.choreType === 'both' ? (
                        <>
                          <span className={isFintech ? 'font-mono text-slate-950 font-black' : 'text-amber-300 font-black'}>
                            +{task.points}
                          </span>
                          <span>{currencySymbol}</span>
                          <span className="text-[11px] font-bold">+💵</span>
                          <span className="hidden sm:inline">Complete</span>
                        </>
                      ) : (
                        <>
                          <span className={isFintech ? 'font-mono text-slate-950 font-black' : 'text-amber-300 font-black'}>
                            +{task.points}
                          </span>
                          <span>{currencySymbol}</span>
                          <span className="hidden sm:inline">Complete</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Parent mode actions: Edit & Delete */}
                  {isParentMode && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(task)}
                        className={`p-1.5 rounded-xl transition ${
                          isFintech
                            ? 'text-slate-400 hover:text-emerald-400 bg-[#16223a] hover:bg-[#1d2d4c]'
                            : 'text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50'
                        }`}
                        title="Edit Chore & Schedule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className={`p-1.5 rounded-xl transition ${
                          isFintech
                            ? 'text-slate-400 hover:text-rose-400 bg-[#16223a] hover:bg-rose-950/40'
                            : 'text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50'
                        }`}
                        title="Delete Chore"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Parent Add / Edit Chore Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-200 my-8">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editingTaskId ? 'Edit Chore & Schedule' : 'Add New Chore'}
            </h3>
            <form onSubmit={handleSaveTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Chore Title</label>
                <input
                  type="text"
                  placeholder="e.g. Put Away Laundry"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-950 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Fold clothes and place in drawers"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Prize Points {newChoreType === 'allowance' ? '(0 for Allowance)' : 'Value (Min: 1)'}
                  </label>
                  {newChoreType === 'allowance' ? (
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 flex items-center justify-between">
                      <span className="text-emerald-700 font-bold">0 pts</span>
                      <span className="text-[10px] text-slate-400">Monthly Cash % only</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="500"
                      step="1"
                      value={newPoints}
                      onChange={(e) => setNewPoints(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Frequency</label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as 'daily' | 'weekly' | 'anytime')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="daily">Daily (Every Day)</option>
                    <option value="weekly">Specific Day(s) of the Week</option>
                    <option value="anytime">Anytime (Flexible)</option>
                  </select>
                </div>
              </div>

              {/* Day of the Week & Bi-weekly Interval Selector */}
              {newFrequency === 'weekly' && (
                <div className="space-y-2.5 bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800 text-xs">
                      Select Day(s) of the Week
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold">
                      {newDaysOfWeek.length === 0 ? 'Select at least 1 day' : `${newDaysOfWeek.length} selected`}
                    </span>
                  </div>

                  {/* Day Buttons */}
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = newDaysOfWeek.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (newDaysOfWeek.length > 1) {
                                setNewDaysOfWeek(newDaysOfWeek.filter((item) => item !== d.day));
                              }
                            } else {
                              setNewDaysOfWeek([...newDaysOfWeek, d.day].sort());
                            }
                          }}
                          className={`h-9 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition active:scale-95 ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                          title={d.label}
                        >
                          <span className="text-[11px] leading-none">{d.short}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[10px]">
                    <span className="text-slate-500 font-medium">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => setNewDaysOfWeek([3])}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 font-semibold"
                    >
                      Wednesdays
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDaysOfWeek([5])}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 font-semibold"
                    >
                      Fridays
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDaysOfWeek([1, 2, 3, 4, 5])}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 font-semibold"
                    >
                      Weekdays
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDaysOfWeek([0, 6])}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 font-semibold"
                    >
                      Weekends
                    </button>
                  </div>

                  {/* Recurrence Interval (Every week vs Every other week) */}
                  <div className="pt-2 border-t border-indigo-200/60 space-y-1.5">
                    <label className="block font-bold text-slate-800 text-xs">
                      Repeat Interval
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewIntervalWeeks(1)}
                        className={`py-2 px-2.5 rounded-xl border text-left transition ${
                          newIntervalWeeks === 1
                            ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                            : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <div className="text-xs font-bold">Every week</div>
                        <div className="text-[10px] text-slate-500">e.g. Every Wednesday</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewIntervalWeeks(2)}
                        className={`py-2 px-2.5 rounded-xl border text-left transition ${
                          newIntervalWeeks === 2
                            ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                            : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <div className="text-xs font-bold">Every other week</div>
                        <div className="text-[10px] text-slate-500">e.g. Every other Friday</div>
                      </button>
                    </div>

                    {newIntervalWeeks === 2 && (
                      <div className="mt-2 bg-white p-2.5 rounded-xl border border-indigo-200/80 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Starting / Anchor Week
                        </label>
                        <input
                          type="date"
                          value={newScheduleStartDate}
                          onChange={(e) => setNewScheduleStartDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-indigo-600">
                          This sets which alternating weeks the chore is scheduled for.
                        </p>
                      </div>
                    )}

                    {/* Live Preview Pill */}
                    <div className="bg-white/90 border border-indigo-200 text-indigo-900 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 mt-1">
                      <span>🗓️</span>
                      <span>
                        Resulting Schedule: <strong className="font-black text-indigo-700">{previewScheduleLabel}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Icon & Emoji Picker (No Category Needed) */}
              <ChoreIconPicker value={newIcon} onChange={setNewIcon} />

              {/* Chore Purpose / System Selector */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Chore Track / Purpose</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewChoreType('allowance');
                      setNewPoints(0);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newChoreType === 'allowance'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>💵</span> Allowance
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Monthly cash % (0 prize pts)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewChoreType('bonus_points');
                      if (newPoints === 0) setNewPoints(20);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newChoreType === 'bonus_points'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>⭐</span> Prize Only
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Extra chore for store pts
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewChoreType('both');
                      if (newPoints === 0) setNewPoints(20);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newChoreType === 'both'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>✨</span> Both
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Allowance % + Prize pts
                    </p>
                  </button>
                </div>
              </div>

              {/* Who is this chore for? (Assign to Specific Children or All) */}
              <div className="pt-2.5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800 text-xs">
                    Assign Chore To
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {newAssignedTo.length === 0 ? 'All Children' : `${newAssignedTo.length} Child Selected`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAssignedTo([])}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                      newAssignedTo.length === 0
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>All Children</span>
                  </button>

                  {childrenList.map((ch) => {
                    const isSelected = newAssignedTo.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            const updated = newAssignedTo.filter((id) => id !== ch.id);
                            setNewAssignedTo(updated);
                          } else {
                            setNewAssignedTo([...newAssignedTo, ch.id]);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm">{ch.avatar}</span>
                        <span className="truncate">{ch.name} Only</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {newAssignedTo.length === 0
                    ? 'Shared: Every child has this chore on their daily/weekly schedule.'
                    : `Assigned specifically to: ${newAssignedTo
                        .map((id) => childrenList.find((c) => c.id === id)?.name || id)
                        .join(', ')}.`}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm"
                >
                  {editingTaskId ? 'Save Changes' : 'Save Chore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

