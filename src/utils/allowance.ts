import { Child, ChoreTask, TaskCompletionLog } from '../types';

export interface ChildAllowanceStats {
  monthKey: string; // "YYYY-MM"
  monthName: string; // e.g. "September 2026"
  targetAllowance: number; // e.g. 30 ($30.00)
  totalExpectedInstances: number; // Scheduled allowance chore instances elapsed this month
  completedInstances: number; // Allowance chore instances completed this month
  completionRatePercent: number; // e.g. 85%
  accruedAmount: number; // e.g. 25.50 (target * percent)
  allowanceChoresCount: number; // Distinct allowance tasks assigned to this child
  daysElapsedInMonth: number;
  totalDaysInMonth: number;
}

/**
 * Calculates a child's monthly allowance completion rate and earned cash payout.
 * 
 * Logic:
 * - Allowance chores are tasks with choreType === 'allowance' or choreType === 'both'
 *   (or by default non-bonus tasks if choreType is not explicitly set).
 * - For elapsed days in the current month, we calculate expected chore occurrences:
 *   - daily: 1 per elapsed day
 *   - weekly: ceil(elapsedDays / 7)
 *   - anytime: based on minimum target or completed count
 * - Percentage = min(100, round((completedInstances / expectedInstances) * 100))
 * - Accrued cash = round((percentage / 100) * targetAllowance * 100) / 100
 */
export function calculateChildMonthlyAllowance(
  child: Child,
  tasks: ChoreTask[],
  logs: TaskCompletionLog[],
  date: Date = new Date()
): ChildAllowanceStats {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = date.getDate();
  const daysElapsedInMonth = Math.max(1, currentDay);

  const targetAllowance = child.monthlyAllowanceTarget ?? 25; // default $25 if unset

  // Filter tasks assigned to this child that qualify for allowance
  const childAllowanceTasks = tasks.filter((task) => {
    // Check child assignment
    if (task.assignedTo && task.assignedTo.length > 0 && !task.assignedTo.includes(child.id)) {
      return false;
    }
    // Check if chore is designated for allowance
    if (task.choreType) {
      return task.choreType === 'allowance' || task.choreType === 'both';
    }
    // Default fallback: non-bonus daily and weekly routine chores count for allowance
    return !task.isBonus;
  });

  // Calculate expected completions for days elapsed this month
  let totalExpected = 0;
  childAllowanceTasks.forEach((task) => {
    if (task.frequency === 'daily') {
      totalExpected += daysElapsedInMonth;
    } else if (task.frequency === 'weekly') {
      totalExpected += Math.max(1, Math.ceil(daysElapsedInMonth / 7));
    } else {
      // anytime: expect at least 2 times per month or 1 per 2 weeks elapsed
      totalExpected += Math.max(1, Math.floor(daysElapsedInMonth / 10));
    }
  });

  // Guard against 0 expected
  if (totalExpected === 0) {
    totalExpected = daysElapsedInMonth * 2;
  }

  // Count completions in this month for allowance chores
  const allowanceTaskIds = new Set(childAllowanceTasks.map((t) => t.id));
  const monthLogs = logs.filter((log) => {
    if (log.childId !== child.id) return false;
    if (!log.dateStr.startsWith(monthKey)) return false;
    return allowanceTaskIds.has(log.taskId);
  });

  const completedCount = monthLogs.length;
  const rawPercent = (completedCount / totalExpected) * 100;
  const completionRatePercent = Math.min(100, Math.round(rawPercent));

  const accruedAmount = Math.round((completionRatePercent / 100) * targetAllowance * 100) / 100;

  return {
    monthKey,
    monthName,
    targetAllowance,
    totalExpectedInstances: totalExpected,
    completedInstances: completedCount,
    completionRatePercent,
    accruedAmount,
    allowanceChoresCount: childAllowanceTasks.length,
    daysElapsedInMonth,
    totalDaysInMonth,
  };
}
