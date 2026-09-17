import React, { useState } from 'react';
import { Child, ChoreTask, TaskCompletionLog, AllowancePayoutRecord, AppTheme } from '../types';
import { calculateChildMonthlyAllowance } from '../utils/allowance';
import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Award,
  Shield,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Receipt,
  Pencil,
  Zap,
} from 'lucide-react';

interface AllowanceDashboardViewProps {
  child: Child;
  childrenList: Child[];
  tasks: ChoreTask[];
  logs: TaskCompletionLog[];
  payouts?: AllowancePayoutRecord[];
  isParentMode: boolean;
  currencySymbol: string; // for points (e.g. ⭐)
  onRecordPayout: (
    childId: string,
    monthYear: string,
    amountPaid: number,
    completionRatePercent: number,
    notes?: string
  ) => Promise<void>;
  onUpdateChildAllowanceTarget: (childId: string, targetAllowance: number) => void;
  onSwitchChild: (childId: string) => void;
  theme?: AppTheme;
}

export const AllowanceDashboardView: React.FC<AllowanceDashboardViewProps> = ({
  child,
  childrenList,
  tasks,
  logs,
  payouts = [],
  isParentMode,
  currencySymbol,
  onRecordPayout,
  onUpdateChildAllowanceTarget,
  onSwitchChild,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
  const [showEditTargetModal, setShowEditTargetModal] = useState<boolean>(false);
  const [payoutNotes, setPayoutNotes] = useState<string>('');
  const [customPayoutAmount, setCustomPayoutAmount] = useState<number>(0);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState<boolean>(false);
  const [newTargetAmount, setNewTargetAmount] = useState<number>(child.monthlyAllowanceTarget ?? 25);

  // Compute reference date based on offset (0 = current month, -1 = last month)
  const targetDate = new Date();
  if (selectedMonthOffset !== 0) {
    targetDate.setMonth(targetDate.getMonth() + selectedMonthOffset);
  }

  const allowanceStats = calculateChildMonthlyAllowance(child, tasks, logs, targetDate);

  // Allowance chores assigned to this child
  const allowanceTasks = tasks.filter((task) => {
    if (task.assignedTo && task.assignedTo.length > 0 && !task.assignedTo.includes(child.id)) {
      return false;
    }
    return task.choreType === 'allowance' || task.choreType === 'both' || (!task.choreType && !task.isBonus);
  });

  // Extra Prize Chores (bonus tasks that award points instead of allowance percentage)
  const prizeTasks = tasks.filter((task) => {
    if (task.assignedTo && task.assignedTo.length > 0 && !task.assignedTo.includes(child.id)) {
      return false;
    }
    return task.choreType === 'bonus_points' || task.isBonus;
  });

  // Payout history for this child
  const childPayoutHistory = payouts.filter((p) => p.childId === child.id);

  // Check if payout already recorded for this month
  const alreadyPaidForMonth = childPayoutHistory.find((p) => p.monthYear === allowanceStats.monthKey);

  const handleOpenPayout = () => {
    setCustomPayoutAmount(allowanceStats.accruedAmount);
    setPayoutNotes(`Monthly allowance payout (${allowanceStats.completionRatePercent}% completion)`);
    setShowPayoutModal(true);
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPayout(true);
    try {
      await onRecordPayout(
        child.id,
        allowanceStats.monthKey,
        Number(customPayoutAmount) || 0,
        allowanceStats.completionRatePercent,
        payoutNotes
      );
      setShowPayoutModal(false);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <div id="allowance-dashboard-view" className="space-y-4 pb-12">
      {/* Sibling Quick Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {childrenList.map((c) => {
          const isSelected = c.id === child.id;
          return (
            <button
              key={c.id}
              onClick={() => onSwitchChild(c.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-bold transition shrink-0 ${
                isSelected
                  ? isFintech
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900 text-white shadow-sm'
                  : isFintech
                  ? 'bg-[#0e1628] text-slate-400 border border-[#1d2d4c] hover:bg-[#142038] hover:text-white'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>{c.avatar}</span>
              <span>{c.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? isFintech
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-500/30 text-emerald-200'
                    : isFintech
                    ? 'bg-[#152238] text-slate-400'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                ${c.monthlyAllowanceTarget ?? 25}/mo
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Hero Card: Monthly Completion Rate & Earned Cash */}
      <div
        className={`rounded-3xl p-5 text-white shadow-xl relative overflow-hidden transition-all ${
          isFintech
            ? 'bg-[#0c1424] border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
            : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900'
        }`}
      >
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-44 h-44 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />

        {/* Header: Title & Month Filter */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
                isFintech ? 'bg-emerald-950/80 border border-emerald-500/40' : 'bg-white/15 backdrop-blur-md border border-white/20'
              }`}
            >
              💵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">
                  {child.name}'s {isFintech ? 'Yield & Direct Deposit' : 'Monthly Allowance'}
                </h3>
                {isParentMode && (
                  <button
                    onClick={() => {
                      setNewTargetAmount(child.monthlyAllowanceTarget ?? 25);
                      setShowEditTargetModal(true);
                    }}
                    className={`p-1 rounded-lg transition ${
                      isFintech ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/20 text-emerald-100'
                    }`}
                    title="Change monthly set allowance"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className={`text-[11px] font-medium ${isFintech ? 'text-slate-400' : 'text-emerald-100'}`}>
                {allowanceStats.monthName} ({allowanceStats.daysElapsedInMonth} of {allowanceStats.totalDaysInMonth} days elapsed)
              </p>
            </div>
          </div>

          {/* Month Offset Toggle */}
          <div
            className={`flex p-0.5 rounded-xl text-[10px] font-bold ${
              isFintech ? 'bg-[#10192e] border border-[#1e2f52]' : 'bg-black/20 backdrop-blur-md border border-white/10'
            }`}
          >
            <button
              onClick={() => setSelectedMonthOffset(-1)}
              className={`px-2 py-1 rounded-lg transition ${
                selectedMonthOffset === -1
                  ? isFintech
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-white text-slate-950 shadow-xs'
                  : isFintech
                  ? 'text-slate-400 hover:text-white'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setSelectedMonthOffset(0)}
              className={`px-2 py-1 rounded-lg transition ${
                selectedMonthOffset === 0
                  ? isFintech
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-white text-slate-950 shadow-xs'
                  : isFintech
                  ? 'text-slate-400 hover:text-white'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* Hero Big Stat Grid */}
        <div className="grid grid-cols-2 gap-3 relative z-10 mb-4">
          {/* Completion Percent */}
          <div
            className={`rounded-2xl p-3.5 border transition ${
              isFintech ? 'bg-[#111d35]/90 border-[#1c2e52]' : 'bg-white/10 backdrop-blur-md border-white/10'
            }`}
          >
            <div
              className={`flex items-center justify-between text-[11px] font-semibold mb-1 ${
                isFintech ? 'text-slate-400' : 'text-emerald-100'
              }`}
            >
              <span className="flex items-center gap-1">
                <TrendingUp className={`w-3 h-3 ${isFintech ? 'text-emerald-400' : 'text-emerald-300'}`} />
                Execution Rate
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black font-mono ${isFintech ? 'text-white' : 'text-white'}`}>
                {allowanceStats.completionRatePercent}%
              </span>
              <span className={`text-xs ${isFintech ? 'text-emerald-400' : 'text-emerald-200'}`}>done</span>
            </div>
            {/* Progress bar */}
            <div className={`w-full h-2 rounded-full mt-2.5 overflow-hidden ${isFintech ? 'bg-[#0d1627]' : 'bg-white/15'}`}>
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isFintech
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    : allowanceStats.completionRatePercent >= 90
                    ? 'bg-emerald-300 shadow-sm'
                    : allowanceStats.completionRatePercent >= 70
                    ? 'bg-amber-300'
                    : 'bg-indigo-300'
                }`}
                style={{ width: `${allowanceStats.completionRatePercent}%` }}
              />
            </div>
            <p className={`text-[10px] mt-1.5 ${isFintech ? 'text-slate-400 font-mono' : 'text-emerald-200'}`}>
              {allowanceStats.completedInstances} of {allowanceStats.totalExpectedInstances} duties completed
            </p>
          </div>

          {/* Accrued Cash */}
          <div
            className={`rounded-2xl p-3.5 border transition ${
              isFintech ? 'bg-[#111d35]/90 border-[#1c2e52]' : 'bg-white/10 backdrop-blur-md border-white/10'
            }`}
          >
            <div
              className={`flex items-center justify-between text-[11px] font-semibold mb-1 ${
                isFintech ? 'text-slate-400' : 'text-emerald-100'
              }`}
            >
              <span className="flex items-center gap-1">
                <DollarSign className={`w-3 h-3 ${isFintech ? 'text-emerald-400' : 'text-amber-300'}`} />
                {isFintech ? 'Accrued Capital' : 'Accrued Earnings'}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black font-mono ${isFintech ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-amber-300'}`}>
                ${allowanceStats.accruedAmount.toFixed(2)}
              </span>
            </div>
            <div className={`text-[10px] mt-2 flex items-center justify-between ${isFintech ? 'text-slate-400' : 'text-emerald-200'}`}>
              <span>Monthly Target:</span>
              <span className={`font-bold font-mono ${isFintech ? 'text-white' : 'text-white'}`}>
                ${allowanceStats.targetAllowance.toFixed(2)} (100%)
              </span>
            </div>
            <p className={`text-[10px] mt-1 truncate ${isFintech ? 'text-emerald-400 font-mono' : 'text-emerald-200'}`}>
              {allowanceStats.completionRatePercent >= 100
                ? 'Maximum 100% target reached!'
                : `Need ${Math.max(0, allowanceStats.totalExpectedInstances - allowanceStats.completedInstances)} more tasks for 100%`}
            </p>
          </div>
        </div>

        {/* Bottom Payout CTA / Status */}
        <div className={`flex items-center justify-between pt-3 border-t relative z-10 ${isFintech ? 'border-[#1e2f52]' : 'border-white/15'}`}>
          <div className={`text-xs flex items-center gap-1.5 ${isFintech ? 'text-slate-400' : 'text-emerald-100'}`}>
            {alreadyPaidForMonth ? (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  isFintech
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono'
                    : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Settled for {allowanceStats.monthName} (${alreadyPaidForMonth.amountPaid.toFixed(2)})
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isFintech ? 'text-slate-400' : 'text-emerald-100'}`}>
                <Clock className={`w-3.5 h-3.5 ${isFintech ? 'text-emerald-400' : 'text-amber-300'}`} />
                Dynamic smart contract calculated from monthly task completion
              </span>
            )}
          </div>

          {isParentMode && (
            <button
              onClick={handleOpenPayout}
              className={`active:scale-95 font-black px-3.5 py-1.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer ${
                isFintech
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{alreadyPaidForMonth ? 'Record Additional Payout' : 'Settle Allowance'}</span>
            </button>
          )}
        </div>
      </div>

      {/* How It Works Banner / Explanation */}
      <div
        className={`border rounded-2xl p-3.5 text-xs flex items-start gap-3 transition ${
          isFintech ? 'bg-[#0e1628] border-[#1b2a47] text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-600'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isFintech ? 'bg-[#182644] border border-[#22365e] text-emerald-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className={`font-bold mb-0.5 ${isFintech ? 'text-white' : 'text-slate-900'}`}>Two-Track Financial Protocol</h4>
          <p className={`leading-relaxed text-[11px] ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
            <strong className={isFintech ? 'text-emerald-400' : ''}>💵 Direct Deposit Quests</strong> (making bed, study, clean HQ) track toward {child.name}'s monthly{' '}
            <strong className={isFintech ? 'text-white' : ''}>${allowanceStats.targetAllowance}</strong> base payout based on percent complete.
            <br />
            <strong className={isFintech ? 'text-amber-400' : ''}>⭐ Prize Bounties</strong> earn Points to liquidate anytime for tech privileges, weekend passes, and custom rewards!
          </p>
        </div>
      </div>

      {/* Section 1: Allowance Chores (Monthly Duty List) */}
      <div
        className={`rounded-3xl p-4 border shadow-xs space-y-3 transition ${
          isFintech ? 'bg-[#0e172a] border-[#1d2d4c] text-white' : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💵</span>
            <h4 className={`font-bold text-sm ${isFintech ? 'text-white' : 'text-slate-900'}`}>
              {isFintech ? 'Direct Deposit Core Protocols' : `Allowance Chores for ${child.name}`}
            </h4>
          </div>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isFintech ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40 font-mono' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}
          >
            {allowanceTasks.length} Core Quests
          </span>
        </div>
        <p className={`text-xs ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
          Consistent execution unlocks up to the full ${allowanceStats.targetAllowance} monthly deposit.
        </p>

        <div className="space-y-2 pt-1">
          {allowanceTasks.map((task) => {
            // Count how many times completed this month
            const completionsThisMonth = logs.filter(
              (l) => l.childId === child.id && l.taskId === task.id && l.dateStr.startsWith(allowanceStats.monthKey)
            ).length;

            return (
              <div
                key={task.id}
                className={`flex items-center justify-between p-2.5 rounded-2xl border transition ${
                  isFintech ? 'bg-[#131f38] border-[#1e2f54]' : 'bg-slate-50/80 border-slate-200/70'
                }`}
              >
                <div className="min-w-0 flex-1 mr-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-xs ${isFintech ? 'text-white' : 'text-slate-900'}`}>{task.title}</span>
                    <span
                      className={`text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded-md border ${
                        isFintech ? 'bg-[#1a2948] text-slate-400 border-[#263a62]' : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {task.frequency}
                    </span>
                    {task.choreType === 'both' && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md border ${
                          isFintech ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}
                      >
                        +Bounty
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className={`text-[11px] truncate mt-0.5 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>{task.description}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-1 rounded-xl ${
                      isFintech ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 font-mono' : 'text-emerald-700 bg-emerald-100/60'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isFintech ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    {completionsThisMonth} executed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Extra Prize Chores */}
      <div
        className={`rounded-3xl p-4 border shadow-xs space-y-3 transition ${
          isFintech ? 'bg-[#0e172a] border-[#1d2d4c] text-white' : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💎</span>
            <h4 className={`font-bold text-sm ${isFintech ? 'text-white' : 'text-slate-900'}`}>
              {isFintech ? 'Bounties & Bonus Privileges' : 'Extra Chores for Prize Points'}
            </h4>
          </div>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isFintech ? 'text-cyan-300 bg-cyan-950/80 border-cyan-500/40 font-mono' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
            }`}
          >
            {prizeTasks.length} Bounties
          </span>
        </div>
        <p className={`text-xs ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
          Instant bounty payouts liquidatable for bonus rewards and perks.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {prizeTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-2.5 rounded-2xl border transition ${
                isFintech ? 'bg-[#131f38] border-[#1e2f54]' : 'bg-indigo-50/40 border-indigo-100/80'
              }`}
            >
              <div className="min-w-0 flex-1 mr-2">
                <h5 className={`font-bold text-xs truncate ${isFintech ? 'text-white' : 'text-slate-900'}`}>{task.title}</h5>
                <p className={`text-[10px] truncate ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>{task.description || 'Bonus bounty task'}</p>
              </div>
              <span
                className={`text-xs font-black px-2 py-1 rounded-xl border shrink-0 font-mono ${
                  isFintech ? 'text-emerald-400 bg-[#162544] border-emerald-500/40' : 'text-indigo-700 bg-white border-indigo-200'
                }`}
              >
                +{task.points} {currencySymbol}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Payout History */}
      {childPayoutHistory.length > 0 && (
        <div
          className={`rounded-3xl p-4 border shadow-xs space-y-3 transition ${
            isFintech ? 'bg-[#0e172a] border-[#1d2d4c] text-white' : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className={`w-4 h-4 ${isFintech ? 'text-emerald-400' : 'text-slate-600'}`} />
              <h4 className={`font-bold text-sm ${isFintech ? 'text-white' : 'text-slate-900'}`}>Past Settlements & Deposits</h4>
            </div>
            <span className={`text-xs ${isFintech ? 'text-slate-400 font-mono' : 'text-slate-400'}`}>{childPayoutHistory.length} recorded</span>
          </div>

          <div className="space-y-2">
            {childPayoutHistory.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs transition ${
                  isFintech ? 'bg-[#131f38] border-[#1e2f54]' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isFintech ? 'text-white' : 'text-slate-900'}`}>{p.monthYear}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full font-mono ${
                        isFintech ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.completionRatePercent}% Complete
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                    Paid on {new Date(p.paidAt).toLocaleDateString()} {p.notes ? `• ${p.notes}` : ''}
                  </p>
                </div>

                <span
                  className={`text-sm font-black px-2.5 py-1 rounded-xl border font-mono ${
                    isFintech ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  }`}
                >
                  ${p.amountPaid.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Record Monthly Payout (Parent only) */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Record Allowance Payment</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Confirm payment for <strong>{child.name}</strong> for <strong>{allowanceStats.monthName}</strong> based
              on {allowanceStats.completionRatePercent}% chore completion.
            </p>

            <form onSubmit={handleConfirmPayout} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Amount Paid ($)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="500"
                  value={customPayoutAmount}
                  onChange={(e) => setCustomPayoutAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Formula calculated: ${allowanceStats.targetAllowance} × {allowanceStats.completionRatePercent}% = $
                  {allowanceStats.accruedAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. Cash given, transferred to piggy bank, etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold shadow-sm transition"
                >
                  {isSubmittingPayout ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Monthly Target Allowance */}
      {showEditTargetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Set Monthly Allowance</h3>
              <button
                onClick={() => setShowEditTargetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter the set dollar amount that <strong>{child.name}</strong> will earn if they complete 100% of their
              allowance chores this month.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">100% Monthly Target ($)</label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="500"
                  value={newTargetAmount}
                  onChange={(e) => setNewTargetAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditTargetModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateChildAllowanceTarget(child.id, Math.max(0, Number(newTargetAmount) || 25));
                    setShowEditTargetModal(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold shadow-sm transition"
                >
                  Save Target
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
