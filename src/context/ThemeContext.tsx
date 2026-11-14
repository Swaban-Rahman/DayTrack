import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const cached = window.localStorage.getItem('daytrack-theme');
    const initial: Theme = cached === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = initial;
    return initial;
  });

  useEffect(() => {
    if (window.daytrack) {
      window.daytrack.getSetting('theme').then((savedTheme) => {
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
          document.documentElement.dataset.theme = savedTheme;
          window.localStorage.setItem('daytrack-theme', savedTheme);
        }
      }).catch(() => undefined);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.dataset.theme = newTheme;
    window.localStorage.setItem('daytrack-theme', newTheme);
    if (window.daytrack) {
      window.daytrack.setSetting('theme', newTheme).catch(console.error);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
