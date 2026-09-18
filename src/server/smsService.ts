import { Transporter } from 'nodemailer';
import { FamilyAppData, Child, ChoreTask, TaskCompletionLog } from '../types';
import { getEmailConfig } from './emailService';
import { getPacificParts, getPacificDateStr, getPacificDayOfWeek } from '../utils/dateUtils';
import nodemailer from 'nodemailer';

// Carrier SMS Gateways (AT&T primary as requested by user)
export const CARRIER_GATEWAYS: Record<string, string> = {
  att: 'txt.att.net',
  verizon: 'vtext.com',
  tmobile: 'tmomail.net',
};

/**
 * Format 10-digit US phone number into carrier email address.
 * E.g. "(555) 123-4567" -> "5551234567@txt.att.net"
 */
export function formatCarrierEmail(phone: string, carrier: string = 'att'): string | null {
  const digits = phone.replace(/\D/g, '');
  const tenDigits = digits.length === 11 && digits.startsWith('1') ? digits.substring(1) : digits;

  if (tenDigits.length !== 10) {
    return null;
  }

  const gateway = CARRIER_GATEWAYS[carrier.toLowerCase()] || CARRIER_GATEWAYS.att;
  return `${tenDigits}@${gateway}`;
}

/**
 * Compose a concise, encouraging SMS text message for the child.
 * Kept under 160 characters when possible (or standard 2-segment SMS).
 */
export function composeChildChoreSms(
  child: Child,
  data: FamilyAppData,
  targetDateStr?: string
): { subject: string; text: string } {
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

  // Build SMS body
  let text = `Hi ${child.name}! ⭐ Chore update:\n`;
  text += `Done: ${completedCount}/${childTasks.length} chores (${pointsToday}/${dailyGoal} pts).`;

  if (isGoalMet) {
    text += ` 🎉 Goal achieved today!`;
  }

  if (remainingTasks.length > 0) {
    const nextList = remainingTasks
      .slice(0, 3)
      .map((t) => t.title)
      .join(', ');
    text += `\nTo do: ${nextList}${remainingTasks.length > 3 ? ` +${remainingTasks.length - 3} more` : ''}.`;
  } else {
    text += `\nAll daily chores finished! Great job! 🚀`;
  }

  return {
    subject: 'Chore Tracker',
    text,
  };
}

/**
 * Send an SMS message via Email-to-SMS gateway
 */
export async function sendChildChoreSms(
  child: Child,
  data: FamilyAppData,
  customText?: string
): Promise<{ success: boolean; message: string; recipientAddress?: string }> {
  const emailCfg = getEmailConfig();

  if (!emailCfg.isConfigured) {
    return {
      success: false,
      message: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment or Unraid Docker.',
    };
  }

  if (!child.phoneNumber) {
    return {
      success: false,
      message: `No phone number configured for ${child.name}.`,
    };
  }

  const carrier = child.carrier || 'att';
  const recipientAddress = formatCarrierEmail(child.phoneNumber, carrier);

  if (!recipientAddress) {
    return {
      success: false,
      message: `Invalid phone number for ${child.name}: "${child.phoneNumber}". Please enter a 10-digit US mobile number.`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailCfg.user,
        pass: process.env.GMAIL_APP_PASSWORD?.trim(),
      },
    });

    const { subject, text } = composeChildChoreSms(child, data);
    const bodyToSend = customText || text;

    await transporter.sendMail({
      from: `"Chore Tracker" <${emailCfg.user}>`,
      to: recipientAddress,
      subject,
      text: bodyToSend,
    });

    return {
      success: true,
      message: `Chore status SMS sent to ${child.name} via ${recipientAddress}!`,
      recipientAddress,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to send SMS to ${child.name} (${recipientAddress}):`, errMsg);
    return {
      success: false,
      message: `Failed to send SMS: ${errMsg}`,
      recipientAddress,
    };
  }
}

/**
 * Background loop checking every minute for children whose scheduled SMS time matches current local time.
 */
export function initSmsScheduler(
  readLatestData: () => FamilyAppData,
  saveUpdatedData: (data: FamilyAppData) => void
) {
  console.log('[SMS Scheduler] Initializing per-child daily text message dispatcher (checks every minute)...');

  // Check every minute: "* * * * *"
  setInterval(async () => {
    try {
      const pacificParts = getPacificParts();
      const currentTimeStr = pacificParts.timeStr;
      const todayStr = pacificParts.dateStr;

      const data = readLatestData();
      if (!data || !Array.isArray(data.children)) return;

      let changed = false;

      for (const child of data.children) {
        if (!child.smsEnabled || !child.phoneNumber) continue;

        const targetTime = child.smsTime || '17:00'; // Default 5:00 PM if enabled

        // If it's the right minute and has not been sent today
        if (targetTime === currentTimeStr && child.lastSmsSentDate !== todayStr) {
          console.log(`[SMS Scheduler] Sending daily chore SMS to ${child.name} at ${currentTimeStr}...`);
          const result = await sendChildChoreSms(child, data);

          if (result.success) {
            child.lastSmsSentDate = todayStr;
            changed = true;
            console.log(`[SMS Scheduler] Sent successfully to ${child.name}:`, result.message);
          } else {
            console.error(`[SMS Scheduler] Failed sending to ${child.name}:`, result.message);
          }
        }
      }

      if (changed) {
        saveUpdatedData(data);
      }
    } catch (err) {
      console.error('[SMS Scheduler] Error in dispatch loop:', err);
    }
  }, 60 * 1000); // Check once every 60 seconds
}

