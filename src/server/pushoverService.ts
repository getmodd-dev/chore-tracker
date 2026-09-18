import { FamilyAppData, Child } from '../types';
import { getPacificParts, getPacificDateStr, getPacificDayOfWeek } from '../utils/dateUtils';

/**
 * Pushover API Service for sending rich iOS push notifications to children.
 * Uses the official Pushover REST API: https://api.pushover.net/1/messages.json
 */

export interface PushoverConfig {
  appToken: string;
  isConfigured: boolean;
}

/**
 * Retrieve the active Pushover App Token (either from app settings or environment variable PUSHOVER_APP_TOKEN)
 */
export function getPushoverAppToken(data?: FamilyAppData): string {
  if (data?.settings?.pushoverAppToken && data.settings.pushoverAppToken.trim()) {
    return data.settings.pushoverAppToken.trim();
  }
  return process.env.PUSHOVER_APP_TOKEN?.trim() || '';
}

/**
 * Compose a motivating, concise daily chore message for a child with sound, emoji, and link.
 */
export function composeChildPushoverMessage(
  child: Child,
  data: FamilyAppData,
  targetDateStr?: string
): { title: string; message: string; sound: string; url?: string; url_title?: string } {
  const dateStr = targetDateStr || getPacificDateStr(0);
  const logsForToday = data.logs.filter((l) => l.dateStr === dateStr && l.childId === child.id);
  const completedTaskIdSet = new Set(logsForToday.map((l) => l.taskId));

  const pointsToday = logsForToday.reduce((sum, l) => sum + (l.pointsEarned || 0), 0);
  const dailyGoal = child.dailyGoal || 50;
  const isGoalMet = pointsToday >= dailyGoal;

  // Find tasks scheduled or available for this child today in Pacific Time
  const dayOfWeek = getPacificDayOfWeek(); // 0 = Sun
  const childTasks = data.tasks.filter((t) => {
    // Check child assignment
    if (t.assignedTo && t.assignedTo.length > 0 && !t.assignedTo.includes(child.id)) {
      return false;
    }
    // Check frequency
    if (t.frequency === 'daily') return true;
    if (t.frequency === 'weekly') {
      if (t.daysOfWeek && t.daysOfWeek.length > 0) {
        return t.daysOfWeek.includes(dayOfWeek);
      }
      return true;
    }
    return false; // Anytime tasks are optional
  });

  const remainingTasks = childTasks.filter((t) => !completedTaskIdSet.has(t.id));
  const completedCount = childTasks.length - remainingTasks.length;

  let title = `${child.avatar} ${child.name}'s Chore Check-in`;
  let message = `Today's Progress: ${completedCount}/${childTasks.length} chores done (${pointsToday}/${dailyGoal} pts).`;

  if (isGoalMet) {
    message += `\n🎉 Daily Goal Met! Great hustle!`;
  }

  if (remainingTasks.length > 0) {
    const nextList = remainingTasks
      .slice(0, 3)
      .map((t) => `• ${t.title}`)
      .join('\n');
    message += `\n\nStill to do:\n${nextList}`;
    if (remainingTasks.length > 3) {
      message += `\n...and ${remainingTasks.length - 3} more!`;
    }
  } else {
    message += `\n\n🌟 All daily chores completed! You're an all-star! 🚀`;
  }

  // App link if APP_URL exists
  const appUrl = process.env.APP_URL || (data.settings.unraidHostName ? `http://${data.settings.unraidHostName}:3000` : undefined);

  return {
    title,
    message,
    sound: isGoalMet ? 'magic' : 'cosmic',
    url: appUrl,
    url_title: 'Open Chore Tracker',
  };
}

/**
 * Send a Pushover push notification to a child's iPhone.
 */
export async function sendChildPushoverNotification(
  child: Child,
  data: FamilyAppData,
  options?: { customTitle?: string; customMessage?: string }
): Promise<{ success: boolean; message: string; details?: any }> {
  const appToken = getPushoverAppToken(data);

  if (!appToken) {
    return {
      success: false,
      message: 'Pushover Application API Token is not configured. Please add your token in Settings or set PUSHOVER_APP_TOKEN.',
    };
  }

  const userKey = child.pushoverUserKey?.trim();
  if (!userKey) {
    return {
      success: false,
      message: `No Pushover User Key configured for ${child.name}. Please enter the 30-character User Key from the Pushover app on their iPhone.`,
    };
  }

  const defaultMsg = composeChildPushoverMessage(child, data);

  const payload: Record<string, string> = {
    token: appToken,
    user: userKey,
    title: options?.customTitle || defaultMsg.title,
    message: options?.customMessage || defaultMsg.message,
    sound: defaultMsg.sound,
    priority: '0', // Normal priority (wakes phone screen, plays chime)
  };

  if (child.pushoverDeviceName?.trim()) {
    payload.device = child.pushoverDeviceName.trim();
  }

  if (defaultMsg.url) {
    payload.url = defaultMsg.url;
    payload.url_title = defaultMsg.url_title || 'Open Chore Tracker';
  }

  try {
    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload).toString(),
    });

    const responseData = await res.json().catch(() => ({}));

    if (res.ok && responseData.status === 1) {
      return {
        success: true,
        message: `Pushover notification successfully delivered to ${child.name}'s iPhone!`,
        details: responseData,
      };
    } else {
      const errorMsg = Array.isArray(responseData.errors) ? responseData.errors.join(', ') : 'Unknown Pushover error';
      return {
        success: false,
        message: `Pushover error: ${errorMsg}`,
        details: responseData,
      };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Failed to connect to Pushover API: ${errMsg}`,
    };
  }
}

/**
 * Background loop checking every minute for children whose scheduled notification time matches local server time.
 */
export function initPushoverScheduler(
  readLatestData: () => FamilyAppData,
  saveUpdatedData: (data: FamilyAppData) => void
) {
  console.log('[Pushover Scheduler] Initializing per-child daily iOS push notification dispatcher (checks every minute)...');

  // Check every minute: 60 * 1000 ms
  setInterval(async () => {
    try {
      const pacificParts = getPacificParts();
      const currentTimeStr = pacificParts.timeStr;
      const todayStr = pacificParts.dateStr;

      const data = readLatestData();
      if (!data || !Array.isArray(data.children)) return;

      const appToken = getPushoverAppToken(data);
      if (!appToken) return; // No app token configured yet

      let changed = false;

      for (const child of data.children) {
        const isEnabled = child.notificationsEnabled ?? child.smsEnabled ?? false;
        const targetTime = child.notificationTime || child.smsTime || '16:30';
        const userKey = child.pushoverUserKey?.trim();

        if (!isEnabled || !userKey) continue;

        // Check if current minute matches and not yet sent today
        const lastSentDate = child.lastNotificationSentDate || child.lastSmsSentDate;
        if (targetTime === currentTimeStr && lastSentDate !== todayStr) {
          console.log(`[Pushover Scheduler] Sending daily chore alert to ${child.name}'s iPhone at ${currentTimeStr}...`);
          const result = await sendChildPushoverNotification(child, data);

          if (result.success) {
            child.lastNotificationSentDate = todayStr;
            child.lastSmsSentDate = todayStr;
            changed = true;
            console.log(`[Pushover Scheduler] Sent successfully to ${child.name}:`, result.message);
          } else {
            console.error(`[Pushover Scheduler] Failed sending to ${child.name}:`, result.message);
          }
        }
      }

      if (changed) {
        saveUpdatedData(data);
      }
    } catch (err) {
      console.error('[Pushover Scheduler] Error in dispatch loop:', err);
    }
  }, 60 * 1000);
}
