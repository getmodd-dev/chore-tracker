import React, { useState } from 'react';
import { Child, AppTheme } from '../types';
import { X, Plus, Trophy, Flame, Star, Check, Trash2, AlertCircle, Zap, Palette, Sparkles, Smile, Bell } from 'lucide-react';
import { POPULAR_AVATARS } from '../utils/avatars';
import { AvatarPickerModal } from './AvatarPickerModal';
import { ChildNotificationConfigModal } from './ChildNotificationConfigModal';

interface ChildSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  childrenList: Child[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  isParentMode: boolean;
  onAddChild: (name: string, avatar: string, goal: number, theme?: AppTheme) => void;
  onDeleteChild?: (childId: string) => void;
  onToggleChildTheme?: (childId: string) => void;
  onUpdateChildAvatar?: (childId: string, avatar: string) => void;
  onUpdateChild?: (child: Child) => void;
  theme?: AppTheme;
}

export const ChildSwitcherModal: React.FC<ChildSwitcherModalProps> = ({
  isOpen,
  onClose,
  childrenList,
  selectedChildId,
  onSelectChild,
  isParentMode,
  onAddChild,
  onDeleteChild,
  onToggleChildTheme,
  onUpdateChildAvatar,
  onUpdateChild,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';
  const [showAddForm, setShowAddForm] = useState(false);
  const [childToDelete, setChildToDelete] = useState<Child | null>(null);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('👦');
  const [newGoal, setNewGoal] = useState(50);
  const [newChildTheme, setNewChildTheme] = useState<AppTheme>('classic');
  const [avatarPickerChild, setAvatarPickerChild] = useState<Child | null>(null);
  const [isNewChildAvatarPickerOpen, setIsNewChildAvatarPickerOpen] = useState(false);
  const [notificationEditingChild, setNotificationEditingChild] = useState<Child | null>(null);

  if (!isOpen) return null;

  const handleCreateChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddChild(newName.trim(), newAvatar, Number(newGoal) >= 0 ? Number(newGoal) : 50, newChildTheme);
    setNewName('');
    setShowAddForm(false);
  };

  const handleConfirmDelete = () => {
    if (!childToDelete || !onDeleteChild) return;
    onDeleteChild(childToDelete.id);
    setChildToDelete(null);
  };

  return (
    <div
      id="modal-child-switcher"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 border max-h-[85vh] overflow-y-auto ios-scroll pb-safe transition ${
          isFintech ? 'bg-[#0c1424] border-[#1d2d4c] text-white' : 'bg-white border-slate-200/90 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Pull indicator handle */}
        <div className={`w-12 h-1.5 rounded-full mx-auto mb-4 sm:hidden ${isFintech ? 'bg-slate-700' : 'bg-slate-300'}`} />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-bold ${isFintech ? 'text-white' : 'text-slate-900'}`}>Family Members</h3>
            <p className={`text-xs ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>Switch profile to view chores & claim rewards</p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition ${isFintech ? 'text-slate-400 hover:text-white bg-[#15223c]' : 'text-slate-400 hover:text-slate-700 bg-slate-100'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Children */}
        <div className="space-y-2.5 mb-4">
          {childrenList.map((child) => {
            const isSelected = child.id === selectedChildId;
            const childIsFintech = child.theme === 'fintech_hustle';

            return (
              <div
                key={child.id}
                onClick={() => {
                  onSelectChild(child.id);
                  onClose();
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? isFintech
                      ? 'bg-[#121f38] border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40'
                      : 'bg-indigo-50/80 border-indigo-400 shadow-sm ring-1 ring-indigo-400/40'
                    : isFintech
                    ? 'bg-[#0f192d] hover:bg-[#15233e] border-[#1c2d4c]'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUpdateChildAvatar) {
                        setAvatarPickerChild(child);
                      }
                    }}
                    className={`w-12 h-12 rounded-2xl shadow-xs border flex items-center justify-center text-2xl shrink-0 transition active:scale-95 group relative ${
                      childIsFintech
                        ? 'bg-[#15233d] border-emerald-500/40 hover:border-emerald-400'
                        : 'bg-white border-slate-200 hover:border-indigo-400'
                    }`}
                    title="Click to customize avatar"
                  >
                    {child.avatar}
                    <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs opacity-80 group-hover:opacity-100">
                      ✏️
                    </span>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold text-sm ${isFintech ? 'text-white' : 'text-slate-900'}`}>{child.name}</h4>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          childIsFintech
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Lvl {child.level}
                      </span>
                      {isSelected && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isFintech ? 'bg-emerald-500 text-slate-950' : 'bg-indigo-600 text-white'
                          }`}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        {child.streakDays}d streak
                      </span>
                      <span className={`flex items-center gap-1 font-semibold ${isFintech ? 'text-emerald-400' : 'text-indigo-700'}`}>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        {child.currentPoints} pts
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold border ${
                          childIsFintech
                            ? 'bg-[#091322] text-emerald-300 border-emerald-500/40'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {childIsFintech ? '⚡ Fintech' : '🎨 Classic'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onUpdateChild && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotificationEditingChild(child);
                      }}
                      className={`p-1.5 rounded-xl border text-[11px] font-bold transition active:scale-95 flex items-center gap-1 ${
                        (child.notificationsEnabled ?? child.smsEnabled) && child.pushoverUserKey
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : childIsFintech
                          ? 'bg-[#15233e] text-slate-300 border-slate-700 hover:bg-[#1a2d52]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Configure Daily iPhone Chore Push Notifications for this child"
                    >
                      <Bell className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="hidden sm:inline">
                        {(child.notificationsEnabled ?? child.smsEnabled) && child.pushoverUserKey ? 'Alerts On' : 'Alerts'}
                      </span>
                    </button>
                  )}

                  {onToggleChildTheme && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleChildTheme(child.id);
                      }}
                      className={`p-1.5 rounded-xl border text-[11px] font-bold transition active:scale-95 ${
                        childIsFintech
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Switch child theme"
                    >
                      {childIsFintech ? '⚡ Dark' : '🎨 Light'}
                    </button>
                  )}

                  {isSelected && (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isFintech ? 'bg-emerald-500 text-slate-950' : 'bg-indigo-600 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {isParentMode && childrenList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChildToDelete(child);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition active:scale-95"
                      title={`Remove ${child.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {childToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 text-2xl">
                {childToDelete.avatar}
              </div>
              <h4 className="font-bold text-base text-slate-900">Remove {childToDelete.name}?</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                Are you sure you want to remove this child profile? Their {childToDelete.currentPoints} points and history will be cleared.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChildToDelete(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Child Button / Form */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className={`w-full py-2.5 px-4 rounded-xl border-2 border-dashed font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
              isFintech
                ? 'border-[#233558] text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50'
                : 'border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Another Child Profile
          </button>
        ) : (
          <form
            onSubmit={handleCreateChild}
            className={`p-3.5 rounded-2xl border space-y-3 ${
              isFintech ? 'bg-[#0e172a] border-[#1d2d4c]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isFintech ? 'text-emerald-400' : 'text-slate-800'}`}>
              New Child Profile
            </h4>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isFintech ? 'text-slate-300' : 'text-slate-600'}`}>
                Child's Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Oliver"
                className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isFintech
                    ? 'bg-[#15223c] border border-[#23365d] text-white focus:ring-emerald-500'
                    : 'bg-white border border-slate-300 focus:ring-indigo-500'
                }`}
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-xs font-medium ${isFintech ? 'text-slate-300' : 'text-slate-600'}`}>
                  Select Avatar
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewChildAvatarPickerOpen(true)}
                  className={`text-[11px] font-bold flex items-center gap-1 transition px-2 py-0.5 rounded-lg ${
                    isFintech ? 'text-emerald-400 hover:bg-emerald-950/60' : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Browse All 130+ Avatars</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {POPULAR_AVATARS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setNewAvatar(emoji)}
                    className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center border transition active:scale-95 ${
                      newAvatar === emoji
                        ? isFintech
                          ? 'bg-emerald-950 border-emerald-500 scale-110 shadow-xs'
                          : 'bg-indigo-100 border-indigo-500 scale-110 shadow-xs'
                        : isFintech
                        ? 'bg-[#15223c] border-[#22355b] hover:bg-[#1a2b4b]'
                        : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${isFintech ? 'text-slate-300' : 'text-slate-600'}`}>
                Visual Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewChildTheme('classic')}
                  className={`p-2 rounded-xl border text-left transition ${
                    newChildTheme === 'classic'
                      ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-400 text-indigo-900 font-bold'
                      : isFintech
                      ? 'bg-[#15223c] border-[#22355b] text-slate-300'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">🎨 Classic</div>
                  <div className="text-[10px] text-slate-400">Colorful, warm</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewChildTheme('fintech_hustle')}
                  className={`p-2 rounded-xl border text-left transition ${
                    newChildTheme === 'fintech_hustle'
                      ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-400 text-emerald-300 font-bold'
                      : isFintech
                      ? 'bg-[#15223c] border-[#22355b] text-slate-300'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">⚡ Fintech</div>
                  <div className="text-[10px] text-slate-400">Dark obsidian</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`block text-xs font-medium ${isFintech ? 'text-slate-300' : 'text-slate-600'}`}>
                  Daily Points Target
                </label>
                <span className={`text-xs font-bold ${isFintech ? 'text-emerald-400' : 'text-indigo-600'}`}>
                  {newGoal} pts
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={newGoal}
                onChange={(e) => setNewGoal(Number(e.target.value))}
                className={`w-full ${isFintech ? 'accent-emerald-400' : 'accent-indigo-600'}`}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>0 pts (Min)</span>
                <span>50 pts</span>
                <span>100 pts</span>
                <span>200 pts</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl ${
                  isFintech ? 'bg-[#182743] text-slate-300 hover:bg-[#203254]' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-2 text-xs font-bold rounded-xl shadow-sm ${
                  isFintech
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Save Child
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Avatar Picker for Existing Child */}
      {avatarPickerChild && (
        <AvatarPickerModal
          isOpen={Boolean(avatarPickerChild)}
          onClose={() => setAvatarPickerChild(null)}
          currentAvatar={avatarPickerChild.avatar}
          onSelectAvatar={(picked) => {
            if (onUpdateChildAvatar) {
              onUpdateChildAvatar(avatarPickerChild.id, picked);
            }
            setAvatarPickerChild(null);
          }}
          title={`Choose Avatar for ${avatarPickerChild.name}`}
          theme={theme}
        />
      )}

      {/* Avatar Picker for New Child Form */}
      {isNewChildAvatarPickerOpen && (
        <AvatarPickerModal
          isOpen={isNewChildAvatarPickerOpen}
          onClose={() => setIsNewChildAvatarPickerOpen(false)}
          currentAvatar={newAvatar}
          onSelectAvatar={(picked) => {
            setNewAvatar(picked);
            setIsNewChildAvatarPickerOpen(false);
          }}
          title="Choose Avatar for New Child"
          theme={theme}
        />
      )}

      {/* iPhone Push Notification Configuration Modal */}
      {notificationEditingChild && (
        <ChildNotificationConfigModal
          isOpen={Boolean(notificationEditingChild)}
          onClose={() => setNotificationEditingChild(null)}
          child={notificationEditingChild}
          theme={theme}
          onSave={(updatedChild) => {
            if (onUpdateChild) {
              onUpdateChild(updatedChild);
            }
            setNotificationEditingChild(null);
          }}
        />
      )}
    </div>
  );
};
