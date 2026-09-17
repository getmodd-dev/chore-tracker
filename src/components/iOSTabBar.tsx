import React from 'react';
import { CheckCircle2, Gift, Clock, ShieldCheck, DollarSign, Zap } from 'lucide-react';
import { ActiveTab, AppTheme } from '../types';

interface IOSTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingRedemptionsCount: number;
  isParentMode: boolean;
  theme?: AppTheme;
}

export const IOSTabBar: React.FC<IOSTabBarProps> = ({
  activeTab,
  onTabChange,
  pendingRedemptionsCount,
  isParentMode,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'tasks',
      label: isFintech ? 'Quests' : 'Chores',
      icon: isFintech ? <Zap className="w-5 h-5 sm:w-6 sm:h-6" /> : <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'allowance',
      label: isFintech ? 'Banking' : 'Allowance',
      icon: <DollarSign className={`w-5 h-5 sm:w-6 sm:h-6 ${isFintech ? 'text-emerald-400' : 'text-emerald-600'}`} />,
    },
    {
      id: 'rewards',
      label: isFintech ? 'Store' : 'Rewards',
      icon: <Gift className="w-5 h-5 sm:w-6 sm:h-6" />,
      badge: pendingRedemptionsCount > 0 ? pendingRedemptionsCount : undefined,
    },
    {
      id: 'history',
      label: isFintech ? 'Ledger' : 'History',
      icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'settings',
      label: isParentMode ? (isFintech ? 'Parent Access' : 'Parent') : 'Settings',
      icon: (
        <ShieldCheck
          className={`w-5 h-5 sm:w-6 sm:h-6 ${
            isParentMode ? (isFintech ? 'text-emerald-400' : 'text-indigo-600') : ''
          }`}
        />
      ),
    },
  ];

  return (
    <nav
      id="ios-bottom-tab-bar"
      aria-label="Main Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl pb-safe transition-all ${
        isFintech
          ? 'bg-[#0a101f]/95 border-t border-[#1c2944] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] text-slate-300'
          : 'bg-white/90 border-t border-slate-200/80 shadow-sm text-slate-500'
      }`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[64px] min-h-[44px] transition-transform active:scale-95 select-none ${
                isActive
                  ? isFintech
                    ? 'text-emerald-400 font-bold'
                    : 'text-indigo-600 font-semibold'
                  : isFintech
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span
                    id="tab-badge-count"
                    className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-slate-900"
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <div
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    isFintech ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-indigo-600'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
