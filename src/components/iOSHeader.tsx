import React from 'react';
import { Volume2, VolumeX, Star, Zap, Sun } from 'lucide-react';
import { Child, AppTheme } from '../types';

interface IOSHeaderProps {
  selectedChild: Child | null;
  dailyPointsToday: number;
  currencySymbol: string;
  isParentMode?: boolean;
  onToggleParentMode?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isServerOnline?: boolean;
  onOpenIOSGuide?: () => void;
  onOpenChildSelect: () => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

export const IOSHeader: React.FC<IOSHeaderProps> = ({
  selectedChild,
  dailyPointsToday,
  currencySymbol,
  soundEnabled,
  onToggleSound,
  onOpenChildSelect,
  theme = 'classic',
  onToggleTheme,
}) => {
  const isFintech = theme === 'fintech_hustle';

  return (
    <header
      id="ios-main-header"
      className={`sticky top-0 z-30 pt-safe px-3 sm:px-4 pb-2.5 transition-all backdrop-blur-xl border-b w-full max-w-full overflow-hidden ${
        isFintech
          ? 'bg-[#0c121e]/95 border-[#1c2942] text-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
          : 'bg-white/90 border-slate-200/80 text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
      }`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Child profile selector */}
        <button
          id="btn-child-switcher"
          onClick={onOpenChildSelect}
          className={`flex items-center gap-1.5 sm:gap-2.5 active:scale-95 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full transition-all border min-w-0 shrink max-w-[130px] sm:max-w-[170px] ${
            isFintech
              ? 'bg-[#141e33] hover:bg-[#1a2742] border-[#223354] text-white shadow-xs'
              : 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200/70 text-slate-800'
          }`}
          title="Switch Child Profile"
        >
          <span className="text-lg sm:text-xl leading-none select-none shrink-0">
            {selectedChild?.avatar || '🧒'}
          </span>
          <div className="text-left min-w-0 overflow-hidden">
            <div className="flex items-center gap-1 min-w-0">
              <span className={`text-xs font-bold tracking-tight truncate ${isFintech ? 'text-white' : 'text-slate-800'}`}>
                {selectedChild?.name || 'Select'}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-semibold px-1 py-0.2 rounded shrink-0 ${
                  isFintech ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                Lvl {selectedChild?.level || 1}
              </span>
            </div>
            <p className={`text-[9px] sm:text-[10px] font-medium leading-none truncate ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedChild?.badge || 'Helper'}
            </p>
          </div>
        </button>

        {/* Right: Points display and quick toggles (Cleaned up: Removed home screen and kid/parent buttons) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Theme Switcher Toggle */}
          {onToggleTheme && (
            <button
              id="btn-toggle-theme"
              onClick={onToggleTheme}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition active:scale-95 border ${
                isFintech
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
              }`}
              title={isFintech ? 'Active: Fintech Hustle (Tap for Classic)' : 'Switch to Fintech Theme'}
            >
              {isFintech ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span className="hidden xs:inline sm:inline text-[11px]">Hustle</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden xs:inline sm:inline text-[11px]">Theme</span>
                </>
              )}
            </button>
          )}

          {/* Daily Points badge */}
          <div
            id="header-daily-points"
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${
              isFintech
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 font-mono'
                : 'bg-amber-50 border-amber-200/80 text-amber-900'
            }`}
            title="Points earned today"
          >
            <span
              className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                isFintech ? 'text-emerald-400' : 'text-amber-600'
              }`}
            >
              Today:
            </span>
            <span className={`font-bold text-xs ${isFintech ? 'text-emerald-300' : 'text-amber-700'}`}>
              +{dailyPointsToday}
            </span>
          </div>

          {/* Spendable Points badge */}
          <div
            id="header-spendable-points"
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border shadow-xs ${
              isFintech
                ? 'bg-[#141e33] border-slate-700 text-white font-mono'
                : 'bg-indigo-50 border-indigo-200/80 text-indigo-900'
            }`}
            title="Available spendable points bank"
          >
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-500 shrink-0" />
            <span className="text-xs">{selectedChild?.currentPoints ?? 0}</span>
            <span className={`text-[9px] sm:text-[10px] font-medium hidden xs:inline ${isFintech ? 'text-slate-400' : 'text-indigo-600'}`}>
              Bank
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={onToggleSound}
            className={`p-1.5 sm:p-2 rounded-full active:scale-95 transition ${
              isFintech
                ? 'text-slate-400 hover:text-white hover:bg-[#1a2742]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title={soundEnabled ? 'Mute Sounds' : 'Enable Chime Sounds'}
          >
            {soundEnabled ? (
              <Volume2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFintech ? 'text-emerald-400' : 'text-indigo-600'}`} />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
