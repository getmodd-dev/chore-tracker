import { ChoreTask } from '../types';
import {
  getDayOfWeekFromDateStr,
  getPacificDateStr,
  parseLocalDate,
  formatPacificDate,
} from './dateUtils';

export { parseLocalDate };

export const DAYS_OF_WEEK = [
  { day: 0, short: 'Sun', label: 'Sunday', letter: 'S' },
  { day: 1, short: 'Mon', label: 'Monday', letter: 'M' },
  { day: 2, short: 'Tue', label: 'Tuesday', letter: 'T' },
  { day: 3, short: 'Wed', label: 'Wednesday', letter: 'W' },
  { day: 4, short: 'Thu', label: 'Thursday', letter: 'T' },
  { day: 5, short: 'Fri', label: 'Friday', letter: 'F' },
  { day: 6, short: 'Sat', label: 'Saturday', letter: 'S' },
] as const;

/**
 * Converts a Date to YYYY-MM-DD Pacific format string.
 */
export function formatLocalDate(date: Date): string {
  return formatPacificDate(date);
}

/**
 * Returns a readable badge text representing the schedule.
 * e.g. "Daily", "Anytime", "Every Wednesday", "Every other Friday", "Every Mon, Wed, Fri"
 */
export function formatScheduleLabel(task: ChoreTask): string {
  if (task.frequency === 'daily') return 'Daily';
  if (task.frequency === 'anytime') return 'Anytime';

  // Weekly / Scheduled
  const days = task.daysOfWeek;
  if (!days || days.length === 0) {
    return task.intervalWeeks === 2 ? 'Every other week' : 'Weekly';
  }

  const isBiweekly = task.intervalWeeks === 2;

  // Check common presets
  const sortedDays = [...days].sort((a, b) => a - b);
  const dayLabels = sortedDays.map((d) => {
    const found = DAYS_OF_WEEK.find((item) => item.day === d);
    return found ? found.label : '';
  });

  const dayShorts = sortedDays.map((d) => {
    const found = DAYS_OF_WEEK.find((item) => item.day === d);
    return found ? found.short : '';
  });

  if (sortedDays.length === 7) {
    return isBiweekly ? 'Every other week (Daily)' : 'Every day';
  }

  // Weekdays (Mon-Fri)
  if (sortedDays.length === 5 && sortedDays.join(',') === '1,2,3,4,5') {
    return isBiweekly ? 'Every other week (Weekdays)' : 'Weekdays (Mon-Fri)';
  }

  // Weekends (Sat-Sun)
  if (sortedDays.length === 2 && (sortedDays.join(',') === '0,6' || sortedDays.join(',') === '6,0')) {
    return isBiweekly ? 'Every other weekend' : 'Weekends';
  }

  if (sortedDays.length === 1) {
    return isBiweekly ? `Every other ${dayLabels[0]}` : `Every ${dayLabels[0]}`;
  }

  return isBiweekly
    ? `Every other ${dayShorts.join(', ')}`
    : `Every ${dayShorts.join(', ')}`;
}

/**
 * Checks if a chore is scheduled/due on a given calendar date (YYYY-MM-DD).
 */
export function isChoreScheduledForDate(task: ChoreTask, targetDateStr: string): boolean {
  if (task.frequency === 'daily') return true;
  if (task.frequency === 'anytime') return true; // Anytime chores can be done on any day

  // Weekly / Specific days
  if (!task.daysOfWeek || task.daysOfWeek.length === 0) {
    // If no specific days chosen, defaults to active
    return true;
  }

  const dayOfWeek = getDayOfWeekFromDateStr(targetDateStr);

  if (!task.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }

  // Check bi-weekly (intervalWeeks === 2)
  if (task.intervalWeeks === 2) {
    // Anchor to scheduleStartDate if provided, otherwise default to a fixed baseline (2026-01-04 is a Sunday)
    const anchor = task.scheduleStartDate
      ? parseLocalDate(task.scheduleStartDate)
      : new Date(2026, 0, 4);

    const targetDate = parseLocalDate(targetDateStr);

    // Normalize both to Sunday 00:00:00 local time
    const anchorSunday = new Date(
      anchor.getFullYear(),
      anchor.getMonth(),
      anchor.getDate() - anchor.getDay()
    );
    const targetSunday = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate() - targetDate.getDay()
    );

    const diffMs = targetSunday.getTime() - anchorSunday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    // If odd week difference, it's the alternate week (not due)
    if (Math.abs(diffWeeks) % 2 !== 0) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates the next upcoming scheduled date for a task starting from a reference date.
 */
export function getNextScheduledDate(task: ChoreTask, fromDateStr: string = getPacificDateStr(0)): string | null {
  if (task.frequency === 'daily' || task.frequency === 'anytime') {
    return fromDateStr;
  }

  const start = parseLocalDate(fromDateStr);
  // Search up to 60 days ahead
  for (let i = 0; i <= 60; i++) {
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dateStr = formatLocalDate(next);
    if (isChoreScheduledForDate(task, dateStr)) {
      return dateStr;
    }
  }
  return null;
}
