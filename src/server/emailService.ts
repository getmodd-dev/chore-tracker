import nodemailer, { Transporter } from 'nodemailer';
import cron from 'node-cron';
import { FamilyAppData, Child, TaskCompletionLog, ChoreTask, AllowancePayoutRecord } from '../types';
import { getPacificDateStr, PACIFIC_TIMEZONE } from '../utils/dateUtils';
import { calculateChildMonthlyAllowance, getPreviousMonthInfo, formatMonthPeriod } from '../utils/allowance';

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
  const dateStr = targetDateStr || getPacificDateStr(0);
  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

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

// Build clean, mobile-responsive HTML email for Monthly Allowance Settlement
export function generateMonthlyAllowanceReportHtml(
  data: FamilyAppData,
  targetMonthKey?: string
): {
  subject: string;
  html: string;
  monthName: string;
  totalFamilyPayout: number;
  prevMonthKey: string;
} {
  const prevMonthInfo = getPreviousMonthInfo();
  let refDate = prevMonthInfo.date;
  let monthKey = prevMonthInfo.monthKey;
  let monthName = prevMonthInfo.monthName;

  if (targetMonthKey) {
    const [yStr, mStr] = targetMonthKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    refDate = new Date(y, m, 15);
    monthKey = targetMonthKey;
    monthName = refDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Calculate current month name for reset reference
  const currentMonthName = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const periodLabel = formatMonthPeriod(monthKey);
  const currencySymbol = data.settings.allowanceCurrencySymbol || '$';

  let totalFamilyPayout = 0;
  let totalDutiesCompleted = 0;
  let totalDutiesExpected = 0;

  const childrenCardsHtml = data.children
    .map((child) => {
      const stats = calculateChildMonthlyAllowance(child, data.tasks, data.logs, refDate);
      totalFamilyPayout += stats.accruedAmount;
      totalDutiesCompleted += stats.completedInstances;
      totalDutiesExpected += stats.totalExpectedInstances;

      // Filter month logs for this child
      const childMonthLogs = data.logs.filter(
        (l) => l.childId === child.id && l.dateStr.startsWith(monthKey)
      );

      // Group chore completions by task title
      const choreCounts: Record<
        string,
        { title: string; count: number; points: number; isAllowance: boolean }
      > = {};
      for (const log of childMonthLogs) {
        if (!choreCounts[log.taskTitle]) {
          const task = data.tasks.find((t) => t.id === log.taskId);
          const isAllowance = task
            ? task.choreType === 'allowance' ||
              task.choreType === 'both' ||
              (!task.choreType && !task.isBonus)
            : true;
          choreCounts[log.taskTitle] = {
            title: log.taskTitle,
            count: 0,
            points: 0,
            isAllowance,
          };
        }
        choreCounts[log.taskTitle].count += 1;
        choreCounts[log.taskTitle].points += log.pointsEarned || 0;
      }

      const choreEntries = Object.values(choreCounts).sort((a, b) => b.count - a.count);
      const allowanceChoresDone = choreEntries.filter((c) => c.isAllowance);
      const bonusChoresDone = choreEntries.filter((c) => !c.isAllowance);

      const bonusPointsEarned = bonusChoresDone.reduce((sum, c) => sum + c.points, 0);

      const isHighRate = stats.completionRatePercent >= 80;
      const isMediumRate = stats.completionRatePercent >= 60;
      const badgeColor = isHighRate ? '#10b981' : isMediumRate ? '#f59e0b' : '#64748b';
      const badgeBg = isHighRate ? '#ecfdf5' : isMediumRate ? '#fffbeb' : '#f1f5f9';
      const progressFillColor = isHighRate ? '#10b981' : isMediumRate ? '#f59e0b' : '#6366f1';

      return `
      <div style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <!-- Child Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
          <tr>
            <td style="vertical-align: middle;">
              <span style="font-size: 30px; vertical-align: middle; margin-right: 8px;">${child.avatar}</span>
              <span style="font-size: 20px; font-weight: 800; color: #0f172a; vertical-align: middle;">${child.name}</span>
              <span style="background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; margin-left: 8px;">Lvl ${child.level || 1}</span>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}40; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: 12px; display: inline-block;">
                ${stats.completionRatePercent}% Complete
              </span>
            </td>
          </tr>
        </table>

        <!-- Metric Cards -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td width="50%" style="padding-right: 6px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #166534; margin-bottom: 2px;">Earned Allowance</div>
                <div style="font-size: 26px; font-weight: 900; color: #15803d; letter-spacing: -0.5px;">
                  ${currencySymbol}${stats.accruedAmount.toFixed(2)}
                </div>
                <div style="font-size: 11px; color: #166534; margin-top: 2px;">
                  of ${currencySymbol}${stats.targetAllowance.toFixed(2)} monthly target
                </div>
              </div>
            </td>
            <td width="50%" style="padding-left: 6px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px;">Chores Executed</div>
                <div style="font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                  ${stats.completedInstances} <span style="font-size: 14px; font-weight: 600; color: #64748b;">/ ${stats.totalExpectedInstances}</span>
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                  ${stats.allowanceChoresCount} assigned allowance duties
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Progress Bar -->
        <div style="background: #e2e8f0; height: 10px; border-radius: 9999px; overflow: hidden; margin-bottom: 16px;">
          <div style="background: ${progressFillColor}; width: ${stats.completionRatePercent}%; height: 100%; border-radius: 9999px;"></div>
        </div>

        <!-- Chore Breakdown List -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
          <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Completed Allowance Chores (${allowanceChoresDone.length})
          </div>
          ${
            allowanceChoresDone.length > 0
              ? `<ul style="list-style: none; padding: 0; margin: 0;">
                  ${allowanceChoresDone
                    .map(
                      (c) => `
                    <li style="padding: 5px 0; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #1e293b; display: flex; justify-content: space-between;">
                      <span><strong style="color: #10b981;">✓</strong> ${c.title}</span>
                      <span style="font-weight: 700; color: #475569; background: #e2e8f0; padding: 1px 7px; border-radius: 6px; font-size: 11px;">${c.count}× done</span>
                    </li>`
                    )
                    .join('')}
                </ul>`
              : `<div style="font-size: 13px; color: #94a3b8; font-style: italic;">No routine allowance chores logged in ${monthName}.</div>`
          }

          ${
            bonusPointsEarned > 0
              ? `
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #4338ca; font-weight: 600;">
                ⭐ Also earned +${bonusPointsEarned} bonus points from extra bounty chores!
              </div>`
              : ''
          }
        </div>
      </div>
    `;
    })
    .join('');

  const subject = `💰 Monthly Allowance Settlement - ${monthName} (${currencySymbol}${totalFamilyPayout.toFixed(2)} Total Earned)`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px;">
      <div style="max-width: 620px; margin: 0 auto;">

        <!-- Header Hero Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-radius: 20px; padding: 26px 24px; color: #ffffff; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);">
          <div>
            <div style="display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 20px; margin-bottom: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
              Monthly Settlement • 1st of the Month
            </div>
            <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
              💰 Monthly Allowance Statement
            </h1>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">
              ${monthName} Summary (${periodLabel})
            </p>
          </div>

          <!-- Total Family Payout Card -->
          <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 14px 18px; margin-top: 18px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Family Payout</div>
                  <div style="font-size: 28px; font-weight: 900; color: #34d399; letter-spacing: -0.5px; margin-top: 2px;">
                    ${currencySymbol}${totalFamilyPayout.toFixed(2)}
                  </div>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <div style="font-size: 12px; color: #cbd5e1; font-weight: 600;">
                    ${totalDutiesCompleted} of ${totalDutiesExpected} chores completed
                  </div>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                    Across ${data.children.length} children
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Reset Notice Banner -->
          <div style="margin-top: 14px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; padding: 10px 14px; font-size: 12px; color: #7dd3fc; line-height: 1.4;">
            🔄 <strong>Allowance Tracker Reset:</strong> The chore tracker has rolled over for <strong>${currentMonthName}</strong>. All kids start fresh from ${currencySymbol}0.00 to build their new month's earnings!
          </div>
        </div>

        <!-- Children Sections -->
        ${childrenCardsHtml}

        <!-- Parent Action Guide -->
        <div style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 800; color: #0f172a;">
            💡 Parent Next Steps:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;">
            <li>Transfer or hand cash to your children based on their earned payout above.</li>
            <li>Each child's monthly statement for ${monthName} is permanently recorded and archived in the Allowance Dashboard.</li>
            <li>Current month (${currentMonthName}) is active on their devices with fresh streak and goal targets.</li>
          </ul>

          <div style="margin-top: 16px; text-align: center;">
            <a href="http://${data.settings.unraidHostName || 'localhost'}:3000" style="display: inline-block; background: #4f46e5; color: #ffffff; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 12px; text-decoration: none; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
              Open Allowance Dashboard →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5; padding: 0 10px;">
          <p style="margin: 0 0 4px 0;">
            Sent automatically by Chore Tracker on the 1st of the month.
          </p>
          <p style="margin: 0;">
            Pacific Time (${PACIFIC_TIMEZONE}) • Unraid Host: <code>${data.settings.unraidHostName || 'chore-tracker'}</code>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return {
    subject,
    html,
    monthName,
    totalFamilyPayout,
    prevMonthKey: monthKey,
  };
}

// Automatically settles previous month's allowance into data.allowancePayouts
export function autoSettleMonthlyAllowance(
  data: FamilyAppData,
  monthKey: string
): { settledCount: number; totalAmount: number; records: AllowancePayoutRecord[] } {
  if (!data.allowancePayouts) {
    data.allowancePayouts = [];
  }

  const [yStr, mStr] = monthKey.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;
  const refDate = new Date(y, m, 15);
  const monthName = refDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let settledCount = 0;
  let totalAmount = 0;
  const newRecords: AllowancePayoutRecord[] = [];

  for (const child of data.children) {
    const alreadyExists = data.allowancePayouts.some(
      (p) => p.childId === child.id && p.monthYear === monthKey
    );

    if (!alreadyExists) {
      const stats = calculateChildMonthlyAllowance(child, data.tasks, data.logs, refDate);
      const record: AllowancePayoutRecord = {
        id: `payout-auto-${child.id}-${monthKey}`,
        childId: child.id,
        childName: child.name,
        monthYear: monthKey,
        targetAllowance: stats.targetAllowance,
        completionRatePercent: stats.completionRatePercent,
        amountPaid: stats.accruedAmount,
        paidAt: new Date().toISOString(),
        notes: `Automated end-of-month allowance reset settlement for ${monthName} (${stats.completedInstances}/${stats.totalExpectedInstances} chores, ${stats.completionRatePercent}%)`,
        isAutoSettled: true,
      };

      data.allowancePayouts.unshift(record);
      newRecords.push(record);
      settledCount += 1;
      totalAmount += stats.accruedAmount;
    }
  }

  return { settledCount, totalAmount, records: newRecords };
}

// Send the monthly allowance report email
export async function sendMonthlyAllowanceReport(
  data: FamilyAppData,
  targetMonthKey?: string,
  recipientOverride?: string
): Promise<{
  success: boolean;
  message: string;
  recipient?: string;
  monthKey?: string;
  totalFamilyPayout?: number;
}> {
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
    const { subject, html, prevMonthKey, totalFamilyPayout } =
      generateMonthlyAllowanceReportHtml(data, targetMonthKey);

    await client.sendMail({
      from: `"Chore Tracker Allowance" <${config.user}>`,
      to: recipient,
      subject,
      html,
    });

    return {
      success: true,
      message: `Monthly allowance report for ${prevMonthKey} successfully sent to ${recipient}!`,
      recipient,
      monthKey: prevMonthKey,
      totalFamilyPayout,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Failed to send monthly allowance report email via Gmail:', errMsg);
    return {
      success: false,
      message: `Failed to send email: ${errMsg}`,
    };
  }
}

// Initialize automated cron jobs (Daily digest at DAILY_REPORT_TIME + Monthly allowance on the 1st)
export function initEmailScheduler(
  readLatestData: () => FamilyAppData,
  writeLatestData?: (data: FamilyAppData) => void
) {
  const reportTime = process.env.DAILY_REPORT_TIME?.trim() || '20:00';
  const [hourStr, minStr] = reportTime.split(':');
  const hour = parseInt(hourStr, 10) || 20;
  const minute = parseInt(minStr, 10) || 0;

  // 1. Daily Report Job: minute hour * * *
  const dailyCronExpr = `${minute} ${hour} * * *`;
  console.log(`[Email Scheduler] Initializing daily chore email job at ${reportTime} PST/PDT (${dailyCronExpr})`);

  cron.schedule(
    dailyCronExpr,
    async () => {
      console.log(`[Email Scheduler] Triggering daily report send at ${new Date().toISOString()}...`);
      const data = readLatestData();
      const result = await sendDailyReport(data);
      console.log(`[Email Scheduler] Result:`, result);
    },
    {
      timezone: PACIFIC_TIMEZONE,
    }
  );

  // 2. Monthly Allowance Settlement Job: Runs at 08:00 AM on day 1 of every month (Pacific Time)
  const monthlyCronExpr = '0 8 1 * *';
  console.log(
    `[Email Scheduler] Initializing monthly allowance settlement email job on the 1st of every month at 08:00 AM PST/PDT (${monthlyCronExpr})`
  );

  cron.schedule(
    monthlyCronExpr,
    async () => {
      console.log(
        `[Email Scheduler] 1st of the month reached! Triggering allowance settlement & monthly report at ${new Date().toISOString()}...`
      );
      const data = readLatestData();
      const prevInfo = getPreviousMonthInfo();

      // Auto-settle previous month's payout records into data.allowancePayouts
      if (writeLatestData) {
        const { settledCount, totalAmount } = autoSettleMonthlyAllowance(data, prevInfo.monthKey);
        console.log(
          `[Email Scheduler] Auto-settled ${settledCount} children for ${prevInfo.monthKey} ($${totalAmount.toFixed(2)})`
        );
        data.settings.lastMonthlyReportSentMonth = prevInfo.monthKey;
        writeLatestData(data);
      }

      const result = await sendMonthlyAllowanceReport(data, prevInfo.monthKey);
      console.log(`[Email Scheduler] Monthly allowance report delivery result:`, result);
    },
    {
      timezone: PACIFIC_TIMEZONE,
    }
  );
}

