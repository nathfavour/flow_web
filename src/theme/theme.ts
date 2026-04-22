import { createTheme, alpha } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

const SURFACE_BACKGROUND = '#000000';
const SURFACE = '#161514';

const matchesMediaQuery = (query: string, isMobileHint: boolean) => {
  const width = isMobileHint ? 390 : 1440;
  const maxWidth = query.match(/max-width:\s*(\d+(?:\.\d+)?)px/i);
  const minWidth = query.match(/min-width:\s*(\d+(?:\.\d+)?)px/i);

  if (maxWidth) return width <= Number(maxWidth[1]);
  if (minWidth) return width >= Number(minWidth[1]);
  return false;
};

const getDesignTokens = (isMobileHint = false): ThemeOptions => ({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366F1', // Electric Teal
      contrastText: '#000000',
    },
    secondary: {
      main: '#10B981', // Atomic Emerald
    },
    background: {
      default: SURFACE_BACKGROUND,
      paper: SURFACE,
    },
    text: {
      primary: '#F2F2F2',   // Titanium
      secondary: '#94A3B8', // Muted Slate
      disabled: '#404040',  // Carbon
    },
    divider: 'rgba(255, 255, 255, 0.05)', // Subtle Border
  },
  typography: {
    fontFamily: 'var(--font-satoshi), "Satoshi", sans-serif',
    h1: {
      fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
      fontSize: '3.5rem',
      fontWeight: 900,
      letterSpacing: '-0.04em',
      color: '#F2F2F2',
    },
    h2: {
      fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
      fontSize: '2.5rem',
      fontWeight: 900,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
      fontSize: '2rem',
      fontWeight: 900,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 900,
    },
    h5: {
      fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
      fontSize: '1.25rem',
      fontWeight: 800,
    },
    h6: {
      fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
      fontSize: '1.1rem',
      fontWeight: 800,
    },
    subtitle1: {
      fontSize: '1.1rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#A1A1AA',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 500,
      color: '#A1A1AA',
    },
    button: {
      fontFamily: 'var(--font-clash), "Clash Display", sans-serif',
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.4)',
    '0px 4px 8px rgba(0,0,0,0.4)',
    '0px 8px 16px rgba(0,0,0,0.5)',
    '0px 12px 24px rgba(0,0,0,0.5)',
    '0px 16px 32px rgba(0,0,0,0.6)',
    '0px 20px 40px rgba(0,0,0,0.6)',
    '0px 24px 48px rgba(0,0,0,0.7)',
    '0px 28px 56px rgba(0,0,0,0.7)',
    '0px 32px 64px rgba(0,0,0,0.8)',
    ...Array(15).fill('0px 32px 64px rgba(0,0,0,0.8)')
  ] as any,
  components: {
    MuiUseMediaQuery: {
      defaultProps: {
        ssrMatchMedia: (query: string) => ({
          matches: matchesMediaQuery(query, isMobileHint),
        }),
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: SURFACE_BACKGROUND,
          backgroundImage: `radial-gradient(circle at 50% -20%, ${alpha('#6366F1', 0.1)} 0%, transparent 70%),\n                           linear-gradient(180deg, ${alpha(SURFACE, 0.35)} 0%, transparent 100%)`,
          backgroundAttachment: 'fixed',
          color: '#F2F2F2',
          fontFamily: 'var(--font-satoshi), "Satoshi", sans-serif',
          scrollbarColor: '#222222 transparent',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
          },
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        containedPrimary: {
          backgroundColor: '#6366F1',
          color: '#000000',
          border: 'none',
          backgroundImage: 'none',
          fontWeight: 800,
          boxShadow: '0 1px 0 rgba(0, 0, 0, 0.4)',
          '&::before': {
            background: 'rgba(255, 255, 255, 0.15)',
          },
          '&:hover': {
            backgroundColor: alpha('#6366F1', 0.8),
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2), 0 1px 0 rgba(0, 0, 0, 0.4)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: '#F2F2F2',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        filled: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            transition: 'all 0.2s',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(99, 102, 241, 0.5)',
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backgroundColor: SURFACE,
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          position: 'relative',
          boxShadow: '0 1px 0 rgba(0, 0, 0, 0.4)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'rgba(99, 102, 241, 0.2)',
            transform: 'translateY(-2px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(0, 0, 0, 0.4)'
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundColor: SURFACE,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundImage: 'none',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(0, 0, 0, 0.4)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
          },
        },
      },
    },
  },
});

export const darkTheme = (isMobileHint = false) => createTheme(getDesignTokens(isMobileHint));
export const lightTheme = darkTheme; // No light mode

export default darkTheme;
