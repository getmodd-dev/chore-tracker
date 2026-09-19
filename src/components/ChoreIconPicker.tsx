import React, { useState } from 'react';
import { ChoreIcon } from './ChoreIcon';
import { Sparkles, Smile, Shapes, Check } from 'lucide-react';

interface ChoreIconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

const EMOJI_PRESETS: { category: string; emojis: string[] }[] = [
  {
    category: 'Daily Routine',
    emojis: ['🛏️', '🪥', '👕', '👟', '🎒', '⏰', '🛁', '🫧', '🧼', '💤'],
  },
  {
    category: 'Cleaning & Chores',
    emojis: ['🧹', '🧺', '🧽', '🗑️', '🪣', '✨', '🧴', '🪟', '🧻', '📦'],
  },
  {
    category: 'Kitchen & Meals',
    emojis: ['🍽️', '🥣', '🍳', '🍎', '🥪', '🥛', '🥤', '🍕', '🍪', '🧊'],
  },
  {
    category: 'Pets & Animals',
    emojis: ['🐕', '🐱', '🐾', '🦴', '🐠', '🦜', '🐹', '🐰', '🐴', '🐢'],
  },
  {
    category: 'School & Learning',
    emojis: ['📚', '📖', '💻', '✏️', '🎨', '🎹', '🎸', '📐', '🔬', '📝'],
  },
  {
    category: 'Yard & Outdoor',
    emojis: ['🪴', '🌱', '🌿', '🍂', '🚲', '⚽', '🏀', '🚗', '🏊‍♂️', '🌳'],
  },
  {
    category: 'Rewards & Spirit',
    emojis: ['⭐', '🏆', '💎', '🎮', '🧸', '🎉', '❤️', '🔥', '🥇', '👑'],
  },
];

const LUCIDE_ICON_PRESETS = [
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'bed', label: 'Bed' },
  { id: 'shirt', label: 'Laundry' },
  { id: 'trash-2', label: 'Trash' },
  { id: 'utensils', label: 'Dishes' },
  { id: 'backpack', label: 'Backpack' },
  { id: 'book-open', label: 'Reading' },
  { id: 'dog', label: 'Dog' },
  { id: 'cat', label: 'Cat' },
  { id: 'bath', label: 'Bath' },
  { id: 'droplets', label: 'Water' },
  { id: 'home', label: 'Home' },
  { id: 'car', label: 'Car' },
  { id: 'palette', label: 'Art' },
  { id: 'dumbbell', label: 'Exercise' },
  { id: 'trees', label: 'Yard' },
  { id: 'clock', label: 'Clock' },
  { id: 'trophy', label: 'Trophy' },
  { id: 'heart', label: 'Kindness' },
  { id: 'zap', label: 'Energy' },
];

export const ChoreIconPicker: React.FC<ChoreIconPickerProps> = ({ value, onChange }) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'lucide'>('emoji');
  const [customInput, setCustomInput] = useState('');

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onChange(customInput.trim());
      setCustomInput('');
    }
  };

  return (
    <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-800 text-xs">
          Chore Icon or Emoji
        </label>
        {/* Tab switcher */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('emoji')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
              activeTab === 'emoji'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smile className="w-3 h-3" />
            <span>Emojis</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lucide')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
              activeTab === 'lucide'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shapes className="w-3 h-3" />
            <span>Icons</span>
          </button>
        </div>
      </div>

      {/* Selected Preview and Custom Input */}
      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 shadow-xs">
          <ChoreIcon name={value} className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Custom Icon or Emoji Input
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="text"
              placeholder="Paste or type any emoji (e.g. 🧹, 🐕, 🪥)..."
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                if (e.target.value.trim()) {
                  onChange(e.target.value.trim());
                }
              }}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {customInput && (
              <button
                type="button"
                onClick={() => {
                  onChange(customInput.trim());
                  setCustomInput('');
                }}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
              >
                Set
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emoji Picker Grid */}
      {activeTab === 'emoji' ? (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {EMOJI_PRESETS.map((group) => (
            <div key={group.category} className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {group.category}
              </span>
              <div className="flex flex-wrap gap-1">
                {group.emojis.map((emoji) => {
                  const isSelected = value === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onChange(emoji)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition active:scale-95 ${
                        isSelected
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/40 shadow-xs scale-105'
                          : 'bg-white hover:bg-slate-100 border border-slate-200'
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Lucide Vector Icons Grid */
        <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {LUCIDE_ICON_PRESETS.map((icon) => {
            const isSelected = value.toLowerCase() === icon.id.toLowerCase();
            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => onChange(icon.id)}
                className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-bold ring-2 ring-indigo-500/30'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                title={icon.label}
              >
                <ChoreIcon
                  name={icon.id}
                  className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-700'}`}
                />
                <span className="text-[9px] truncate w-full text-center leading-tight">
                  {icon.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
