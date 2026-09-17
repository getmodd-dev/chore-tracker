import React from 'react';
import { Child } from '../types';
import { Flame, Star, Trophy, Sparkles, TrendingUp, Target, Award, DollarSign } from 'lucide-react';

interface DailyStatsCardProps {
  child: Child;
  dailyPointsToday: number;
  currencySymbol: string;
  tasksCompletedTodayCount: number;
  totalDailyTasksCount: number;
  monthlyAllowancePercent?: number;
  monthlyAllowanceAccrued?: number;
  onOpenAllowance?: () => void;
  isFintech?: boolean;
}

export const DailyStatsCard: React.FC<DailyStatsCardProps> = ({
  child,
  dailyPointsToday,
  currencySymbol,
  tasksCompletedTodayCount,
  totalDailyTasksCount,
  monthlyAllowancePercent,
  monthlyAllowanceAccrued,
  onOpenAllowance,
  isFintech = false,
}) => {
  const goal = child.dailyGoal || 100;
  const progressPercent = Math.min(100, Math.round((dailyPointsToday / goal) * 100));
  const isGoalAchieved = dailyPointsToday >= goal;

  // Level computation: next level is level * 250 points
  const pointsForCurrentLevel = (child.level - 1) * 250;
  const pointsForNextLevel = child.level * 250;
  const levelProgress = Math.min(
    100,
    Math.max(
      0,
      Math.round(((child.totalPoints - pointsForCurrentLevel) / (pointsForNextLevel - pointsForCurrentLevel)) * 100)
    )
  );

  if (isFintech) {
    return (
      <div
        id="daily-stats-card"
        className="bg-gradient-to-b from-[#111a2e] via-[#0d1527] to-[#0a101f] rounded-3xl p-5 text-white border border-[#1e2d4a] shadow-[0_16px_40px_rgba(0,0,0,0.6)] relative overflow-hidden mb-5 font-sans"
      >
        {/* Fintech Neon Ambient Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top row: Profile & Tier */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-[#16223a] border border-[#233557] flex items-center justify-center text-3xl shadow-inner shadow-black/40">
              {child.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">{child.name}</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Tier {child.level}
                </span>
              </div>
              <p className="text-slate-400 text-xs font-semibold flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                {child.badge}
              </p>
            </div>
          </div>

          {/* Discipline Streak counter */}
          <div className="flex flex-col items-end bg-[#131e34] px-3 py-1.5 rounded-2xl border border-[#203152]">
            <div className="flex items-center gap-1 text-emerald-400 font-black text-sm">
              <Flame className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              <span>{child.streakDays}D STREAK</span>
            </div>
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Discipline</span>
          </div>
        </div>

        {/* Main Financial Balance Section */}
        <div className="relative z-10 bg-[#090e1a]/80 backdrop-blur-md rounded-2xl p-4 border border-[#1b2844] mb-4 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Direct Deposit & Bank Balance
            </span>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ACTIVE
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight text-white font-mono">
                ${monthlyAllowanceAccrued !== undefined ? monthlyAllowanceAccrued.toFixed(2) : ((child.currentPoints ?? 0) * 0.1).toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-medium ml-1">
                earned this month
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {child.currentPoints ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Spendable XP
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Metric Grid */}
        <div className="grid grid-cols-2 gap-3 relative z-10 mb-3">
          {/* Daily Output Card */}
          <div className="bg-[#121c33] rounded-2xl p-3 border border-[#1f2f52]">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-400" />
                Daily Quests
              </span>
              <span className="text-emerald-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-400 font-mono">+{dailyPointsToday}</span>
              <span className="text-xs text-slate-400">/ {goal} pts</span>
            </div>
            <div className="w-full h-1.5 bg-[#090e1a] rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Monthly Allowance Target Card */}
          <div
            onClick={onOpenAllowance}
            className="bg-[#121c33] rounded-2xl p-3 border border-[#1f2f52] cursor-pointer hover:border-emerald-500/40 transition"
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                Monthly Target
              </span>
              <span className="text-cyan-400 font-mono">{monthlyAllowancePercent ?? 0}%</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white font-mono">
                ${monthlyAllowanceAccrued?.toFixed(2) ?? '0.00'}
              </span>
              <span className="text-xs text-slate-400">/ ${child.monthlyAllowanceTarget ?? 25}</span>
            </div>
            <div className="w-full h-1.5 bg-[#090e1a] rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                style={{ width: `${monthlyAllowancePercent ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Status strip */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1a2948] text-xs text-slate-300 relative z-10">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {isGoalAchieved ? 'Daily output target met! Full multiplier active.' : `Need ${Math.max(0, goal - dailyPointsToday)} more pts to complete daily quota`}
          </span>

          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
            {tasksCompletedTodayCount} logged today
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="daily-stats-card"
      className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden mb-5"
    >
      {/* Decorative background glow circles */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-10 w-40 h-40 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

      {/* Top row: Profile & Level Badge */}
      <div className="flex items-center justify-between relative z-10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner">
            {child.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">{child.name}</h2>
              <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
                LVL {child.level}
              </span>
            </div>
            <p className="text-indigo-200 text-xs font-medium flex items-center gap-1 mt-0.5">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              {child.badge}
            </p>
          </div>
        </div>

        {/* Streak counter */}
        <div className="flex flex-col items-end bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-1 text-orange-400 font-extrabold text-sm">
            <Flame className="w-4 h-4 fill-orange-400" />
            <span>{child.streakDays} Days</span>
          </div>
          <span className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold">Streak</span>
        </div>
      </div>

      {/* Main Metric Grid: Daily vs Total */}
      <div className="grid grid-cols-2 gap-3 relative z-10 mb-4">
        {/* Daily Points Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
          <div className="flex items-center justify-between text-indigo-200 text-[11px] font-semibold mb-1">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3 text-amber-300" />
              Today's Points
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-300">+{dailyPointsToday}</span>
            <span className="text-xs text-indigo-200">/ {goal} {currencySymbol}</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-white/15 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isGoalAchieved ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-yellow-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Total Points & Spendable Bank */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
          <div className="flex items-center justify-between text-indigo-200 text-[11px] font-semibold mb-1">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
              Spendable Bank
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{child.currentPoints}</span>
            <span className="text-xs text-indigo-200">{currencySymbol}</span>
          </div>
          <div className="text-[10px] text-indigo-200 mt-2 flex items-center justify-between">
            <span>All-Time Total:</span>
            <span className="font-bold text-white">{child.totalPoints} {currencySymbol}</span>
          </div>
        </div>
      </div>

      {/* Bottom Motivation and Today Chore Counter */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-indigo-100 relative z-10">
        <div className="flex items-center gap-1.5 font-medium">
          {isGoalAchieved ? (
            <>
              <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
              <span className="text-amber-300 font-bold">Awesome job! Daily target achieved!</span>
            </>
          ) : (
            <>
              <span>Need </span>
              <strong className="text-amber-300 font-bold">{Math.max(0, goal - dailyPointsToday)} more pts</strong>
              <span> for today's goal</span>
            </>
          )}
        </div>

        <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full font-semibold">
          {tasksCompletedTodayCount} chores done today
        </span>
      </div>

      {/* Monthly Allowance Progress Strip */}
      {typeof monthlyAllowancePercent === 'number' && (
        <div
          onClick={onOpenAllowance}
          className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs cursor-pointer hover:bg-white/5 px-2 py-1.5 rounded-xl transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">💵</span>
            <div>
              <span className="font-bold text-white text-xs">Monthly Allowance: {monthlyAllowancePercent}%</span>
              <span className="text-[11px] text-emerald-200 ml-1.5">
                (${monthlyAllowanceAccrued?.toFixed(2) ?? '0.00'} / ${child.monthlyAllowanceTarget ?? 25})
              </span>
            </div>
          </div>
          <span className="text-[11px] text-indigo-200 font-bold hover:text-white flex items-center gap-0.5">
            View Details →
          </span>
        </div>
      )}
    </div>
  );
};
