/**
 * Real-time Subscription Hook
 * 
 * Subscribes to Appwrite real-time changes and invalidates React Query cache.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { client, DATABASE_ID, COLDCALLS_COLLECTION_ID, ALERTS_COLLECTION_ID } from '@/lib/appwrite';
import { coldCallsKeys } from './useColdCalls';
import { alertsKeys } from './useAlerts';

// Subscribe to cold calls collection changes
export function useRealtimeColdCalls() {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
            console.warn('Database configuration missing for real-time subscriptions');
            return;
        }

        const channel = `databases.${DATABASE_ID}.collections.${COLDCALLS_COLLECTION_ID}.documents`;

        const unsubscribe = client.subscribe(channel, (response) => {
            // Invalidate queries on any change
            const events = response.events;

            if (events.some(e => e.includes('.create') || e.includes('.update') || e.includes('.delete'))) {
                queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [queryClient]);
}

// Subscribe to alerts collection changes
export function useRealtimeAlerts() {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!DATABASE_ID || !ALERTS_COLLECTION_ID) {
            return;
        }

        const channel = `databases.${DATABASE_ID}.collections.${ALERTS_COLLECTION_ID}.documents`;

        const unsubscribe = client.subscribe(channel, (response) => {
            const events = response.events;

            if (events.some(e => e.includes('.create') || e.includes('.update') || e.includes('.delete'))) {
                queryClient.invalidateQueries({ queryKey: alertsKeys.all });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [queryClient]);
}

// Combined hook for all real-time subscriptions
export function useRealtime() {
    useRealtimeColdCalls();
    useRealtimeAlerts();
}
