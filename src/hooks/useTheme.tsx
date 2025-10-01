import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
  accentColor: string;
}

const THEME_KEY = 'app-theme';
const ACCENT_KEY = 'app-accent-color';
const DEFAULT_ACCENT = '174 72% 56%'; // Teal default

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(THEME_KEY) as Theme) || 'dark';
}

function getStoredAccent(): string {
  if (typeof window === 'undefined') return DEFAULT_ACCENT;
  return localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT;
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

function applyAccent(color: string) {
  const root = document.documentElement;
  root.style.setProperty('--primary', color);
  root.style.setProperty('--accent', color);
  root.style.setProperty('--ring', color);
  root.style.setProperty('--sidebar-primary', color);
  root.style.setProperty('--sidebar-ring', color);
}

export function useTheme(): ThemeState {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [accentColor, setAccentColorState] = useState<string>(getStoredAccent);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const stored = getStoredTheme();
    return stored === 'system' ? getSystemTheme() : stored;
  });

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme on mount and when it changes
  useEffect(() => {
    const newResolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(newResolved);
    applyTheme(newResolved);
  }, [theme]);

  // Apply accent color on mount and when it changes
  useEffect(() => {
    applyAccent(accentColor);
  }, [accentColor]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem(ACCENT_KEY, color);
    applyAccent(color);
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    setAccentColor,
    accentColor,
  };
}
