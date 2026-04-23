"use client";

import React from 'react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { DataNexusProvider } from '@/context/DataNexusContext';
import { AuthProvider } from '@/context/auth/AuthContext';
import { TaskProvider } from '@/context/TaskContext';
import { SubscriptionProvider } from '@/context/subscription/SubscriptionContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { LayoutProvider } from '@/context/LayoutContext';
import { SudoProvider } from '@/context/SudoContext';
import { ViewportProvider } from '@/context/ViewportContext';

export function AppProviders({ children, isMobileHint = false }: { children: React.ReactNode; isMobileHint?: boolean }) {
  return (
    <ViewportProvider isMobileHint={isMobileHint}>
      <ThemeProvider isMobileHint={isMobileHint}>
        <DataNexusProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <TaskProvider>
                <NotificationProvider>
                  <LayoutProvider>
                    <SudoProvider>{children}</SudoProvider>
                  </LayoutProvider>
                </NotificationProvider>
              </TaskProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </DataNexusProvider>
      </ThemeProvider>
    </ViewportProvider>
  );
}

export { AppProviders as Providers };
