import React, { useState } from 'react';
import { Child, TaskCompletionLog, ChoreTask, AppTheme } from '../types';
import { ChoreCalendar } from './ChoreCalendar';
import {
  Clock,
  Filter,
  RotateCcw,
  PlusCircle,
  MinusCircle,
  Star,
  Sparkles,
  CheckCircle2,
  Calendar as CalendarIcon,
  ListOrdered,
} from 'lucide-react';

interface ActivityHistoryViewProps {
  logs: TaskCompletionLog[];
  tasks: ChoreTask[];
  childrenList: Child[];
  selectedChildId: string;
  currencySymbol: string;
  soundEnabled?: boolean;
  isParentMode: boolean;
  onUndoLog: (logId: string) => Promise<void>;
  onCompleteTask: (taskId: string, childId?: string, dateStr?: string) => Promise<void>;
  onAdjustPoints: (childId: string, amount: number, reason: string) => Promise<void>;
  theme?: AppTheme;
}

export const ActivityHistoryView: React.FC<ActivityHistoryViewProps> = ({
  logs,
  tasks,
  childrenList,
  selectedChildId,
  currencySymbol,
  soundEnabled = true,
  isParentMode,
  onUndoLog,
  onCompleteTask,
  onAdjustPoints,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';
  const [historyTab, setHistoryTab] = useState<'calendar' | 'feed'>('calendar');
  const [childFilter, setChildFilter] = useState<string>(selectedChildId);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(25);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustChildId, setAdjustChildId] = useState<string>(selectedChildId);

  const filteredLogs = logs.filter((log) => {
    if (childFilter === 'all') return true;
    return log.childId === childFilter;
  });

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason.trim()) return;
    await onAdjustPoints(adjustChildId, Number(adjustAmount), adjustReason.trim());
    setAdjustReason('');
    setShowAdjustModal(false);
  };

  return (
    <div id="activity-history-view" className="space-y-4">
      {/* Top Bar with Mode Switcher & Adjust Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Segmented Control: Calendar vs Activity Feed */}
        <div className={`flex p-1 rounded-2xl ${isFintech ? 'bg-[#0f1a2e] border border-[#1d2d4c]' : 'bg-slate-200/80'}`}>
          <button
            id="history-tab-calendar"
            onClick={() => setHistoryTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              historyTab === 'calendar'
                ? isFintech
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-white text-indigo-700 shadow-xs'
                : isFintech
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar Day View</span>
          </button>
          <button
            id="history-tab-feed"
            onClick={() => setHistoryTab('feed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              historyTab === 'feed'
                ? isFintech
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-white text-indigo-700 shadow-xs'
                : isFintech
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Activity Feed</span>
          </button>
        </div>

        {isParentMode && (
          <button
            id="history-adjust-points-btn"
            onClick={() => {
              setAdjustChildId(selectedChildId);
              setShowAdjustModal(true);
            }}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 shadow-xs transition ${
              isFintech
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bonus / Adjust Points</span>
          </button>
        )}
      </div>

      {/* Mode 1: Calendar View */}
      {historyTab === 'calendar' ? (
        <ChoreCalendar
          tasks={tasks}
          logs={logs}
          childrenList={childrenList}
          selectedChildId={selectedChildId}
          currencySymbol={currencySymbol}
          soundEnabled={soundEnabled}
          isParentMode={isParentMode}
          onCompleteTask={onCompleteTask}
          onUndoLog={onUndoLog}
          theme={theme}
        />
      ) : (
        /* Mode 2: Timeline Activity Feed */
        <div className="space-y-4">
          {/* Filter by Child Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setChildFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                childFilter === 'all'
                  ? isFintech
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-white shadow-xs'
                  : isFintech
                  ? 'bg-[#101c32] text-slate-300 border border-[#1e2f4e] hover:bg-[#162744]'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Children
            </button>

            {childrenList.map((child) => (
              <button
                key={child.id}
                onClick={() => setChildFilter(child.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                  childFilter === child.id
                    ? isFintech
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-indigo-600 text-white shadow-xs'
                    : isFintech
                    ? 'bg-[#101c32] text-slate-300 border border-[#1e2f4e] hover:bg-[#162744]'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{child.avatar}</span>
                <span>{child.name}</span>
              </button>
            ))}
          </div>

          {/* Logs Timeline List */}
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className={`text-center py-10 rounded-3xl border p-6 ${isFintech ? 'bg-[#0c1424] border-[#1d2d4c]' : 'bg-white border-slate-200/80'}`}>
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <h4 className={`text-sm font-bold ${isFintech ? 'text-white' : 'text-slate-800'}`}>No activity logged yet</h4>
                <p className={`text-xs mt-1 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>Completed chores will appear here in real time.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const childObj = childrenList.find((c) => c.id === log.childId);
                const date = new Date(log.completedAt);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isPositive = log.pointsEarned >= 0;

                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      isFintech
                        ? 'bg-[#0c1424] border-[#1a2b49] text-slate-100 shadow-2xs'
                        : 'bg-white border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${
                        isFintech ? 'bg-[#13233f] border-[#1f355c]' : 'bg-slate-100 border-slate-200/60'
                      }`}>
                        {childObj?.avatar || '🧒'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className={`font-bold text-xs ${isFintech ? 'text-white' : 'text-slate-900'}`}>{log.taskTitle}</h5>
                          <span className={`text-[10px] ${isFintech ? 'text-slate-400' : 'text-slate-400'}`}>({childObj?.name})</span>
                        </div>

                        <p className={`text-[11px] mt-0.5 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                          {log.dateStr} at {timeStr}
                          {log.note && <span className={isFintech ? 'text-emerald-400 italic' : 'text-slate-600 italic'}> • "{log.note}"</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                          isPositive
                            ? isFintech
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-mono'
                              : 'bg-emerald-100 text-emerald-800'
                            : isFintech
                            ? 'bg-rose-950 text-rose-400 border border-rose-500/30 font-mono'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isPositive ? `+${log.pointsEarned}` : log.pointsEarned} {currencySymbol}
                      </span>

                      {isParentMode && (
                        <button
                          onClick={() => onUndoLog(log.id)}
                          className={`p-1.5 rounded-lg transition ${
                            isFintech
                              ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Undo Entry"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Manual Points Adjustment Modal (Parent) */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Adjust Points / Give Bonus</h3>
            <form onSubmit={handleSaveAdjust} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Child</label>
                <select
                  value={adjustChildId}
                  onChange={(e) => setAdjustChildId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {childrenList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.avatar} {c.name} (Current: {c.currentPoints} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Points Delta (+ or -)</label>
                <input
                  type="number"
                  step="5"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Use positive numbers (e.g. +50 for awesome behavior) or negative (e.g. -20 for deduction).
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Helped carry heavy groceries inside"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm"
                >
                  Apply Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
