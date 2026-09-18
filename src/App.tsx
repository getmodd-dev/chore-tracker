import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FamilyAppData,
  ActiveTab,
  Child,
  ChoreTask,
  CustomReward,
  AppSettings,
  AppTheme,
} from './types';
import { defaultFamilyData } from './initialData';
import {
  getLocalCache,
  fetchServerData,
  syncServerData,
  apiCompleteTask,
  apiUndoTask,
  apiRedeemReward,
  apiRecordAllowancePayout,
} from './utils/storage';
import { calculateChildMonthlyAllowance } from './utils/allowance';
import { getPacificDateStr, getMsUntilNextPacificMidnight } from './utils/dateUtils';
import { IOSHeader } from './components/iOSHeader';
import { IOSTabBar } from './components/iOSTabBar';
import { DailyStatsCard } from './components/DailyStatsCard';
import { TaskListView } from './components/TaskListView';
import { AllowanceDashboardView } from './components/AllowanceDashboardView';
import { RewardsView } from './components/RewardsView';
import { ActivityHistoryView } from './components/ActivityHistoryView';
import { SettingsAndUnraidModal } from './components/SettingsAndUnraidModal';
import { ChildSwitcherModal } from './components/ChildSwitcherModal';
import { IOSInstallGuideModal } from './components/IOSInstallGuideModal';

export default function App() {
  const [data, setData] = useState<FamilyAppData>(() => getLocalCache());
  const [selectedChildId, setSelectedChildId] = useState<string>(() => {
    const cached = getLocalCache();
    return cached.children[0]?.id || 'child-1';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
  const [isParentMode, setIsParentMode] = useState<boolean>(false);
  const [isChildModalOpen, setIsChildModalOpen] = useState<boolean>(false);
  const [isIOSGuideOpen, setIsIOSGuideOpen] = useState<boolean>(false);
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);

  // Hydrate data from Unraid Express server on mount
  useEffect(() => {
    fetchServerData().then(({ data: serverData, isServerOnline: online }) => {
      setData(serverData);
      setIsServerOnline(online);
      // Ensure selectedChildId is valid
      if (!serverData.children.some((c) => c.id === selectedChildId)) {
        setSelectedChildId(serverData.children[0]?.id || 'child-1');
      }
    });
  }, []);

  const selectedChild: Child =
    data.children.find((c) => c.id === selectedChildId) || data.children[0];

  const [todayStr, setTodayStr] = useState<string>(() => getPacificDateStr(0));

  // Automatically roll over the day at midnight Pacific Time (PST/PDT)
  useEffect(() => {
    const updateToday = () => {
      const currentPacificToday = getPacificDateStr(0);
      setTodayStr((prev) => (prev !== currentPacificToday ? currentPacificToday : prev));
    };

    let timerId: ReturnType<typeof setTimeout>;
    const scheduleNextPacificMidnight = () => {
      const msUntilMidnight = getMsUntilNextPacificMidnight();
      // Add 1000ms buffer past midnight to ensure clean calendar flip
      timerId = setTimeout(() => {
        updateToday();
        scheduleNextPacificMidnight();
      }, msUntilMidnight + 1000);
    };

    scheduleNextPacificMidnight();

    // Check periodically in case device was sleeping/suspended
    const intervalId = setInterval(updateToday, 30 * 1000);
    window.addEventListener('focus', updateToday);

    return () => {
      clearTimeout(timerId);
      clearInterval(intervalId);
      window.removeEventListener('focus', updateToday);
    };
  }, []);

  // Daily points earned today by active child
  const childTodayLogs = data.logs.filter(
    (log) => log.childId === selectedChild?.id && log.dateStr === todayStr
  );
  const dailyPointsToday = childTodayLogs.reduce((sum, log) => sum + (log.pointsEarned || 0), 0);

  const pendingRedemptionsCount = data.redemptions.filter((r) => r.status === 'pending').length;

  const currentTheme: AppTheme = selectedChild?.theme || 'classic';
  const isFintech = currentTheme === 'fintech_hustle';

  const handleToggleChildTheme = (childId: string, newTheme: AppTheme) => {
    const updated: FamilyAppData = {
      ...data,
      children: data.children.map((c) => (c.id === childId ? { ...c, theme: newTheme } : c)),
    };
    setData(updated);
    syncServerData(updated);
  };

  const handleToggleActiveTheme = () => {
    if (!selectedChild) return;
    const nextTheme: AppTheme = currentTheme === 'fintech_hustle' ? 'classic' : 'fintech_hustle';
    handleToggleChildTheme(selectedChild.id, nextTheme);
  };

  // Sound toggle
  const handleToggleSound = () => {
    const updated = {
      ...data,
      settings: {
        ...data.settings,
        soundEnabled: !data.settings.soundEnabled,
      },
    };
    setData(updated);
    syncServerData(updated);
  };

  // Parent Mode toggle
  const handleToggleParentMode = () => {
    if (isParentMode) {
      setIsParentMode(false);
    } else {
      // Switch to settings / PIN modal
      setActiveTab('settings');
    }
  };

  // Task Completion (supports optional target child and calendar dateStr)
  const handleCompleteTask = async (taskId: string, targetChildId?: string, dateStr?: string) => {
    const cId = targetChildId || selectedChild?.id;
    if (!cId) return;
    const res = await apiCompleteTask(cId, taskId, undefined, dateStr);
    if (res.data) {
      setData(res.data);
    }
  };

  // Undo Task Completion
  const handleUndoTask = async (logId: string) => {
    const updated = await apiUndoTask(logId);
    if (updated) {
      setData(updated);
    }
  };

  // Add new Chore (Parent)
  const handleAddNewTask = (newTask: Omit<ChoreTask, 'id'>) => {
    const taskObj: ChoreTask = {
      ...newTask,
      id: `task-${Date.now()}`,
    };
    const updated: FamilyAppData = {
      ...data,
      tasks: [taskObj, ...data.tasks],
    };
    setData(updated);
    syncServerData(updated);
  };

  // Update Chore (Parent)
  const handleUpdateTask = (updatedTask: ChoreTask) => {
    const updated: FamilyAppData = {
      ...data,
      tasks: data.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
    };
    setData(updated);
    syncServerData(updated);
  };

  // Delete Chore (Parent)
  const handleDeleteTask = (taskId: string) => {
    const updated: FamilyAppData = {
      ...data,
      tasks: data.tasks.filter((t) => t.id !== taskId),
    };
    setData(updated);
    syncServerData(updated);
  };

  // Redeem Reward
  const handleRedeemReward = async (rewardId: string) => {
    if (!selectedChild) return;
    const targetReward = data.rewards.find((r) => r.id === rewardId);
    if (
      targetReward?.assignedTo &&
      targetReward.assignedTo.length > 0 &&
      !targetReward.assignedTo.includes(selectedChild.id)
    ) {
      alert(`This reward is assigned to another child and cannot be claimed by ${selectedChild.name}.`);
      return;
    }
    const updated = await apiRedeemReward(selectedChild.id, rewardId);
    if (updated) {
      setData(updated);
    }
  };

  // Approve / Reject Redemption (Parent)
  const handleResolveRedemption = async (
    redemptionId: string,
    action: 'approve' | 'reject' | 'fulfill',
    note?: string
  ) => {
    try {
      const res = await fetch('/api/resolve-redemption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemptionId, action, note }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setData(result.data);
          return;
        }
      }
    } catch (e) {
      console.warn('Resolve failed:', e);
    }

    // Local fallback
    const red = data.redemptions.find((r) => r.id === redemptionId);
    if (!red) return;
    const copy = { ...data };
    const targetRed = copy.redemptions.find((r) => r.id === redemptionId)!;

    if (action === 'approve') {
      targetRed.status = 'approved';
      targetRed.resolvedAt = new Date().toISOString();
      targetRed.parentNote = note;
    } else if (action === 'reject') {
      targetRed.status = 'rejected';
      targetRed.parentNote = note;
      const ch = copy.children.find((c) => c.id === targetRed.childId);
      if (ch) ch.currentPoints += targetRed.pointsSpent;
    }
    setData(copy);
    syncServerData(copy);
  };

  // Add custom reward (Parent)
  const handleAddNewReward = (newReward: Omit<CustomReward, 'id'>) => {
    const rewObj: CustomReward = {
      ...newReward,
      id: `rew-${Date.now()}`,
    };
    const updated: FamilyAppData = {
      ...data,
      rewards: [rewObj, ...data.rewards],
    };
    setData(updated);
    syncServerData(updated);
  };

  // Delete reward (Parent)
  const handleDeleteReward = (rewardId: string) => {
    const updated: FamilyAppData = {
      ...data,
      rewards: data.rewards.filter((r) => r.id !== rewardId),
    };
    setData(updated);
    syncServerData(updated);
  };

  // Update reward (Parent)
  const handleUpdateReward = (updatedReward: CustomReward) => {
    const updated: FamilyAppData = {
      ...data,
      rewards: data.rewards.map((r) => (r.id === updatedReward.id ? updatedReward : r)),
    };
    setData(updated);
    syncServerData(updated);
  };

  // Adjust points / manual bonus (Parent)
  const handleAdjustPoints = async (childId: string, amount: number, reason: string) => {
    try {
      const res = await fetch('/api/adjust-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, amount, reason }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setData(result.data);
          return;
        }
      }
    } catch (e) {
      console.warn('Adjust failed:', e);
    }

    const copy = { ...data };
    const targetChild = copy.children.find((c) => c.id === childId);
    if (!targetChild) return;

    targetChild.currentPoints = Math.max(0, targetChild.currentPoints + amount);
    if (amount > 0) {
      targetChild.totalPoints += amount;
      targetChild.level = Math.max(1, Math.floor(targetChild.totalPoints / 250) + 1);
    }
    copy.logs.unshift({
      id: `log-adj-${Date.now()}`,
      childId: targetChild.id,
      taskId: 'adjustment',
      taskTitle: amount >= 0 ? `Bonus: ${reason}` : `Deduction: ${reason}`,
      pointsEarned: amount,
      completedAt: new Date().toISOString(),
      dateStr: todayStr,
      note: reason,
      verifiedByParent: true,
    });
    setData(copy);
    syncServerData(copy);
  };

  // Record monthly allowance payout
  const handleRecordAllowancePayout = async (
    childId: string,
    monthYear: string,
    amountPaid: number,
    completionRatePercent: number,
    notes?: string
  ) => {
    const updated = await apiRecordAllowancePayout(childId, monthYear, amountPaid, completionRatePercent, notes);
    if (updated) {
      setData(updated);
    }
  };

  // Update monthly target allowance for child
  const handleUpdateChildAllowanceTarget = (childId: string, targetAllowance: number) => {
    const copy = {
      ...data,
      children: data.children.map((c) =>
        c.id === childId ? { ...c, monthlyAllowanceTarget: targetAllowance } : c
      ),
    };
    setData(copy);
    syncServerData(copy);
  };

  // Add new child profile
  const handleAddChild = (name: string, avatar: string, goal: number, childTheme?: AppTheme) => {
    const newChild: Child = {
      id: `child-${Date.now()}`,
      name,
      avatar,
      color: childTheme === 'fintech_hustle' ? '#10b981' : '#6366f1',
      totalPoints: 0,
      currentPoints: 0,
      dailyGoal: goal,
      streakDays: 0,
      badge: 'Junior Helper',
      level: 1,
      theme: childTheme || 'classic',
    };
    const updated: FamilyAppData = {
      ...data,
      children: [...data.children, newChild],
    };
    setData(updated);
    setSelectedChildId(newChild.id);
    syncServerData(updated);
  };

  // Remove child profile (Parent)
  const handleDeleteChild = (childId: string) => {
    if (data.children.length <= 1) {
      alert('You must have at least one child profile in the family.');
      return;
    }
    const target = data.children.find((c) => c.id === childId);
    const remainingChildren = data.children.filter((c) => c.id !== childId);
    const updated: FamilyAppData = {
      ...data,
      children: remainingChildren,
      // Clean up logs and redemptions for this child
      logs: data.logs.filter((l) => l.childId !== childId),
      redemptions: data.redemptions.filter((r) => r.childId !== childId),
    };
    setData(updated);
    if (selectedChildId === childId) {
      setSelectedChildId(remainingChildren[0].id);
    }
    syncServerData(updated);
  };

  // Update child daily target goal (Parent)
  const handleUpdateChildGoal = (childId: string, newGoal: number) => {
    const updated: FamilyAppData = {
      ...data,
      children: data.children.map((c) => (c.id === childId ? { ...c, dailyGoal: newGoal } : c)),
    };
    setData(updated);
    syncServerData(updated);
  };

  // Update child avatar
  const handleUpdateChildAvatar = (childId: string, newAvatar: string) => {
    const updated: FamilyAppData = {
      ...data,
      children: data.children.map((c) => (c.id === childId ? { ...c, avatar: newAvatar } : c)),
    };
    setData(updated);
    syncServerData(updated);
  };

  // Update child full profile (e.g. SMS preferences, carrier, phone number)
  const handleUpdateChild = (updatedChild: Child) => {
    const updated: FamilyAppData = {
      ...data,
      children: data.children.map((c) => (c.id === updatedChild.id ? updatedChild : c)),
    };
    setData(updated);
    syncServerData(updated);
  };

  // Update Settings
  const handleUpdateSettings = (settings: AppSettings) => {
    const updated: FamilyAppData = {
      ...data,
      settings,
    };
    setData(updated);
    syncServerData(updated);
  };

  // Restore Data
  const handleRestoreData = (restored: FamilyAppData) => {
    setData(restored);
    syncServerData(restored);
  };

  // Reset demo
  const handleResetToDefaults = () => {
    setData(defaultFamilyData);
    setSelectedChildId(defaultFamilyData.children[0].id);
    syncServerData(defaultFamilyData);
  };

  const currencySymbol = data.settings.currencySymbol || '⭐';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isFintech ? 'bg-[#070b14] text-slate-100' : 'bg-slate-100/70 text-slate-900'
      }`}
    >
      {/* iOS Status & Header Bar */}
      <IOSHeader
        selectedChild={selectedChild}
        dailyPointsToday={dailyPointsToday}
        currencySymbol={currencySymbol}
        isParentMode={isParentMode}
        onToggleParentMode={handleToggleParentMode}
        soundEnabled={data.settings.soundEnabled}
        onToggleSound={handleToggleSound}
        isServerOnline={isServerOnline}
        onOpenIOSGuide={() => setIsIOSGuideOpen(true)}
        onOpenChildSelect={() => setIsChildModalOpen(true)}
        theme={currentTheme}
        onToggleTheme={handleToggleActiveTheme}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3.5 pt-3.5 pb-safe-tab ios-scroll">
        {/* Daily & Total Points Highlight Summary Card (Shown on chores & leaderboard) */}
        {selectedChild && activeTab === 'tasks' && (
          <DailyStatsCard
            child={selectedChild}
            dailyPointsToday={dailyPointsToday}
            currencySymbol={currencySymbol}
            tasksCompletedTodayCount={childTodayLogs.length}
            totalDailyTasksCount={data.tasks.filter((t) => t.frequency === 'daily').length}
            monthlyAllowancePercent={calculateChildMonthlyAllowance(selectedChild, data.tasks, data.logs).completionRatePercent}
            monthlyAllowanceAccrued={calculateChildMonthlyAllowance(selectedChild, data.tasks, data.logs).accruedAmount}
            onOpenAllowance={() => setActiveTab('allowance')}
            isFintech={isFintech}
          />
        )}

        {/* Tab Views with Motion animation */}
        <AnimatePresence mode="wait">
          {activeTab === 'tasks' && selectedChild && (
            <motion.div
              key="tab-tasks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <TaskListView
                child={selectedChild}
                childrenList={data.children}
                tasks={data.tasks}
                todayLogs={data.logs.filter((l) => l.dateStr === todayStr)}
                currencySymbol={currencySymbol}
                soundEnabled={data.settings.soundEnabled}
                isParentMode={isParentMode}
                onCompleteTask={handleCompleteTask}
                onUndoTask={handleUndoTask}
                onAddNewTask={handleAddNewTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                theme={currentTheme}
              />
            </motion.div>
          )}

          {activeTab === 'allowance' && selectedChild && (
            <motion.div
              key="tab-allowance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <AllowanceDashboardView
                child={selectedChild}
                childrenList={data.children}
                tasks={data.tasks}
                logs={data.logs}
                payouts={data.allowancePayouts || []}
                isParentMode={isParentMode}
                currencySymbol={currencySymbol}
                onRecordPayout={handleRecordAllowancePayout}
                onUpdateChildAllowanceTarget={handleUpdateChildAllowanceTarget}
                onSwitchChild={(childId) => setSelectedChildId(childId)}
                theme={currentTheme}
              />
            </motion.div>
          )}

          {activeTab === 'rewards' && selectedChild && (
            <motion.div
              key="tab-rewards"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <RewardsView
                child={selectedChild}
                childrenList={data.children}
                rewards={data.rewards}
                redemptions={data.redemptions}
                currencySymbol={currencySymbol}
                soundEnabled={data.settings.soundEnabled}
                isParentMode={isParentMode}
                onRedeemReward={handleRedeemReward}
                onResolveRedemption={handleResolveRedemption}
                onAddNewReward={handleAddNewReward}
                onUpdateReward={handleUpdateReward}
                onDeleteReward={handleDeleteReward}
                theme={currentTheme}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="tab-history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <ActivityHistoryView
                logs={data.logs}
                tasks={data.tasks}
                childrenList={data.children}
                selectedChildId={selectedChildId}
                currencySymbol={currencySymbol}
                soundEnabled={data.settings.soundEnabled}
                isParentMode={isParentMode}
                onUndoLog={handleUndoTask}
                onCompleteTask={handleCompleteTask}
                onAdjustPoints={handleAdjustPoints}
                theme={currentTheme}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="tab-settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SettingsAndUnraidModal
                data={data}
                isParentMode={isParentMode}
                isServerOnline={isServerOnline}
                onUpdateSettings={handleUpdateSettings}
                onRestoreData={handleRestoreData}
                onResetToDefaults={handleResetToDefaults}
                onLockParentMode={() => setIsParentMode(false)}
                onUnlockParentMode={() => setIsParentMode(true)}
                onDeleteChild={handleDeleteChild}
                onUpdateChildGoal={handleUpdateChildGoal}
                onUpdateChildAllowanceTarget={handleUpdateChildAllowanceTarget}
                onToggleChildTheme={handleToggleChildTheme}
                onUpdateChild={handleUpdateChild}
                theme={currentTheme}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* iOS Bottom Navigation Bar */}
      <IOSTabBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        pendingRedemptionsCount={pendingRedemptionsCount}
        isParentMode={isParentMode}
        theme={currentTheme}
      />

      {/* Child Switcher Modal */}
      <ChildSwitcherModal
        isOpen={isChildModalOpen}
        onClose={() => setIsChildModalOpen(false)}
        childrenList={data.children}
        selectedChildId={selectedChildId}
        onSelectChild={(id) => setSelectedChildId(id)}
        isParentMode={isParentMode}
        onAddChild={handleAddChild}
        onDeleteChild={handleDeleteChild}
        onToggleChildTheme={handleToggleChildTheme}
        onUpdateChildAvatar={handleUpdateChildAvatar}
        onUpdateChild={handleUpdateChild}
        theme={currentTheme}
      />

      {/* iOS Safari Home Screen Guide */}
      <IOSInstallGuideModal
        isOpen={isIOSGuideOpen}
        onClose={() => setIsIOSGuideOpen(false)}
      />
    </div>
  );
}
