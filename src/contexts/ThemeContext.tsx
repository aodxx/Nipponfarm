import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeProviderState {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

const getAutoTheme = (): Theme => {
  const now = new Date();
  const hours = now.getHours();
  // Daylight: 06:00 - 17:59 (6 <= hours < 18)
  if (hours >= 6 && hours < 18) {
    return 'light';
  } else {
    return 'dark';
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('app-theme-mode') as ThemeMode | null;
    return stored || 'auto'; // Default to "auto" as requested
  });

  const [theme, setTheme] = useState<Theme>(() => {
    if (themeMode === 'auto') {
      return getAutoTheme();
    }
    return themeMode;
  });

  // Keep theme in sync with themeMode and time changes
  useEffect(() => {
    if (themeMode !== 'auto') {
      setTheme(themeMode);
      return;
    }

    // Set initial auto theme
    setTheme(getAutoTheme());

    // Setup checker every 10 seconds to respond immediately to clock changes
    const interval = setInterval(() => {
      setTheme(getAutoTheme());
    }, 10000);

    return () => clearInterval(interval);
  }, [themeMode]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    if (theme === 'dark') {
      root.style.colorScheme = 'dark';
    } else {
      root.style.colorScheme = 'light';
    }

    // Dynamically update the theme-color meta tag for system status bar content contrast
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0E214B' : '#f1f5f9');
  }, [theme]);

  const setThemeMode = (newMode: ThemeMode) => {
    localStorage.setItem('app-theme-mode', newMode);
    setThemeModeState(newMode);
  };
  
  const toggleTheme = () => {
    // Cycles: auto -> light -> dark -> auto
    if (themeMode === 'auto') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('auto');
    }
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

