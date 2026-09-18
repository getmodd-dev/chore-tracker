import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ChoreTask, TaskCompletionLog, Child, ChoreCategory, AppTheme } from '../types';
import { ChoreIcon } from './ChoreIcon';
import { playChoreDing } from '../utils/sound';
import { formatScheduleLabel, isChoreScheduledForDate } from '../utils/schedule';
import { getPacificDateStr, getPacificParts, formatPacificDate } from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  RotateCcw,
  Check,
  Sparkles,
  Plus,
  Clock,
  Star,
  Award,
  AlertCircle,
} from 'lucide-react';

interface ChoreCalendarProps {
  tasks: ChoreTask[];
  logs: TaskCompletionLog[];
  childrenList: Child[];
  selectedChildId: string;
  currencySymbol: string;
  soundEnabled?: boolean;
  isParentMode: boolean;
  onCompleteTask: (taskId: string, childId?: string, dateStr?: string) => Promise<void>;
  onUndoLog: (logId: string) => Promise<void>;
  theme?: AppTheme;
}

export function toLocalDateStr(d: Date): string {
  return formatPacificDate(d);
}

export function parseLocalDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const ChoreCalendar: React.FC<ChoreCalendarProps> = ({
  tasks,
  logs,
  childrenList,
  selectedChildId,
  currencySymbol,
  soundEnabled = true,
  isParentMode,
  onCompleteTask,
  onUndoLog,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';
  const todayStr = getPacificDateStr(0);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [activeChildFilter, setActiveChildFilter] = useState<string>(selectedChildId || 'all');
  const [viewDate, setViewDate] = useState<Date>(() => {
    const parts = getPacificParts();
    return new Date(parts.year, parts.month - 1, 1);
  });
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [undoingLogId, setUndoingLogId] = useState<string | null>(null);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showAllIncomplete, setShowAllIncomplete] = useState(false);
  const [manualChoreId, setManualChoreId] = useState<string>('');
  const [manualChildId, setManualChildId] = useState<string>(selectedChildId || (childrenList[0]?.id ?? ''));

  // Month navigation
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleJumpToday = () => {
    const parts = getPacificParts();
    setViewDate(new Date(parts.year, parts.month - 1, 1));
    setSelectedDateStr(todayStr);
  };

  // Build month grid days
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Grid cells: 35 or 42 cells
  const calendarCells: {
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dateStr = toLocalDateStr(prevDate);
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateStr,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const dateStr = toLocalDateStr(cellDate);
    calendarCells.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateStr,
    });
  }

  // Next month leading days to complete grid rows
  const remainingCells = 7 - (calendarCells.length % 7);
  if (remainingCells < 7) {
    for (let d = 1; d <= remainingCells; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = toLocalDateStr(nextDate);
      calendarCells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
      });
    }
  }

  // Map of dateStr -> logs for quick lookup
  const logsByDate = new Map<string, TaskCompletionLog[]>();
  logs.forEach((log) => {
    if (activeChildFilter !== 'all' && log.childId !== activeChildFilter) return;
    const list = logsByDate.get(log.dateStr) || [];
    list.push(log);
    logsByDate.set(log.dateStr, list);
  });

  // Chores for the selected date
  const selectedDateLogs = logs.filter((l) => {
    if (l.dateStr !== selectedDateStr) return false;
    if (activeChildFilter !== 'all' && l.childId !== activeChildFilter) return false;
    return true;
  });

  // Calculate incomplete tasks for selected date
  // For each child in scope:
  const relevantChildren = activeChildFilter === 'all'
    ? childrenList
    : childrenList.filter((c) => c.id === activeChildFilter);

  interface IncompleteItem {
    task: ChoreTask;
    child: Child;
    isScheduled: boolean;
  }

  const incompleteScheduledTasks: IncompleteItem[] = [];
  const incompleteOtherTasks: IncompleteItem[] = [];

  relevantChildren.forEach((child) => {
    // Completed task IDs for this child on this date
    const doneIds = new Set(
      logs
        .filter((l) => l.dateStr === selectedDateStr && l.childId === child.id)
        .map((l) => l.taskId)
    );

    tasks.forEach((t) => {
      // Check assignment
      if (t.assignedTo && t.assignedTo.length > 0 && !t.assignedTo.includes(child.id)) {
        return;
      }
      if (!doneIds.has(t.id)) {
        const isScheduled = isChoreScheduledForDate(t, selectedDateStr);
        if (isScheduled) {
          incompleteScheduledTasks.push({ task: t, child, isScheduled: true });
        } else {
          incompleteOtherTasks.push({ task: t, child, isScheduled: false });
        }
      }
    });
  });

  const displayedIncompleteTasks = showAllIncomplete
    ? [...incompleteScheduledTasks, ...incompleteOtherTasks]
    : incompleteScheduledTasks;

  // Total points earned on selected date
  const selectedDatePointsEarned = selectedDateLogs.reduce((sum, l) => sum + (l.pointsEarned || 0), 0);

  // Parse formatted display date
  const selectedDateObj = parseLocalDateStr(selectedDateStr);
  const formattedSelectedDate = selectedDateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isSelectedToday = selectedDateStr === todayStr;

  // Handle Manual Completion
  const handleManualComplete = async (taskId: string, childId: string, event?: React.MouseEvent) => {
    setCompletingTaskId(`${taskId}-${childId}`);
    try {
      playChoreDing(soundEnabled);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
          particleCount: 35,
          spread: 50,
          origin: { x, y },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
        });
      }
      await onCompleteTask(taskId, childId, selectedDateStr);
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Handle Undo
  const handleUndo = async (logId: string) => {
    setUndoingLogId(logId);
    try {
      await onUndoLog(logId);
    } finally {
      setUndoingLogId(null);
    }
  };

  // Handle manual chore submit from modal
  const handleAddManualChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualChoreId || !manualChildId) return;
    await handleManualComplete(manualChoreId, manualChildId);
    setShowManualAddModal(false);
    setManualChoreId('');
  };

  return (
    <div id="chore-calendar-section" className="space-y-4">
      {/* Child Filter Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          id="calendar-filter-all"
          onClick={() => setActiveChildFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
            activeChildFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          All Children
        </button>

        {childrenList.map((child) => (
          <button
            key={child.id}
            id={`calendar-filter-${child.id}`}
            onClick={() => setActiveChildFilter(child.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
              activeChildFilter === child.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>{child.avatar}</span>
            <span>{child.name}</span>
          </button>
        ))}
      </div>

      {/* Calendar Card Container */}
      <div className={`rounded-3xl border shadow-sm p-4 sm:p-5 ${
        isFintech ? 'bg-[#0c1424] border-[#1d2d4c] text-white' : 'bg-white border-slate-200/90'
      }`}>
        {/* Calendar Month Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-bold flex items-center gap-2 ${isFintech ? 'text-white' : 'text-slate-900'}`}>
              <CalendarIcon className={`w-5 h-5 ${isFintech ? 'text-emerald-400' : 'text-indigo-600'}`} />
              <span>{monthName}</span>
            </h3>
            {viewDate.getMonth() !== new Date().getMonth() && (
              <button
                onClick={handleJumpToday}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                  isFintech
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60'
                    : 'text-indigo-600 hover:text-indigo-700 bg-indigo-50 border-indigo-100'
                }`}
              >
                Today
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              id="calendar-prev-month"
              onClick={handlePrevMonth}
              className={`p-2 rounded-xl active:scale-95 transition ${
                isFintech ? 'text-slate-400 hover:text-white hover:bg-[#15233c]' : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="calendar-next-month"
              onClick={handleNextMonth}
              className={`p-2 rounded-xl active:scale-95 transition ${
                isFintech ? 'text-slate-400 hover:text-white hover:bg-[#15233c]' : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-1">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarCells.map((cell, idx) => {
            const dayLogs = logsByDate.get(cell.dateStr) || [];
            const doneCount = dayLogs.length;
            const isFuture = cell.dateStr > todayStr;

            return (
              <button
                key={`${cell.dateStr}-${idx}`}
                id={`calendar-day-${cell.dateStr}`}
                onClick={() => setSelectedDateStr(cell.dateStr)}
                className={`relative flex flex-col items-center justify-between p-1.5 sm:p-2 min-h-[58px] sm:min-h-[64px] rounded-2xl transition active:scale-95 text-left border ${
                  cell.isSelected
                    ? isFintech
                      ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300'
                    : cell.isToday
                    ? isFintech
                      ? 'bg-[#13233f] text-emerald-400 border-emerald-500/40'
                      : 'bg-indigo-50/80 text-indigo-950 border-indigo-200'
                    : cell.isCurrentMonth
                    ? isFintech
                      ? 'bg-[#101a2e] hover:bg-[#162540] text-slate-200 border-[#1c2c48]'
                      : 'bg-slate-50/60 hover:bg-slate-100/80 text-slate-800 border-slate-200/60'
                    : isFintech
                    ? 'bg-transparent text-slate-600 border-transparent hover:bg-[#101a2e]/40'
                    : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-50'
                }`}
              >
                {/* Day number & Today pill */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs font-bold leading-none ${
                      cell.isSelected ? 'text-white' : cell.isToday ? 'text-indigo-700 font-extrabold' : ''
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {cell.isToday && !cell.isSelected && (
                    <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-100/90 px-1 py-0.2 rounded-sm">
                      Now
                    </span>
                  )}
                </div>

                {/* Day status indicator badge */}
                <div className="w-full mt-1 flex flex-col items-center justify-center">
                  {doneCount > 0 ? (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${
                        cell.isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>{doneCount}</span>
                    </span>
                  ) : !isFuture && cell.isCurrentMonth ? (
                    <span
                      className={`text-[10px] font-medium leading-none ${
                        cell.isSelected ? 'text-indigo-200' : 'text-slate-300'
                      }`}
                    >
                      —
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Calendar Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 mt-3 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Chores Completed</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>Selected Day</span>
            </span>
          </div>
          <span className="text-slate-400">Click any day to manage chores</span>
        </div>
      </div>

      {/* Selected Day View Card */}
      <div
        id="selected-day-details-card"
        className={`rounded-3xl border shadow-sm p-4 sm:p-5 space-y-4 ${
          isFintech ? 'bg-[#0c1424] border-[#1d2d4c] text-white' : 'bg-white border-slate-200/90'
        }`}
      >
        {/* Selected Date Summary Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
          isFintech ? 'border-[#1b2b48]' : 'border-slate-100'
        }`}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`text-base font-bold ${isFintech ? 'text-white' : 'text-slate-900'}`}>{formattedSelectedDate}</h4>
              {isSelectedToday && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isFintech ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  Today
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
              {activeChildFilter === 'all'
                ? 'Showing chore status for all children'
                : `Showing chore status for ${relevantChildren[0]?.name || 'Child'}`}
            </p>
          </div>

          {/* Day Metrics Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold ${
              isFintech
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-50 border border-emerald-200/70 text-emerald-800'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{selectedDateLogs.length} Completed</span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold ${
              isFintech
                ? 'bg-amber-950/60 border border-amber-500/30 text-amber-300'
                : 'bg-amber-50 border border-amber-200/70 text-amber-800'
            }`}>
              <Circle className="w-3.5 h-3.5 text-amber-500" />
              <span>{incompleteScheduledTasks.length} Incomplete Due</span>
            </div>

            {selectedDatePointsEarned > 0 && (
              <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold ${
                isFintech
                  ? 'bg-[#152744] border border-[#233a62] text-emerald-300'
                  : 'bg-indigo-50 border border-indigo-200/70 text-indigo-800'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>+{selectedDatePointsEarned} {currencySymbol}</span>
              </div>
            )}

            {/* Manual Add Chore Button */}
            <button
              id="calendar-manual-add-chore-btn"
              onClick={() => setShowManualAddModal(true)}
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 shadow-xs transition ${
                isFintech
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Chore</span>
            </button>
          </div>
        </div>

        {/* Section 1: Completed Chores for Selected Day */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Completed Chores ({selectedDateLogs.length})</span>
            </h5>
            {selectedDateLogs.length > 0 && (
              <span className="text-[11px] text-slate-400">Click Undo to reverse</span>
            )}
          </div>

          {selectedDateLogs.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-slate-500">
              <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-medium">No chores logged as completed on this day.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mark any chore below to complete it for this date.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateLogs.map((log) => {
                const childObj = childrenList.find((c) => c.id === log.childId);
                const isUndoing = undoingLogId === log.id;
                const timeStr = new Date(log.completedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={log.id}
                    id={`completed-chore-${log.id}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 hover:bg-emerald-50/70 transition gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {log.taskTitle}
                          </span>
                          <span className="text-[11px] text-slate-500 bg-white/80 px-1.5 py-0.5 rounded-md border border-slate-200/60">
                            {childObj?.avatar} {childObj?.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Completed at {timeStr}
                          {log.note && <span className="italic"> • "{log.note}"</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {log.pointsEarned > 0 && (
                        <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg">
                          +{log.pointsEarned} {currencySymbol}
                        </span>
                      )}

                      {/* Undo Button */}
                      <button
                        id={`btn-undo-log-${log.id}`}
                        onClick={() => handleUndo(log.id)}
                        disabled={isUndoing}
                        className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
                        title="Undo completion and revert points"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
                        <span>Undo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Incomplete Chores for Selected Day */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Circle className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Incomplete Chores ({displayedIncompleteTasks.length}
                {!showAllIncomplete && incompleteOtherTasks.length > 0 ? ` due` : ''})
              </span>
            </h5>
            <div className="flex items-center gap-2">
              {incompleteOtherTasks.length > 0 && (
                <button
                  type="button"
                  id="calendar-toggle-all-incomplete-btn"
                  onClick={() => setShowAllIncomplete(!showAllIncomplete)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {showAllIncomplete
                    ? 'Show only chores scheduled for this date'
                    : `+ Show ${incompleteOtherTasks.length} other unscheduled chores`}
                </button>
              )}
              <span className="text-[11px] text-slate-400">Click to complete for this date</span>
            </div>
          </div>

          {displayedIncompleteTasks.length === 0 ? (
            <div className="text-center py-6 px-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 text-emerald-800">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs font-bold">
                {incompleteOtherTasks.length > 0
                  ? 'All chores scheduled for this date are completed!'
                  : 'All assigned chores are completed for this day!'}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">
                {incompleteOtherTasks.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllIncomplete(true)}
                    className="underline font-semibold hover:text-emerald-900"
                  >
                    Click to view {incompleteOtherTasks.length} unscheduled chores
                  </button>
                ) : (
                  'Great job! You can still log chores using the button above.'
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
              {displayedIncompleteTasks.map(({ task, child, isScheduled }) => {
                const isCompleting = completingTaskId === `${task.id}-${child.id}`;
                const isAllowanceDuty = task.choreType === 'allowance' || (!task.choreType && !task.isBonus);
                const scheduleBadge = formatScheduleLabel(task);

                return (
                  <div
                    key={`${task.id}-${child.id}`}
                    id={`incomplete-task-${task.id}-${child.id}`}
                    className={`flex items-center justify-between p-3 rounded-2xl bg-white border transition gap-3 ${
                      isScheduled ? 'border-slate-200/90 hover:border-indigo-300 hover:shadow-2xs' : 'border-dashed border-slate-200 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/60">
                        <ChoreIcon name={task.icon} className="w-4 h-4 text-indigo-600" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {task.title}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {child.avatar} {child.name}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <CalendarIcon className="w-2.5 h-2.5" />
                            {scheduleBadge}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAllowanceDuty ? (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                          Allowance Duty
                        </span>
                      ) : (
                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                          +{task.points} {currencySymbol}
                        </span>
                      )}

                      {/* Manual Complete Button */}
                      <button
                        id={`btn-complete-task-${task.id}-${child.id}`}
                        onClick={(e) => handleManualComplete(task.id, child.id, e)}
                        disabled={isCompleting}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[3] ${isCompleting ? 'animate-spin' : ''}`} />
                        <span>{isCompleting ? 'Saving...' : 'Mark Done'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Chore Entry Modal */}
      {showManualAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Log Chore for {formattedSelectedDate}
              </h3>
              <button
                onClick={() => setShowManualAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualChore} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Child</label>
                <select
                  value={manualChildId}
                  onChange={(e) => setManualChildId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  {childrenList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.avatar} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Chore to Complete</label>
                <select
                  value={manualChoreId}
                  onChange={(e) => setManualChoreId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose a chore --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({formatScheduleLabel(t)} • {t.choreType === 'allowance' ? 'Allowance' : `+${t.points} pts`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualAddModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!manualChoreId}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                >
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
