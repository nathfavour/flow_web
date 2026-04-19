'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Models } from 'appwrite';
import { account } from '@/lib/appwrite/client';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Image from 'next/image';
import { APP_CONFIG } from '@/lib/constants';
import { getCurrentUser, invalidateCurrentUserCache } from '@/lib/appwrite/client';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  openLoginPopup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthUrl = () => {
    return `https://accounts.kylrix.space/login`;
};

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
};


// Routes that don't require authentication (public routes)
// These are pages that can be viewed without logging in
const PUBLIC_ROUTES: (string | RegExp)[] = [
  '/',                    // Landing page (redirects to dashboard, but should load first)
  '/events',              // Browse public events - discovery page
  /^\/events\/[^/]+$/,    // /events/[eventId] - individual event pages
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(pattern => {
    if (typeof pattern === 'string') {
      return pathname === pattern;
    }
    return pattern.test(pathname);
  });
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);

  const checkSessionRef = useRef<any>(null);

  // Check if current route is public
  const isOnPublicRoute = isPublicRoute(pathname);

  const attemptSilentAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;

    return new Promise<void>((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://accounts.kylrix.space/silent-check`;
      iframe.style.display = 'none';

      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, 5000);

      const handleIframeMessage = (event: MessageEvent) => {
        const expectedOrigin = `https://accounts.kylrix.space`;
        if (event.origin !== expectedOrigin) return;

        if (event.data?.type === 'idm:auth-status' && event.data.status === 'authenticated') {
          console.log('Silent auth discovered active session in kylrixflow');
          if (checkSessionRef.current) checkSessionRef.current();
          cleanup();
          resolve();
        } else if (event.data?.type === 'idm:auth-status') {
          cleanup();
          resolve();
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('message', handleIframeMessage);
        if (typeof document !== 'undefined' && document.body && document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      };

      window.addEventListener('message', handleIframeMessage);
      document.body.appendChild(iframe);
    });
  }, []);

  const checkSession = useCallback(async (retryCount = 0) => {
    console.log('[Auth] checkSession called', { retryCount });
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.$id) throw new Error('No active session');
      console.log('[Auth] account.get() success', currentUser.$id);
      setUser(currentUser);
      setShowAuthOverlay(false);
      if (authWindow) {
        authWindow.close();
        setAuthWindow(null);
      }
      
      // Clear the auth=success param from URL if it exists
      if (typeof window !== 'undefined' && window.location.search.includes('auth=success')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('auth');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (_error: unknown) {
      // Check for auth=success signal in URL - this means we just came from IDM
      const hasAuthSignal = typeof window !== 'undefined' && window.location.search.includes('auth=success');
      
      if (hasAuthSignal && retryCount < 3) {
        console.log(`Auth signal detected but session not found. Retrying... (${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkSession(retryCount + 1);
      }

      // First try silent recovery
      await attemptSilentAuth();

      // Re-check after silent attempt
      try {
        const retryUser = await getCurrentUser(true);
        if (!retryUser?.$id) throw new Error('No active session');
        setUser(retryUser);
        setShowAuthOverlay(false);
        return;
      } catch (error: any) {
        // Fallback to offline awareness
        const isNetworkError = !error.response && error.message?.includes('Network Error') || error.message?.includes('Failed to fetch');

        if (!isNetworkError) {
          setUser(null);
          if (!isPublicRoute(pathname)) {
            setShowAuthOverlay(true);
          }
        } else {
          console.warn('Network issue detected in kylrixflow. Retaining last state.');
        }
      }
    } finally {
      if (retryCount === 0) {
        setIsLoading(false);
      }
    }
  }, [authWindow, pathname, attemptSilentAuth]);

  // Update ref
  useEffect(() => {
    checkSessionRef.current = checkSession;
  }, [checkSession]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Listen for postMessage from IDM window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const expectedOrigin = `https://accounts.kylrix.space`;
      if (event.origin !== expectedOrigin) return;

      if (event.data?.type === 'idm:auth-success') {
        console.log('Received auth success via postMessage in kylrixflow');
        checkSession();
        setIsAuthenticating(false);
        if (authWindow && !authWindow.closed) {
          authWindow.close();
          setAuthWindow(null);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkSession, authWindow]);


  // Update overlay visibility when route changes
  useEffect(() => {
    if (!user && !isLoading) {
      setShowAuthOverlay(!isOnPublicRoute);
    }
  }, [pathname, user, isLoading, isOnPublicRoute]);

  useEffect(() => {
    if (!showAuthOverlay) return;

    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void checkSessionRef.current?.();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [showAuthOverlay]);

  const openLoginPopup = useCallback(async () => {
    if (typeof window === 'undefined' || isAuthenticating) return;

    setIsAuthenticating(true);

    // First, check if we already have a session locally
    try {
      const currentUser = await getCurrentUser(true);
      if (currentUser) {
        console.log('Active session detected in kylrixflow, skipping IDM window');
        setUser(currentUser);
        setShowAuthOverlay(false);
        setIsAuthenticating(false);
        if (authWindow) {
          authWindow.close();
          setAuthWindow(null);
        }
        return;
      }
    } catch (_e: unknown) {
      // No session, proceed to silent check
    }

    // Try silent auth before opening popup
    await attemptSilentAuth();
    try {
      const currentUser = await getCurrentUser(true);
      if (currentUser) {
        setUser(currentUser);
        setShowAuthOverlay(false);
        setIsAuthenticating(false);
        return;
      }
    } catch (_e: unknown) {
      // Still no session
    }

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const sourceUrl = window.location.href;
    const authUrlString = getAuthUrl();
    if (!authUrlString) {
        setIsAuthenticating(false);
        return;
    }
    const targetUrl = new URL(authUrlString);
    targetUrl.searchParams.set('source', sourceUrl);
    const targetUrlString = targetUrl.toString();

    if (isMobile()) {
      window.location.assign(targetUrlString);
      return;
    }

    const win = window.open(
      targetUrlString,
      'KylrixAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    if (win) {
      setAuthWindow(win);
    } else {
      // Popup blocked - fallback to redirect
      console.warn('Popup blocked, falling back to redirect in kylrixflow');
      window.location.assign(targetUrlString);
    }
  }, [authWindow, isAuthenticating, attemptSilentAuth, setIsAuthenticating]);


  const logout = async () => {
    try {
      await account.deleteSession('current');
      invalidateCurrentUserCache();
      setUser(null);
      setIsAuthenticating(false);
      // Only show overlay if not on public route
      if (!isOnPublicRoute) {
        setShowAuthOverlay(true);
      }
    } catch (error: unknown) {
      console.error('Logout failed', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticating, isAuthenticated: !!user, logout, checkSession, openLoginPopup }}>
      {showAuthOverlay && !isOnPublicRoute ? (
        <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
          {/* Blurred Background Content */}
          <Box sx={{ filter: 'blur(8px)', pointerEvents: 'none', height: '100%' }}>
            {children}
          </Box>

          {/* Auth Overlay */}
          <Backdrop
            open={true}
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 9999,
              color: '#fff',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                mb: 1,
              }}
            >
              <Image
                src={APP_CONFIG.logo.url}
                alt={APP_CONFIG.logo.alt}
                width={80}
                height={80}
                style={{ objectFit: 'cover' }}
                priority
              />
            </Box>
            <Typography variant="h4" fontWeight="bold">
              Welcome to {APP_CONFIG.name}
            </Typography>
            <Typography variant="body1" align="center" sx={{ maxWidth: 400, opacity: 0.9 }}>
              Please sign in with your Kylrix account to access your tasks and workflows.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={openLoginPopup}
              disabled={isAuthenticating}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 2,
                textTransform: 'none',
                minWidth: 150,
              }}
            >
              {isAuthenticating ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Backdrop>
        </Box>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
