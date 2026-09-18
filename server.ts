import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import {
  getEmailConfig,
  sendDailyReport,
  generateDailyReportHtml,
  initEmailScheduler,
} from './src/server/emailService.ts';
import {
  sendChildChoreSms,
  composeChildChoreSms,
  formatCarrierEmail,
  initSmsScheduler,
} from './src/server/smsService.ts';
import {
  sendChildPushoverNotification,
  composeChildPushoverMessage,
  getPushoverAppToken,
  initPushoverScheduler,
} from './src/server/pushoverService.ts';
import {
  APP_VERSION,
  APP_VERSION_LABEL,
  BUILD_DATE,
  BUILD_TIMESTAMP,
  BUILD_CHANNEL,
  BUILD_ENVIRONMENT,
} from './src/version.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists for Unraid Docker persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'chores_data.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Timezone configuration (defaults to Pacific Time America/Los_Angeles)
const APP_TIMEZONE = process.env.TZ || 'America/Los_Angeles';

const getPacificParts = (date = new Date(), timezone = APP_TIMEZONE) => {
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
  for (const p of parts) map[p.type] = p.value;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = weekdays.indexOf(map.weekday);

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hours: parseInt(map.hour, 10),
    minutes: parseInt(map.minute, 10),
    seconds: parseInt(map.second, 10),
    dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 0,
    dateStr: `${map.year}-${map.month}-${map.day}`,
    timeStr: `${map.hour}:${map.minute}`,
  };
};

// Returns YYYY-MM-DD in Pacific Time (day changes strictly at midnight PST/PDT)
const getTodayDateStr = (offsetDays = 0, timezone = APP_TIMEZONE) => {
  const parts = getPacificParts(new Date(), timezone);
  if (offsetDays === 0) return parts.dateStr;
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays));
  return d.toISOString().split('T')[0];
};

function getInitialData() {
  return {
    children: [
      {
        id: 'child-1',
        name: 'Liam',
        avatar: '👦',
        color: '#3b82f6',
        totalPoints: 840,
        currentPoints: 460,
        dailyGoal: 100,
        streakDays: 6,
        lastActiveDate: getTodayDateStr(0),
        badge: 'Chore Champion',
        level: 4,
      },
      {
        id: 'child-2',
        name: 'Emma',
        avatar: '👧',
        color: '#ec4899',
        totalPoints: 720,
        currentPoints: 390,
        dailyGoal: 80,
        streakDays: 4,
        lastActiveDate: getTodayDateStr(0),
        badge: 'Super Helper',
        level: 3,
      },
      {
        id: 'child-3',
        name: 'Noah',
        avatar: '🧒',
        color: '#10b981',
        totalPoints: 490,
        currentPoints: 240,
        dailyGoal: 60,
        streakDays: 3,
        lastActiveDate: getTodayDateStr(-1),
        badge: 'Rising Star',
        level: 2,
      },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Make Bed',
        description: 'Straighten sheets, fluff pillows, make bedroom tidy',
        category: 'daily_routine',
        points: 0,
        icon: 'bed',
        frequency: 'daily',
        choreType: 'allowance',
      },
      {
        id: 'task-2',
        title: 'Brush Teeth (Morning & Night)',
        description: '2 full minutes with timer and floss',
        category: 'daily_routine',
        points: 0,
        icon: 'sparkles',
        frequency: 'daily',
        choreType: 'allowance',
      },
      {
        id: 'task-3',
        title: 'Clothes in Laundry Hamper',
        description: 'Put dirty clothes inside the hamper, not on the floor',
        category: 'daily_routine',
        points: 0,
        icon: 'shirt',
        frequency: 'daily',
        choreType: 'allowance',
      },
      {
        id: 'task-4',
        title: 'Pack School Backpack',
        description: 'Folders, books, lunch box, and water bottle ready',
        category: 'school_study',
        points: 0,
        icon: 'backpack',
        frequency: 'daily',
        choreType: 'allowance',
      },
      {
        id: 'task-5',
        title: '20 Mins of Reading',
        description: 'Read a book, comic, or chapter reader quietly',
        category: 'school_study',
        points: 30,
        icon: 'book-open',
        frequency: 'daily',
        choreType: 'bonus_points',
      },
      {
        id: 'task-6',
        title: 'Complete Homework',
        description: 'Finish all school assignments before dinner',
        category: 'school_study',
        points: 0,
        icon: 'check-circle-2',
        frequency: 'daily',
        choreType: 'allowance',
      },
      {
        id: 'task-7',
        title: 'Tidy Bedroom & Toys',
        description: 'Put toys in bins, clear floor, shelf neat',
        category: 'bedroom_home',
        points: 0,
        icon: 'box',
        frequency: 'daily',
        choreType: 'allowance',
      },
      {
        id: 'task-8',
        title: 'Unload the Dishwasher',
        description: 'Put plates, cups, and silverware in cabinets carefully',
        category: 'bedroom_home',
        points: 35,
        icon: 'utensils',
        frequency: 'anytime',
        choreType: 'both',
      },
      {
        id: 'task-9',
        title: 'Take Out Trash & Recycling',
        description: 'Empty small cans, tie bags, and wheel out to bins',
        category: 'bedroom_home',
        points: 0,
        icon: 'trash-2',
        frequency: 'weekly',
        choreType: 'allowance',
      },
      {
        id: 'task-10',
        title: 'Feed Family Pet',
        description: 'Fill clean food bowl and fresh water',
        category: 'pet_care',
        points: 0,
        icon: 'heart-handshake',
        frequency: 'daily',
        choreType: 'allowance',
      },
      {
        id: 'task-11',
        title: 'Water Garden & Plants',
        description: 'Water patio flowers and indoor houseplants',
        category: 'yard_outdoor',
        points: 25,
        icon: 'flower-2',
        frequency: 'weekly',
        choreType: 'both',
      },
      {
        id: 'task-12',
        title: 'Help Cook Dinner',
        description: 'Wash veggies, stir ingredients, or set the dining table',
        category: 'bonus',
        points: 40,
        icon: 'chef-hat',
        frequency: 'anytime',
        isBonus: true,
        choreType: 'bonus_points',
      },
      {
        id: 'task-13',
        title: 'Random Act of Kindness',
        description: 'Help a sibling, give a sincere compliment, or do an unasked good deed',
        category: 'kindness_habits',
        points: 30,
        icon: 'heart',
        frequency: 'anytime',
        isBonus: true,
        choreType: 'bonus_points',
      },
    ],
    logs: [
      {
        id: 'log-1',
        childId: 'child-1',
        taskId: 'task-1',
        taskTitle: 'Make Bed',
        pointsEarned: 0,
        completedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        dateStr: getTodayDateStr(0),
        note: 'Done right after waking up',
        verifiedByParent: true,
      },
      {
        id: 'log-2',
        childId: 'child-1',
        taskId: 'task-2',
        taskTitle: 'Brush Teeth (Morning & Night)',
        pointsEarned: 0,
        completedAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
        dateStr: getTodayDateStr(0),
        verifiedByParent: true,
      },
      {
        id: 'log-3',
        childId: 'child-1',
        taskId: 'task-5',
        taskTitle: '20 Mins of Reading',
        pointsEarned: 30,
        completedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        dateStr: getTodayDateStr(0),
        note: 'Read chapter 3',
        verifiedByParent: true,
      },
      {
        id: 'log-4',
        childId: 'child-2',
        taskId: 'task-1',
        taskTitle: 'Make Bed',
        pointsEarned: 0,
        completedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        dateStr: getTodayDateStr(0),
        verifiedByParent: true,
      },
      {
        id: 'log-5',
        childId: 'child-2',
        taskId: 'task-10',
        taskTitle: 'Feed Family Pet',
        pointsEarned: 0,
        completedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        dateStr: getTodayDateStr(0),
        verifiedByParent: true,
      },
      {
        id: 'log-6',
        childId: 'child-3',
        taskId: 'task-1',
        taskTitle: 'Make Bed',
        pointsEarned: 0,
        completedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        dateStr: getTodayDateStr(-1),
        verifiedByParent: true,
      },
    ],
    rewards: [
      {
        id: 'rew-1',
        title: '30 Mins Extra Screen Time',
        description: 'iPad, Nintendo Switch, or TV time after homework',
        pointsCost: 75,
        icon: 'tv',
        category: 'Entertainment',
      },
      {
        id: 'rew-2',
        title: 'Choose Tonight’s Movie',
        description: 'You pick the family movie and the couch snack',
        pointsCost: 120,
        icon: 'film',
        category: 'Privilege',
      },
      {
        id: 'rew-3',
        title: 'Ice Cream Parlor Outing',
        description: 'Trip to favorite ice cream shop for a double scoop with toppings',
        pointsCost: 250,
        icon: 'ice-cream',
        category: 'Treats',
      },
      {
        id: 'rew-4',
        title: 'Stay Up 30 Mins Late',
        description: 'Friday or weekend bedtime extension',
        pointsCost: 100,
        icon: 'moon',
        category: 'Privilege',
      },
      {
        id: 'rew-5',
        title: 'Pass: Skip One Chore',
        description: 'Redeem to skip one chore of your choice (except brushing teeth!)',
        pointsCost: 200,
        icon: 'sparkles',
        category: 'Privilege',
      },
      {
        id: 'rew-6',
        title: '$10 Toy or Book Store Pick',
        description: 'Trip to pick out a new toy, game, or book of choice',
        pointsCost: 500,
        icon: 'gift',
        category: 'Prizes',
      },
      {
        id: 'rew-7',
        title: 'Pizza Night Request',
        description: 'Choose pizza toppings or local restaurant for dinner',
        pointsCost: 350,
        icon: 'pizza',
        category: 'Treats',
      },
      {
        id: 'rew-8',
        title: 'Arcade / Trampoline Park Trip',
        description: 'Full afternoon of arcade gaming or trampoline jumping',
        pointsCost: 850,
        icon: 'trophy',
        category: 'Big Adventure',
      },
      {
        id: 'rew-9',
        title: 'Nintendo Switch Mario Kart Tournament',
        description: '1 hour uninterrupted Switch gaming with sibling or parent',
        pointsCost: 150,
        icon: 'gamepad',
        category: 'Special',
        assignedTo: ['child-1'],
      },
      {
        id: 'rew-10',
        title: 'New Watercolor & Sketchbook Kit',
        description: 'Pick out premium art pens and drawing pad at the store',
        pointsCost: 350,
        icon: 'gift',
        category: 'Creative',
        assignedTo: ['child-2'],
      },
      {
        id: 'rew-11',
        title: 'Trip to Indoor Playground / Dino Park',
        description: 'Special weekend morning playground climbing adventure',
        pointsCost: 200,
        icon: 'trophy',
        category: 'Outing',
        assignedTo: ['child-3'],
      },
    ],
    redemptions: [
      {
        id: 'red-1',
        childId: 'child-1',
        rewardId: 'rew-1',
        rewardTitle: '30 Mins Extra Screen Time',
        pointsSpent: 75,
        status: 'fulfilled',
        requestedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 47 * 3600 * 1000).toISOString(),
        parentNote: 'Enjoyed Mario Kart!',
      },
      {
        id: 'red-2',
        childId: 'child-2',
        rewardId: 'rew-4',
        rewardTitle: 'Stay Up 30 Mins Late',
        pointsSpent: 100,
        status: 'fulfilled',
        requestedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 71 * 3600 * 1000).toISOString(),
        parentNote: 'Watched Friday cartoon',
      },
    ],
    settings: {
      parentPin: '1234',
      currencyName: 'Points',
      currencySymbol: '⭐',
      soundEnabled: true,
      requireApprovalForTasks: false,
      unraidHostName: 'unraid.local:3000',
    },
  };
}

// Read database from disk
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tasks)) {
        let changed = false;
        // Normalize tasks: allowance-only chores must have 0 points
        parsed.tasks.forEach((t: { id: string; choreType?: string; isBonus?: boolean; points: number }) => {
          if (!t.choreType) {
            t.choreType = t.isBonus ? 'bonus_points' : 'allowance';
            changed = true;
          }
          if (t.choreType === 'allowance' && t.points !== 0) {
            t.points = 0;
            changed = true;
          }
        });
        if (changed) {
          writeData(parsed);
        }
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading data file, reinitializing:', err);
  }
  const initial = getInitialData();
  writeData(initial);
  return initial;
}

// Write database to disk safely with atomic temp file
function writeData(data: unknown) {
  try {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Error writing data file:', err);
    return false;
  }
}

// Initialize data if not present
if (!fs.existsSync(DATA_FILE)) {
  writeData(getInitialData());
}

// ---------------- API ROUTES ----------------

// GET full state
app.get('/api/data', (_req, res) => {
  const data = readData();
  res.json(data);
});

// POST update full state
app.post('/api/data', (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.children) || !Array.isArray(data.tasks)) {
    res.status(400).json({ error: 'Invalid data schema' });
    return;
  }
  writeData(data);
  res.json({ success: true });
});

// POST complete task
app.post('/api/complete-task', (req, res) => {
  const { childId, taskId, note, dateStr } = req.body;
  const data = readData();
  const child = data.children.find((c: { id: string }) => c.id === childId);
  const task = data.tasks.find((t: { id: string; choreType?: string; isBonus?: boolean; points: number; title: string }) => t.id === taskId);

  if (!child || !task) {
    res.status(404).json({ error: 'Child or Task not found' });
    return;
  }

  const todayStr = getTodayDateStr(0);
  const targetDateStr = (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) ? dateStr : todayStr;
  
  // Allowance-only chores do not award prize points
  const isAllowanceOnly = task.choreType === 'allowance' || (!task.choreType && !task.isBonus);
  const points = isAllowanceOnly ? 0 : (Number(task.points) || 0);

  // Update prize points only if the chore awards them
  if (points > 0) {
    child.totalPoints = (child.totalPoints || 0) + points;
    child.currentPoints = (child.currentPoints || 0) + points;
    child.level = Math.max(1, Math.floor(child.totalPoints / 250) + 1);
  }

  // Streak logic (update only if today)
  if (targetDateStr === todayStr) {
    if (child.lastActiveDate !== todayStr) {
      const yesterdayStr = getTodayDateStr(-1);
      if (child.lastActiveDate === yesterdayStr) {
        child.streakDays = (child.streakDays || 0) + 1;
      } else {
        child.streakDays = 1;
      }
      child.lastActiveDate = todayStr;
    }
  }

  const completedAt = targetDateStr === todayStr 
    ? new Date().toISOString() 
    : `${targetDateStr}T12:00:00.000Z`;

  // Add completion log
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    childId: child.id,
    taskId: task.id,
    taskTitle: task.title,
    pointsEarned: points,
    completedAt,
    dateStr: targetDateStr,
    note: note || undefined,
    verifiedByParent: !data.settings.requireApprovalForTasks,
  };

  data.logs.unshift(newLog);

  writeData(data);
  res.json({ success: true, data, completedLog: newLog, pointsEarned: points });
});

// POST undo completion log
app.post('/api/undo-task', (req, res) => {
  const { logId } = req.body;
  const data = readData();
  const logIndex = data.logs.findIndex((l: { id: string }) => l.id === logId);

  if (logIndex === -1) {
    res.status(404).json({ error: 'Log entry not found' });
    return;
  }

  const [removedLog] = data.logs.splice(logIndex, 1);
  const child = data.children.find((c: { id: string; totalPoints: number; currentPoints: number; level: number }) => c.id === removedLog.childId);
  if (child && removedLog.pointsEarned > 0) {
    child.totalPoints = Math.max(0, (child.totalPoints || 0) - removedLog.pointsEarned);
    child.currentPoints = Math.max(0, (child.currentPoints || 0) - removedLog.pointsEarned);
    child.level = Math.max(1, Math.floor(child.totalPoints / 250) + 1);
  }

  writeData(data);
  res.json({ success: true, data });
});

// POST redeem custom reward
app.post('/api/redeem-reward', (req, res) => {
  const { childId, rewardId } = req.body;
  const data = readData();
  const child = data.children.find((c: { id: string }) => c.id === childId);
  const reward = data.rewards.find((r: { id: string }) => r.id === rewardId);

  if (!child || !reward) {
    res.status(404).json({ error: 'Child or Reward not found' });
    return;
  }

  // Strict enforcement: ensure child is permitted to claim this reward
  if (
    Array.isArray(reward.assignedTo) &&
    reward.assignedTo.length > 0 &&
    !reward.assignedTo.includes(child.id)
  ) {
    res.status(403).json({ error: 'This reward is reserved for another child' });
    return;
  }

  const cost = Number(reward.pointsCost) || 0;
  if ((child.currentPoints || 0) < cost) {
    res.status(400).json({ error: 'Not enough spendable points' });
    return;
  }

  // Deduct spendable points
  child.currentPoints -= cost;

  const newRedemption = {
    id: `red-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    childId: child.id,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: cost,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  data.redemptions.unshift(newRedemption);
  writeData(data);
  res.json({ success: true, data, redemption: newRedemption });
});

// POST approve/reject redemption
app.post('/api/resolve-redemption', (req, res) => {
  const { redemptionId, action, note } = req.body;
  const data = readData();
  const redemption = data.redemptions.find((r: { id: string }) => r.id === redemptionId);

  if (!redemption) {
    res.status(404).json({ error: 'Redemption not found' });
    return;
  }

  if (action === 'approve') {
    redemption.status = 'approved';
    redemption.resolvedAt = new Date().toISOString();
    redemption.parentNote = note || redemption.parentNote;
  } else if (action === 'fulfill') {
    redemption.status = 'fulfilled';
    redemption.resolvedAt = new Date().toISOString();
  } else if (action === 'reject') {
    redemption.status = 'rejected';
    redemption.resolvedAt = new Date().toISOString();
    redemption.parentNote = note || 'Rejected by parent';
    // Refund points
    const child = data.children.find((c: { id: string }) => c.id === redemption.childId);
    if (child) {
      child.currentPoints += redemption.pointsSpent;
    }
  }

  writeData(data);
  res.json({ success: true, data });
});

// POST adjust points manually (Parent tool)
app.post('/api/adjust-points', (req, res) => {
  const { childId, amount, reason } = req.body;
  const data = readData();
  const child = data.children.find((c: { id: string }) => c.id === childId);

  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }

  const delta = Number(amount) || 0;
  child.currentPoints = Math.max(0, (child.currentPoints || 0) + delta);
  if (delta > 0) {
    child.totalPoints = (child.totalPoints || 0) + delta;
    child.level = Math.max(1, Math.floor(child.totalPoints / 250) + 1);
  }

  const logEntry = {
    id: `log-adj-${Date.now()}`,
    childId: child.id,
    taskId: 'custom-adjustment',
    taskTitle: delta >= 0 ? `Bonus: ${reason || 'Parent adjustment'}` : `Deduction: ${reason || 'Penalty adjustment'}`,
    pointsEarned: delta,
    completedAt: new Date().toISOString(),
    dateStr: getTodayDateStr(0),
    note: reason,
    verifiedByParent: true,
  };

  data.logs.unshift(logEntry);
  writeData(data);
  res.json({ success: true, data });
});

// POST record monthly allowance payout (Parent action)
app.post('/api/record-allowance-payout', (req, res) => {
  const { childId, monthYear, amountPaid, completionRatePercent, notes } = req.body;
  const data = readData();
  const child = data.children.find((c: { id: string }) => c.id === childId);

  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }

  if (!data.allowancePayouts) {
    data.allowancePayouts = [];
  }

  const payoutRecord = {
    id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    childId: child.id,
    childName: child.name,
    monthYear: monthYear || new Date().toISOString().substring(0, 7),
    targetAllowance: child.monthlyAllowanceTarget ?? 25,
    completionRatePercent: Number(completionRatePercent) || 0,
    amountPaid: Number(amountPaid) || 0,
    paidAt: new Date().toISOString(),
    notes: notes || `Monthly allowance payout (${completionRatePercent}% complete)`,
  };

  data.allowancePayouts.unshift(payoutRecord);
  writeData(data);
  res.json({ success: true, data, payout: payoutRecord });
});

// Unraid & System Info status endpoint
app.get('/api/unraid/status', (_req, res) => {
  res.json({
    status: 'online',
    system: {
      platform: os.platform(),
      hostname: os.hostname(),
      uptimeSeconds: Math.floor(process.uptime()),
      storageDirectory: DATA_DIR,
      dataFile: DATA_FILE,
      dataFileSize: fs.existsSync(DATA_FILE) ? fs.statSync(DATA_FILE).size : 0,
      nodeVersion: process.version,
      version: APP_VERSION,
      versionLabel: APP_VERSION_LABEL,
      buildDate: BUILD_DATE,
      buildTimestamp: BUILD_TIMESTAMP,
      buildChannel: BUILD_CHANNEL,
      buildEnvironment: BUILD_ENVIRONMENT,
    },
    message: 'Persistent storage active on Unraid local disk volume',
  });
});

// GET Version & Build Info
app.get('/api/version', (_req, res) => {
  res.json({
    version: APP_VERSION,
    versionLabel: APP_VERSION_LABEL,
    buildDate: BUILD_DATE,
    buildTimestamp: BUILD_TIMESTAMP,
    buildChannel: BUILD_CHANNEL,
    buildEnvironment: BUILD_ENVIRONMENT,
    timezone: APP_TIMEZONE,
  });
});

// ---------------- EMAIL / GMAIL AUTOMATION ROUTES ----------------

// GET Gmail configuration status
app.get('/api/email/status', (_req, res) => {
  const config = getEmailConfig();
  res.json(config);
});

// POST send immediate daily report (Test / On-Demand)
app.post('/api/email/send-now', async (req, res) => {
  const { recipientOverride } = req.body || {};
  const data = readData();
  const result = await sendDailyReport(data, recipientOverride);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// GET HTML preview of what the daily report email looks like
app.get('/api/email/preview', (_req, res) => {
  const data = readData();
  const { subject, html } = generateDailyReportHtml(data);
  res.json({ subject, html });
});

// ---------------- SMS / AT&T GATEWAY NOTIFICATION ROUTES ----------------

// GET child chore SMS preview text
app.get('/api/sms/preview/:childId', (req, res) => {
  const { childId } = req.params;
  const data = readData();
  const child = data.children.find((c: { id: string }) => c.id === childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  const preview = composeChildChoreSms(child, data);
  const recipientAddress = child.phoneNumber
    ? formatCarrierEmail(child.phoneNumber, child.carrier || 'att')
    : null;

  res.json({
    childId,
    childName: child.name,
    recipientAddress,
    ...preview,
  });
});

// POST send immediate SMS to a specific child (Test / On-Demand)
app.post('/api/sms/send-now', async (req, res) => {
  const { childId, customText } = req.body || {};
  const data = readData();
  const child = data.children.find((c: { id: string }) => c.id === childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }

  const result = await sendChildChoreSms(child, data, customText);
  if (result.success) {
    child.lastSmsSentDate = getTodayDateStr(0);
    writeData(data);
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// ---------------- PUSHOVER iOS PUSH NOTIFICATION ROUTES ----------------

// GET Pushover configuration status
app.get('/api/pushover/status', (_req, res) => {
  const data = readData();
  const appToken = getPushoverAppToken(data);
  res.json({
    isConfigured: Boolean(appToken && appToken.length > 5),
    maskedToken: appToken ? `${appToken.substring(0, 4)}••••••••${appToken.substring(appToken.length - 4)}` : '',
  });
});

// GET preview of Pushover notification for a child
app.get('/api/pushover/preview/:childId', (req, res) => {
  const { childId } = req.params;
  const data = readData();
  const child = data.children.find((c: { id: string }) => c.id === childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  const preview = composeChildPushoverMessage(child, data);
  res.json({
    childId,
    childName: child.name,
    hasUserKey: Boolean(child.pushoverUserKey),
    userKeyMasked: child.pushoverUserKey
      ? `${child.pushoverUserKey.substring(0, 4)}••••${child.pushoverUserKey.substring(child.pushoverUserKey.length - 4)}`
      : '',
    ...preview,
  });
});

// POST send immediate Pushover push notification to a child (Test or On-Demand)
app.post('/api/pushover/send-now', async (req, res) => {
  const { childId, customTitle, customMessage } = req.body || {};
  const data = readData();
  const child = data.children.find((c: { id: string }) => c.id === childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }

  const result = await sendChildPushoverNotification(child, data, {
    customTitle,
    customMessage,
  });

  if (result.success) {
    const todayStr = getTodayDateStr(0);
    child.lastNotificationSentDate = todayStr;
    writeData(data);
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Start server with Vite middleware in dev or static serving in prod
async function startServer() {
  // Initialize daily automated email scheduler
  try {
    initEmailScheduler(readData);
  } catch (err) {
    console.error('Failed to initialize email scheduler:', err);
  }

  // Initialize daily automated SMS scheduler for children
  try {
    initSmsScheduler(readData, writeData);
  } catch (err) {
    console.error('Failed to initialize SMS scheduler:', err);
  }

  // Initialize daily automated Pushover iOS push notification scheduler
  try {
    initPushoverScheduler(readData, writeData);
  } catch (err) {
    console.error('Failed to initialize Pushover scheduler:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chore Tracker server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
