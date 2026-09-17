import nodemailer, { Transporter } from 'nodemailer';
import cron from 'node-cron';
import { FamilyAppData, Child, TaskCompletionLog, ChoreTask } from '../types';

let transporter: Transporter | null = null;
let lastReportSentTimestamp: string | null = null;

export function getEmailConfig() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  const recipient = (process.env.PARENT_EMAIL?.trim() || user || '').trim();
  const reportTime = process.env.DAILY_REPORT_TIME?.trim() || '20:00';

  return {
    isConfigured: !!(user && pass),
    user: user || '',
    recipient: recipient || '',
    reportTime,
    lastSent: lastReportSentTimestamp,
  };
}

// Lazy initialization of Nodemailer transporter
function getTransporter(): Transporter {
  const { isConfigured, user } = getEmailConfig();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!isConfigured) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

// Build clean, mobile-responsive HTML email for parents
export function generateDailyReportHtml(data: FamilyAppData, targetDateStr?: string): { subject: string; html: string } {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
  const dateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const dailyTasks = data.tasks.filter((t) => t.frequency === 'daily');
  const logsForDate = data.logs.filter((l) => l.dateStr === dateStr);
  const pendingRedemptions = data.redemptions.filter((r) => r.status === 'pending');

  let childrenSectionsHtml = '';

  for (const child of data.children) {
    const childLogs = logsForDate.filter((l) => l.childId === child.id);
    const pointsToday = childLogs.reduce((sum, l) => sum + (l.pointsEarned || 0), 0);
    const goal = child.dailyGoal || 100;
    const progressPercent = Math.min(100, Math.round((pointsToday / goal) * 100));
    const isGoalMet = pointsToday >= goal;

    // Daily tasks completed vs incomplete
    const completedTaskIdSet = new Set(childLogs.map((l) => l.taskId));
    const completedList = childLogs
      .map(
        (log) =>
          `<li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px;">
            <span style="color: #10b981; font-weight: bold; margin-right: 6px;">✓</span>
            <strong>${log.taskTitle}</strong>
            <span style="float: right; color: #4f46e5; font-weight: bold;">+${log.pointsEarned} pts</span>
          </li>`
      )
      .join('');

    const missedDailyTasks = dailyTasks.filter(
      (task) =>
        (!task.assignedTo || task.assignedTo.length === 0 || task.assignedTo.includes(child.id)) &&
        !completedTaskIdSet.has(task.id)
    );

    const missedList = missedDailyTasks
      .map(
        (task) =>
          `<li style="padding: 4px 0; color: #64748b; font-size: 13px;">
            <span style="color: #94a3b8; margin-right: 6px;">○</span>
            ${task.title} <span style="font-size: 11px; color: #94a3b8;">(${task.points} pts)</span>
          </li>`
      )
      .join('');

    childrenSectionsHtml += `
      <div style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <span style="font-size: 28px; vertical-align: middle; margin-right: 8px;">${child.avatar}</span>
            <span style="font-size: 20px; font-weight: 800; color: #0f172a; vertical-align: middle;">${child.name}</span>
            <span style="background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 6px; margin-left: 8px;">Lvl ${child.level}</span>
          </div>
          <div style="text-align: right;">
            <span style="color: #f97316; font-weight: 800; font-size: 14px;">🔥 ${child.streakDays} Day Streak</span>
          </div>
        </div>

        <!-- Metric Grid -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td width="50%" style="padding-right: 8px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Today's Points</div>
                <div style="font-size: 22px; font-weight: 900; color: ${isGoalMet ? '#10b981' : '#f59e0b'};">
                  +${pointsToday} <span style="font-size: 13px; color: #64748b; font-weight: 600;">/ ${goal} pts</span>
                </div>
                <div style="font-size: 12px; color: ${isGoalMet ? '#10b981' : '#64748b'}; margin-top: 4px; font-weight: 600;">
                  ${isGoalMet ? '🎉 Daily Goal Complete!' : `${progressPercent}% of goal`}
                </div>
              </div>
            </td>
            <td width="50%" style="padding-left: 8px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Spendable Bank</div>
                <div style="font-size: 22px; font-weight: 900; color: #4f46e5;">
                  ${child.currentPoints} <span style="font-size: 13px; color: #64748b; font-weight: 600;">⭐ pts</span>
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                  All-time: <strong>${child.totalPoints} pts</strong>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Chores Completed -->
        <div style="margin-bottom: 14px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">
            Completed Tasks Today (${childLogs.length})
          </h4>
          ${
            childLogs.length > 0
              ? `<ul style="margin: 0; padding: 0; list-style: none;">${completedList}</ul>`
              : `<p style="margin: 0; color: #94a3b8; font-size: 13px; font-style: italic;">No chores completed yet today.</p>`
          }
        </div>

        <!-- Missed Daily Chores -->
        ${
          missedDailyTasks.length > 0
            ? `<div>
                <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">
                  Remaining Daily Chores (${missedDailyTasks.length})
                </h4>
                <ul style="margin: 0; padding: 0; list-style: none;">${missedList}</ul>
              </div>`
            : `<div style="color: #10b981; font-size: 13px; font-weight: 600;">✨ All daily routine chores completed!</div>`
        }
      </div>
    `;
  }

  // Pending Rewards Section
  let pendingRewardsHtml = '';
  if (pendingRedemptions.length > 0) {
    const list = pendingRedemptions
      .map((r) => {
        const child = data.children.find((c) => c.id === r.childId);
        return `<li style="padding: 8px 0; border-bottom: 1px solid #fed7aa; color: #7c2d12; font-size: 14px;">
          <strong>${child?.name || 'Child'}</strong> requested <strong>"${r.rewardTitle}"</strong> for <strong>${r.pointsSpent} pts</strong>.
        </li>`;
      })
      .join('');

    pendingRewardsHtml = `
      <div style="background: #fff7ed; border-radius: 16px; border: 1px solid #fed7aa; padding: 16px 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; color: #c2410c; font-size: 15px; font-weight: 800;">
          🎁 Rewards Awaiting Your Approval (${pendingRedemptions.length})
        </h3>
        <ul style="margin: 0; padding: 0; list-style: none;">${list}</ul>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #9a3412;">
          Open the web app in Parent Mode to approve or decline these requests.
        </p>
      </div>
    `;
  }

  const subject = `⭐ Daily Chore Report - ${dateFormatted}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); border-radius: 20px 20px 0 0; padding: 28px 24px; text-align: center; color: #ffffff;">
                    <div style="font-size: 40px; margin-bottom: 8px;">⭐</div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Chore Points Tracker</h1>
                    <p style="margin: 6px 0 0 0; font-size: 14px; color: #c7d2fe; font-weight: 500;">Daily Summary for ${dateFormatted}</p>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 16px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                    ${pendingRewardsHtml}
                    ${childrenSectionsHtml}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #ffffff; border-radius: 0 0 20px 20px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      Sent automatically from your <strong>Unraid Chore Tracker</strong> server.
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                      Need to add chores or adjust points? Launch the app on your home network.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
}

// Send the daily report email
export async function sendDailyReport(
  data: FamilyAppData,
  recipientOverride?: string
): Promise<{ success: boolean; message: string; recipient?: string }> {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      message:
        'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your environment or Unraid Docker template.',
    };
  }

  const recipient = recipientOverride || config.recipient;
  if (!recipient) {
    return {
      success: false,
      message: 'No recipient email configured. Please specify PARENT_EMAIL.',
    };
  }

  try {
    const client = getTransporter();
    const { subject, html } = generateDailyReportHtml(data);

    await client.sendMail({
      from: `"Chore Tracker" <${config.user}>`,
      to: recipient,
      subject,
      html,
    });

    lastReportSentTimestamp = new Date().toISOString();
    return {
      success: true,
      message: `Daily report successfully sent to ${recipient}!`,
      recipient,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Failed to send daily report email via Gmail:', errMsg);
    return {
      success: false,
      message: `Failed to send email: ${errMsg}`,
    };
  }
}

// Initialize automated cron job based on DAILY_REPORT_TIME
export function initEmailScheduler(readLatestData: () => FamilyAppData) {
  const reportTime = process.env.DAILY_REPORT_TIME?.trim() || '20:00';
  const [hourStr, minStr] = reportTime.split(':');
  const hour = parseInt(hourStr, 10) || 20;
  const minute = parseInt(minStr, 10) || 0;

  // Standard cron syntax: minute hour * * *
  const cronExpr = `${minute} ${hour} * * *`;

  console.log(`[Email Scheduler] Initializing daily chore email job at ${reportTime} (${cronExpr})`);

  cron.schedule(cronExpr, async () => {
    console.log(`[Email Scheduler] Triggering daily report send at ${new Date().toISOString()}...`);
    const data = readLatestData();
    const result = await sendDailyReport(data);
    console.log(`[Email Scheduler] Result:`, result);
  });
}
