"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { 
  realtime, 
  tablesDB as databases,
} from '@/lib/appwrite/client';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';
import { Query } from 'appwrite';
import { useAuth } from './auth/AuthContext';

interface NotificationMetadata {
  read?: boolean;
  readAt?: string;
  originalDetails?: string | null;
}

interface ActivityLog {
  $id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  details: string | null;
}

interface NotificationContextType {
  notifications: ActivityLog[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const APPWRITE_TABLE_ID_ACTIVITYLOG = "activityLog";

  const parseMetadata = (details: string | null): NotificationMetadata => {
    if (!details) return { read: false, originalDetails: null };
    try {
      if (details.startsWith('{')) {
        return JSON.parse(details);
      }
    } catch (_e: unknown) {}
    return { read: false, originalDetails: details };
  };

  const calculateUnread = useCallback((logs: ActivityLog[]) => {
    return logs.filter(log => !parseMetadata(log.details).read).length;
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.$id) return;
    
    setIsLoading(true);
    try {
      const res = await (databases as any).listRows({
        databaseId: APPWRITE_CONFIG.NOTE_DATABASE_ID,
        tableId: APPWRITE_TABLE_ID_ACTIVITYLOG,
        queries: [Query.equal('userId', user.$id), Query.orderDesc('timestamp'), Query.limit(50)]
      });
      const logs = res.rows as unknown as ActivityLog[];
      setNotifications(logs);
      setUnreadCount(calculateUnread(logs));
    } catch (_error: unknown) {
      console.error('Failed to fetch notifications:', _error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id, calculateUnread]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.$id) return;

    const channel = `databases.${APPWRITE_CONFIG.NOTE_DATABASE_ID}.collections.${APPWRITE_TABLE_ID_ACTIVITYLOG}.documents`;
    
    const unsub = realtime.subscribe(channel, (response) => {
      const payload = response.payload as ActivityLog;
      if (payload.userId !== user.$id) return;

      const isCreate = response.events.some(e => e.includes('.create'));
      const isUpdate = response.events.some(e => e.includes('.update'));

      if (isCreate) {
        setNotifications(prev => [payload, ...prev]);
        if (!parseMetadata(payload.details).read) {
          setUnreadCount(prev => prev + 1);
        }
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`Kylrix ${payload.targetType}`, { body: payload.action });
        }
      } else if (isUpdate) {
        setNotifications(prev => {
          const updated = prev.map(n => n.$id === payload.$id ? payload : n);
          setUnreadCount(calculateUnread(updated));
          return updated;
        });
      }
    });

    return () => {
      if (typeof unsub === 'function') (unsub as any)();
      else (unsub as any).unsubscribe?.();
    };
  }, [user?.$id, calculateUnread]);

  const markAsRead = async (id: string) => {
    const notification = notifications.find(n => n.$id === id);
    if (!notification) return;

    const meta = parseMetadata(notification.details);
    if (meta.read) return;

    const newMetadata = { ...meta, read: true, readAt: new Date().toISOString() };

    try {
      setNotifications(prev => prev.map(n => n.$id === id ? { ...n, details: JSON.stringify(newMetadata) } : n));
      await (databases as any).updateRow({
        databaseId: APPWRITE_CONFIG.NOTE_DATABASE_ID,
        tableId: APPWRITE_TABLE_ID_ACTIVITYLOG,
        rowId: id,
        data: { details: JSON.stringify(newMetadata) }
      });
    } catch (_error: unknown) {
      console.error('Cloud sync failed:', _error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !parseMetadata(n.details).read);
    unread.forEach(n => markAsRead(n.$id));
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      isLoading, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
