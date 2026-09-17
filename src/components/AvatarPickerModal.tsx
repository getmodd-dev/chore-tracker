import React, { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { AVATAR_CATEGORIES, ALL_AVATARS } from '../utils/avatars';
import { AppTheme } from '../types';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  onSelectAvatar: (avatar: string) => void;
  title?: string;
  theme?: AppTheme;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onSelectAvatar,
  title = 'Choose an Avatar',
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [customEmojiInput, setCustomEmojiInput] = useState<string>('');

  if (!isOpen) return null;

  const currentCategory = AVATAR_CATEGORIES.find((c) => c.id === selectedCatId);
  const avatarsToShow = selectedCatId === 'all'
    ? ALL_AVATARS
    : (currentCategory?.avatars || ALL_AVATARS);

  const handlePick = (avatar: string) => {
    onSelectAvatar(avatar);
    onClose();
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customEmojiInput.trim();
    if (trimmed) {
      // Pick first character/cluster
      onSelectAvatar(trimmed);
      onClose();
    }
  };

  return (
    <div
      id="avatar-picker-backdrop"
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="avatar-picker-modal"
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 border max-h-[85vh] flex flex-col transition ${
          isFintech
            ? 'bg-[#0c1424] border-[#1d2d4c] text-white'
            : 'bg-white border-slate-200/90 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Pull Handle */}
        <div className={`w-12 h-1.5 rounded-full mx-auto mb-3 sm:hidden ${isFintech ? 'bg-slate-700' : 'bg-slate-300'}`} />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1c2c48]">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-2xl border ${
              isFintech ? 'bg-[#14233f] border-emerald-500/40 text-emerald-300' : 'bg-indigo-50 border-indigo-100'
            }`}>
              {currentAvatar || '⭐'}
            </div>
            <div>
              <h3 className={`text-base font-bold ${isFintech ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h3>
              <p className={`text-xs ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                Pick from {ALL_AVATARS.length}+ emojis or type your own
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition ${
              isFintech ? 'text-slate-400 hover:text-white bg-[#15223c]' : 'text-slate-400 hover:text-slate-700 bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 py-3 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setSelectedCatId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
              selectedCatId === 'all'
                ? isFintech
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-indigo-600 text-white shadow-xs'
                : isFintech
                ? 'bg-[#101b30] text-slate-300 hover:bg-[#162542]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>✨</span>
            <span>All ({ALL_AVATARS.length})</span>
          </button>

          {AVATAR_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                selectedCatId === cat.id
                  ? isFintech
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-indigo-600 text-white shadow-xs'
                  : isFintech
                  ? 'bg-[#101b30] text-slate-300 hover:bg-[#162542]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Avatar Grid Container */}
        <div className="flex-1 overflow-y-auto pr-1 ios-scroll min-h-[220px]">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 py-1">
            {avatarsToShow.map((avatar, idx) => {
              const isSelected = avatar === currentAvatar;
              return (
                <button
                  key={`${avatar}-${idx}`}
                  type="button"
                  onClick={() => handlePick(avatar)}
                  className={`h-12 w-full rounded-2xl text-2xl flex items-center justify-center transition active:scale-90 relative ${
                    isSelected
                      ? isFintech
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-indigo-100 border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                      : isFintech
                      ? 'bg-[#101b30] hover:bg-[#182744] border border-[#1b2b48]'
                      : 'bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200'
                  }`}
                  title={avatar}
                >
                  <span>{avatar}</span>
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Emoji Input Option */}
        <form
          onSubmit={handleCustomApply}
          className={`pt-3 mt-2 border-t flex items-center gap-2 shrink-0 ${
            isFintech ? 'border-[#1c2c48]' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Custom Emoji:</span>
            <input
              type="text"
              placeholder="e.g. 🦸‍♂️, 🚀, 🥋"
              maxLength={4}
              value={customEmojiInput}
              onChange={(e) => setCustomEmojiInput(e.target.value)}
              className={`w-full px-3 py-1.5 text-center text-sm rounded-xl border focus:outline-none transition ${
                isFintech
                  ? 'bg-[#101a2e] border-[#1d2d4c] text-white focus:border-emerald-400'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={!customEmojiInput.trim()}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-40 cursor-pointer ${
              isFintech
                ? 'bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Apply Custom
          </button>
        </form>
      </div>
    </div>
  );
};
