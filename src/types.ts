export type ChoreCategory =
  | 'daily_routine'
  | 'bedroom_home'
  | 'school_study'
  | 'kindness_habits'
  | 'pet_care'
  | 'yard_outdoor'
  | 'bonus';

export type AppTheme = 'classic' | 'fintech_hustle';

export interface Child {
  id: string;
  name: string;
  avatar: string;
  color: string;
  totalPoints: number;    // Cumulative all-time points earned
  currentPoints: number;  // Spendable points balance
  dailyGoal: number;      // e.g. 80 points
  streakDays: number;     // Consecutive days completed
  lastActiveDate?: string; // YYYY-MM-DD
  badge: string;
  level: number;
  monthlyAllowanceTarget?: number; // Base cash allowance for 100% completion (e.g. 30 for $30)
  theme?: AppTheme;
  // Notification Preferences (Pushover iOS Push Alerts & legacy SMS)
  pushoverUserKey?: string;           // Child's Pushover User Key (e.g. 30 chars)
  pushoverDeviceName?: string;        // Optional specific device name on child's account
  notificationsEnabled?: boolean;     // Enable daily chore status push alerts
  notificationTime?: string;          // 24-hour "HH:MM", e.g. "16:30" (4:30 PM)
  lastNotificationSentDate?: string;  // YYYY-MM-DD to avoid duplicate sends
  // Legacy fields kept for backward compatibility:
  phoneNumber?: string;
  carrier?: 'att' | 'verizon' | 'tmobile';
  smsEnabled?: boolean;
  smsTime?: string;
  lastSmsSentDate?: string;
}

export type ChoreType = 'allowance' | 'bonus_points' | 'both';

export interface ChoreTask {
  id: string;
  title: string;
  description?: string;
  category: ChoreCategory;
  points: number;
  icon: string;
  frequency: 'daily' | 'weekly' | 'anytime';
  daysOfWeek?: number[]; // [0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat]
  intervalWeeks?: number; // 1 = every week, 2 = every other week (bi-weekly)
  scheduleStartDate?: string; // YYYY-MM-DD anchor date for bi-weekly week parity
  assignedTo?: string[]; // Child IDs, empty array = all
  isBonus?: boolean;
  choreType?: ChoreType; // 'allowance' (core duty for monthly allowance), 'bonus_points' (prize points), or 'both'
}

export interface TaskCompletionLog {
  id: string;
  childId: string;
  taskId: string;
  taskTitle: string;
  pointsEarned: number;
  completedAt: string; // ISO string
  dateStr: string;     // YYYY-MM-DD
  note?: string;
  verifiedByParent?: boolean;
}

export interface CustomReward {
  id: string;
  title: string;
  description?: string;
  pointsCost: number;
  icon: string;
  category?: string;
  cooldownDays?: number;
  assignedTo?: string[]; // Child IDs, empty or undefined = all children
}

export interface RewardRedemption {
  id: string;
  childId: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  requestedAt: string;
  resolvedAt?: string;
  parentNote?: string;
}

export interface AllowancePayoutRecord {
  id: string;
  childId: string;
  childName: string;
  monthYear: string; // e.g. "2026-09"
  targetAllowance: number; // e.g. $30.00
  completionRatePercent: number; // e.g. 85
  amountPaid: number; // e.g. $25.50
  paidAt: string; // ISO string
  notes?: string;
}

export interface AppSettings {
  parentPin: string;
  currencyName: string;
  currencySymbol: string;
  soundEnabled: boolean;
  requireApprovalForTasks: boolean;
  unraidHostName: string;
  allowanceCurrencySymbol?: string; // default '$'
  defaultTheme?: AppTheme;
  pushoverAppToken?: string;        // Pushover Application API Token (e.g. 30 chars from pushover.net/apps/build)
}

export interface FamilyAppData {
  children: Child[];
  tasks: ChoreTask[];
  logs: TaskCompletionLog[];
  rewards: CustomReward[];
  redemptions: RewardRedemption[];
  allowancePayouts?: AllowancePayoutRecord[];
  settings: AppSettings;
}

export type ActiveTab = 'tasks' | 'allowance' | 'rewards' | 'history' | 'settings';
