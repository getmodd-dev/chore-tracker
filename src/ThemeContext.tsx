import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppTheme, Child } from './types';

interface ThemeContextType {
  theme: AppTheme;
  isFintech: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'classic',
  isFintech: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
  activeChild?: Child | null;
  onChildThemeChange?: (childId: string, theme: AppTheme) => void;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  activeChild,
  onChildThemeChange,
}) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    // Check if child has a preferred theme
    if (activeChild?.theme) return activeChild.theme;
    // Check localStorage
    const saved = localStorage.getItem('chore_app_theme') as AppTheme | null;
    return saved === 'fintech_hustle' ? 'fintech_hustle' : 'classic';
  });

  // When active child changes, adopt their theme preference if set
  useEffect(() => {
    if (activeChild?.theme && activeChild.theme !== theme) {
      setThemeState(activeChild.theme);
    }
  }, [activeChild?.id, activeChild?.theme]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('chore_app_theme', newTheme);
    if (activeChild && onChildThemeChange) {
      onChildThemeChange(activeChild.id, newTheme);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'fintech_hustle' ? 'classic' : 'fintech_hustle';
    setTheme(next);
  };

  const isFintech = theme === 'fintech_hustle';

  return (
    <ThemeContext.Provider value={{ theme, isFintech, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
