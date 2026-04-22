'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { tablesDB, getCurrentUser, getCurrentUserSnapshot, onCurrentUserChanged } from '@/lib/appwrite/client';
import { APPWRITE_CONFIG } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

interface SubscriptionContextType {
    subscription: any;
    loading: boolean;
    refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(() => !getCurrentUserSnapshot());

    const checkSubscription = async (currentUser?: any | null) => {
        try {
            const user = currentUser ?? getCurrentUserSnapshot() ?? await getCurrentUser();
            if (!user?.$id) {
                setSubscription(null);
                return;
            }
            const response = await tablesDB.listRows<any>({
                databaseId: APPWRITE_CONFIG.DATABASES.FLOW,
                tableId: 'subscriptions',
                queries: [Query.equal('userId', user.$id)]
            });
            setSubscription(response.rows[0] || null);
        } catch (error) {
            console.error('Error checking subscription:', error);
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void checkSubscription(getCurrentUserSnapshot());
        const unsubscribe = onCurrentUserChanged((user) => {
            void checkSubscription(user);
        });
        return unsubscribe;
    }, []);

    return (
        <SubscriptionContext.Provider value={{ subscription, loading, refresh: checkSubscription }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}
