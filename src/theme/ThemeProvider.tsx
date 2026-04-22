'use client';

import * as React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { darkTheme } from '@/theme/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
  isMobileHint?: boolean;
}

export const useThemeMode = () => {
  return {
    mode: 'dark',
    setMode: (_mode: 'light' | 'dark' | 'system') => {},
    toggleMode: () => {},
  };
};

export function ThemeProvider({ children, isMobileHint = false }: ThemeProviderProps) {
  React.useEffect(() => {
    // Force dark mode class on html for any legacy tailwind or global styles
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }, []);

  return (
    <MuiThemeProvider theme={darkTheme(isMobileHint)}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
