export interface AvatarCategory {
  id: string;
  name: string;
  icon: string;
  avatars: string[];
}

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  {
    id: 'kids_heroes',
    name: 'Kids & Heroes',
    icon: '🦸',
    avatars: [
      '👦', '👧', '🧒', '👶', '🧑', '👱‍♂️', '👱‍♀️', '🧑‍🦰', '🧑‍🦱', '🧑‍🦳',
      '🤴', '👸', '🦸‍♂️', '🦸‍♀️', '🦹‍♂️', '🦹‍♀️', '🥷', '🧑‍🚀', '🧑‍🔬', '🧑‍🎨',
      '👨‍🚒', '👮', '🧙‍♂️', '🧙‍♀️', '🧚‍♂️', '🧚‍♀️', '🧜‍♀️', '🧞‍♂️', '🧝‍♀️', '🤠',
      '🕵️', '👑', '💂', '👷',
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Pets',
    icon: '🐾',
    avatars: [
      '🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐰', '🦄',
      '🦖', '🦕', '🐬', '🐳', '🦈', '🐧', '🦉', '🐺', '🐵', '🐴',
      '🐝', '🐙', '🐢', '🦥', '🦔', '🐲', '🐉', '🦋', '🐞', '🦀',
      '🦭', '🦦', '🦝', '🦚', '🦜', '🦩', '🐿️', '🦬', '🦓', '🦒',
    ],
  },
  {
    id: 'gaming_sports',
    name: 'Gaming & Action',
    icon: '🎮',
    avatars: [
      '🎮', '👾', '🤖', '⚡', '🚀', '🛸', '💻', '🕹️', '🛹', '🛼',
      '🏎️', '🏍️', '🚲', '🛴', '🚁', '🧭', '🎯', '🔮', '🎸', '🎧',
      '🏆', '🥇', '⚽', '🏀', '🏈', '⚾', '🎾', '🥊', '🥋', '🏹',
      '🧗', '🏄', '🏊', '🏓', '🎳', '🎲', '♟️',
    ],
  },
  {
    id: 'nature_fun',
    name: 'Vibes & Food',
    icon: '⭐',
    avatars: [
      '⭐', '🌟', '🔥', '🌈', '💎', '🌲', '🌻', '🌺', '🍀', '🌊',
      '☀️', '🌙', '🪐', '💥', '✨', '🍕', '🍦', '🍩', '🍔', '🍟',
      '🌮', '🍣', '🍓', '🍉', '🥑', '🍿', '🧁', '🍪', '🍫', '🍭',
      '🕶️', '🎨', '🎪', '🎉', '🧩', '🧸', '🪄', '👑',
    ],
  },
];

// Flat list of all default avatars for quick pick
export const ALL_AVATARS = AVATAR_CATEGORIES.flatMap((c) => c.avatars);

// Popular avatars for quick display
export const POPULAR_AVATARS = [
  '👦', '👧', '🧒', '👶', '🦸‍♂️', '🦸‍♀️', '🥷', '🧑‍🚀',
  '🦁', '🐯', '🦊', '🐼', '🐶', '🐱', '🦄', '🦖',
  '🚀', '🎮', '👾', '🤖', '⚡', '⭐', '💎', '🔥',
];
