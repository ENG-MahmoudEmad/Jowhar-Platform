//src\context\ThemeContext.tsx

"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

function getStoredTheme(fallback: Theme): Theme {
  if (typeof window === 'undefined') return fallback;
  const saved = window.localStorage.getItem('jowhar-theme');
  return saved === 'light' || saved === 'dark' ? saved : fallback;
}

export function ThemeProvider({
  children,
  initialTheme = 'dark',
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme(initialTheme));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('jowhar-theme', theme);
    document.cookie = `jowhar-theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
