/**
 * Centralized Date & Timezone utilities for Chore Tracker.
 * Configured so the calendar day strictly flips at midnight Pacific Time (PST/PDT / America/Los_Angeles).
 */

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';

export interface PacificDateTimeParts {
  year: number;
  month: number;      // 1 - 12
  day: number;        // 1 - 31
  hours: number;      // 0 - 23
  minutes: number;    // 0 - 59
  seconds: number;    // 0 - 59
  dayOfWeek: number;  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dateStr: string;    // YYYY-MM-DD
  timeStr: string;    // HH:MM (24-hour)
}

/**
 * Break down any Date object into its Pacific Time components.
 */
export function getPacificParts(
  date: Date = new Date(),
  timezone: string = PACIFIC_TIMEZONE
): PacificDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = weekdays.indexOf(map.weekday);

  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const timeStr = `${map.hour}:${map.minute}`;

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hours: parseInt(map.hour, 10),
    minutes: parseInt(map.minute, 10),
    seconds: parseInt(map.second, 10),
    dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 0,
    dateStr,
    timeStr,
  };
}

/**
 * Returns the current calendar date string in YYYY-MM-DD format strictly for Pacific Time.
 * Optionally pass an offset in days (e.g. -1 for yesterday, 1 for tomorrow).
 */
export function getPacificDateStr(
  offsetDays: number = 0,
  baseDate: Date = new Date(),
  timezone: string = PACIFIC_TIMEZONE
): string {
  const parts = getPacificParts(baseDate, timezone);
  if (offsetDays === 0) {
    return parts.dateStr;
  }
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays));
  return d.toISOString().split('T')[0];
}

/**
 * Returns the current day of the week (0 = Sunday, ..., 6 = Saturday) in Pacific Time.
 */
export function getPacificDayOfWeek(
  date: Date = new Date(),
  timezone: string = PACIFIC_TIMEZONE
): number {
  return getPacificParts(date, timezone).dayOfWeek;
}

/**
 * Parses a YYYY-MM-DD date string and returns its day of the week (0 = Sun, ..., 6 = Sat)
 * completely independent of local runtime timezone shifts.
 */
export function getDayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return utcDate.getUTCDay();
}

/**
 * Parses YYYY-MM-DD into a local Date object.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formats a Date object to YYYY-MM-DD using Pacific Time.
 */
export function formatPacificDate(date: Date, timezone: string = PACIFIC_TIMEZONE): string {
  return getPacificParts(date, timezone).dateStr;
}

/**
 * Calculates milliseconds remaining until the upcoming midnight in Pacific Time.
 * Used for auto-refresh timers so the day flips right at midnight without page reload.
 */
export function getMsUntilNextPacificMidnight(
  date: Date = new Date(),
  timezone: string = PACIFIC_TIMEZONE
): number {
  const parts = getPacificParts(date, timezone);
  const secondsPassedToday = parts.hours * 3600 + parts.minutes * 60 + parts.seconds;
  const secondsInDay = 86400;
  const secondsRemaining = Math.max(1, secondsInDay - secondsPassedToday);
  return secondsRemaining * 1000;
}
