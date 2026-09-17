import { FamilyAppData, TaskCompletionLog } from '../types';
import { defaultFamilyData } from '../initialData';

const LOCAL_STORAGE_KEY = 'chore_tracker_local_cache_v1';

// Get initial cached data or fallback to defaults
export function getLocalCache(): FamilyAppData {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed: FamilyAppData = JSON.parse(cached);
      if (Array.isArray(parsed.tasks)) {
        parsed.tasks.forEach((t) => {
          if (t.choreType === 'allowance') {
            t.points = 0;
          }
        });
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
  }
  return defaultFamilyData;
}

export function saveLocalCache(data: FamilyAppData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to write to localStorage:', e);
  }
}

// Fetch data from Unraid Express server
export async function fetchServerData(): Promise<{ data: FamilyAppData; isServerOnline: boolean }> {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      saveLocalCache(data);
      return { data, isServerOnline: true };
    }
  } catch (err) {
    console.warn('Server API not reachable, using local cache:', err);
  }
  return { data: getLocalCache(), isServerOnline: false };
}

// Sync full state to server
export async function syncServerData(data: FamilyAppData): Promise<boolean> {
  saveLocalCache(data);
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to sync to server:', err);
    return false;
  }
}

// Complete task via server API
export async function apiCompleteTask(
  childId: string,
  taskId: string,
  note?: string,
  dateStr?: string
): Promise<{ success: boolean; data?: FamilyAppData; completedLog?: TaskCompletionLog; pointsEarned?: number }> {
  try {
    const res = await fetch('/api/complete-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, taskId, note, dateStr }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        saveLocalCache(result.data);
      }
      return result;
    }
  } catch (err) {
    console.warn('API call failed, falling back to local calculation:', err);
  }

  // Local fallback calculation if offline
  const current = getLocalCache();
  const child = current.children.find((c) => c.id === childId);
  const task = current.tasks.find((t) => t.id === taskId);
  if (!child || !task) return { success: false };

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDateStr = (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) ? dateStr : todayStr;
  const isAllowanceOnly = task.choreType === 'allowance' || (!task.choreType && !task.isBonus);
  const pts = isAllowanceOnly ? 0 : (Number(task.points) || 0);

  if (pts > 0) {
    child.totalPoints += pts;
    child.currentPoints += pts;
    child.level = Math.max(1, Math.floor(child.totalPoints / 250) + 1);
  }

  if (targetDateStr === todayStr && child.lastActiveDate !== todayStr) {
    child.streakDays = (child.streakDays || 0) + 1;
    child.lastActiveDate = todayStr;
  }

  const completedAt = targetDateStr === todayStr 
    ? new Date().toISOString() 
    : `${targetDateStr}T12:00:00.000Z`;

  const newLog: TaskCompletionLog = {
    id: `log-${Date.now()}`,
    childId: child.id,
    taskId: task.id,
    taskTitle: task.title,
    pointsEarned: pts,
    completedAt,
    dateStr: targetDateStr,
    note,
    verifiedByParent: true,
  };

  current.logs.unshift(newLog);
  saveLocalCache(current);

  return { success: true, data: current, completedLog: newLog, pointsEarned: pts };
}

// Undo task log
export async function apiUndoTask(logId: string): Promise<FamilyAppData | null> {
  try {
    const res = await fetch('/api/undo-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        saveLocalCache(result.data);
        return result.data;
      }
    }
  } catch (e) {
    console.warn('Failed to undo task on server:', e);
  }

  // Local fallback
  const current = getLocalCache();
  const idx = current.logs.findIndex((l) => l.id === logId);
  if (idx !== -1) {
    const [removed] = current.logs.splice(idx, 1);
    const child = current.children.find((c) => c.id === removed.childId);
    if (child && removed.pointsEarned > 0) {
      child.totalPoints = Math.max(0, child.totalPoints - removed.pointsEarned);
      child.currentPoints = Math.max(0, child.currentPoints - removed.pointsEarned);
      child.level = Math.max(1, Math.floor(child.totalPoints / 250) + 1);
    }
    saveLocalCache(current);
    return current;
  }
  return null;
}

// Redeem reward
export async function apiRedeemReward(childId: string, rewardId: string): Promise<FamilyAppData | null> {
  try {
    const res = await fetch('/api/redeem-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, rewardId }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        saveLocalCache(result.data);
        return result.data;
      }
    }
  } catch (e) {
    console.warn('Server redeem failed, using local fallback:', e);
  }

  const current = getLocalCache();
  const child = current.children.find((c) => c.id === childId);
  const reward = current.rewards.find((r) => r.id === rewardId);
  if (!child || !reward || child.currentPoints < reward.pointsCost) return null;

  // Strict check: cannot claim rewards assigned to another child
  if (
    reward.assignedTo &&
    reward.assignedTo.length > 0 &&
    !reward.assignedTo.includes(childId)
  ) {
    return null;
  }

  child.currentPoints -= reward.pointsCost;
  current.redemptions.unshift({
    id: `red-${Date.now()}`,
    childId: child.id,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: reward.pointsCost,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  });

  saveLocalCache(current);
  return current;
}

// Record allowance payout
export async function apiRecordAllowancePayout(
  childId: string,
  monthYear: string,
  amountPaid: number,
  completionRatePercent: number,
  notes?: string
): Promise<FamilyAppData | null> {
  try {
    const res = await fetch('/api/record-allowance-payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, monthYear, amountPaid, completionRatePercent, notes }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        saveLocalCache(result.data);
        return result.data;
      }
    }
  } catch (e) {
    console.warn('Server payout save failed, using local fallback:', e);
  }

  const current = getLocalCache();
  const child = current.children.find((c) => c.id === childId);
  if (!child) return null;

  if (!current.allowancePayouts) {
    current.allowancePayouts = [];
  }

  current.allowancePayouts.unshift({
    id: `pay-${Date.now()}`,
    childId: child.id,
    childName: child.name,
    monthYear,
    targetAllowance: child.monthlyAllowanceTarget ?? 25,
    completionRatePercent,
    amountPaid,
    paidAt: new Date().toISOString(),
    notes: notes || `Monthly allowance payout (${completionRatePercent}% complete)`,
  });

  saveLocalCache(current);
  return current;
}

