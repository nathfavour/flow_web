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

export function AppProviders({ children, isMobileHint = false }: { children: React.ReactNode; isMobileHint?: boolean }) {
  return (
    <ThemeProvider isMobileHint={isMobileHint}>
      <DataNexusProvider>
        <SubscriptionProvider>
          <AuthProvider>
            <TaskProvider>
              <NotificationProvider>
                <LayoutProvider>
                  <SudoProvider>{children}</SudoProvider>
                </LayoutProvider>
              </NotificationProvider>
            </TaskProvider>
          </AuthProvider>
        </SubscriptionProvider>
      </DataNexusProvider>
    </ThemeProvider>
  );
}

export { AppProviders as Providers };
