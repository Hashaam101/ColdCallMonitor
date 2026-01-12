/**
 * Alerts Hook
 * 
 * React Query hooks for managing alerts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Query, ID } from 'appwrite';
import { databases, DATABASE_ID, ALERTS_COLLECTION_ID } from '@/lib/appwrite';
import { useAuth } from '@/lib/auth';
import type { Alert, AlertCreateData } from '@/types';

// Query key factory
export const alertsKeys = {
    all: ['alerts'] as const,
    lists: () => [...alertsKeys.all, 'list'] as const,
    listByUser: (userId: string) => [...alertsKeys.lists(), userId] as const,
    listByEntity: (entityId: string) => [...alertsKeys.lists(), 'entity', entityId] as const,
    unreadCount: (userId: string) => [...alertsKeys.all, 'unread', userId] as const,
};

// Fetch alerts for current user (due/triggered only)
export function useAlerts() {
    const { teamMember } = useAuth();

    return useQuery({
        queryKey: alertsKeys.listByUser(teamMember?.$id || ''),
        queryFn: async () => {
            if (!DATABASE_ID || !ALERTS_COLLECTION_ID || !teamMember) {
                return [];
            }

            const now = new Date().toISOString();

            try {
                // Fetch all non-dismissed alerts for user
                // Simplified query to avoid index issues
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    ALERTS_COLLECTION_ID,
                    [
                        Query.equal('target_user', teamMember.$id),
                        Query.equal('is_dismissed', false),
                        Query.limit(100),
                    ]
                );

                const documents = response.documents as unknown as Alert[];

                // Filter for due alerts locally
                // 1. Alert time is null (instant) OR
                // 2. Alert time <= now
                const dueAlerts = documents.filter(doc =>
                    !doc.alert_time || new Date(doc.alert_time) <= new Date(now)
                );

                // Sort by createdAt desc
                return dueAlerts.sort((a, b) =>
                    new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
                );
            } catch (error) {
                console.error('Error fetching alerts:', error);
                return [];
            }
        },
        enabled: !!teamMember,
        refetchInterval: 30000,
    });
}

// Fetch ALL alerts (triggered + upcoming) for current user
export function useAllAlerts() {
    const { teamMember } = useAuth();

    return useQuery({
        queryKey: [...alertsKeys.listByUser(teamMember?.$id || ''), 'all'],
        queryFn: async () => {
            if (!DATABASE_ID || !ALERTS_COLLECTION_ID || !teamMember) {
                return { triggered: [], upcoming: [] };
            }

            const now = new Date().toISOString();

            try {
                // Fetch all non-dismissed alerts
                // Removed sort to avoid index errors, sorting in JS instead
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    ALERTS_COLLECTION_ID,
                    [
                        Query.equal('target_user', teamMember.$id),
                        Query.equal('is_dismissed', false),
                        Query.limit(100),
                    ]
                );

                let allAlerts = response.documents as unknown as Alert[];

                // Sort by createdAt desc (newest first)
                allAlerts.sort((a, b) =>
                    new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
                );

                // Split into triggered and upcoming
                const triggered = allAlerts.filter(a => !a.alert_time || new Date(a.alert_time) <= new Date(now));
                const upcoming = allAlerts.filter(a => a.alert_time && new Date(a.alert_time) > new Date(now));

                return { triggered, upcoming, all: allAlerts };
            } catch (error) {
                console.error('Error fetching alerts:', error);
                // Return empty arrays on error to prevent crashes
                return { triggered: [], upcoming: [], all: [] };
            }
        },
        enabled: !!teamMember,
        refetchInterval: 30000, // Refetch every 30 seconds to catch newly-due alerts
    });
}

// Fetch alerts for a specific entity (cold call)
export function useAlertsByEntity(entityId: string) {
    return useQuery({
        queryKey: alertsKeys.listByEntity(entityId),
        queryFn: async () => {
            if (!DATABASE_ID || !ALERTS_COLLECTION_ID || !entityId) {
                return [];
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                ALERTS_COLLECTION_ID,
                [
                    Query.equal('entity_id', entityId),
                    Query.equal('is_dismissed', false),
                    Query.limit(10),
                ]
            );

            return response.documents as unknown as Alert[];
        },
        enabled: !!entityId,
    });
}

// Count unread/active alerts for current user
export function useUnreadAlertCount() {
    const { data: alerts } = useAlerts();
    return alerts?.length || 0;
}

// Create a new alert
export function useCreateAlert() {
    const queryClient = useQueryClient();
    const { teamMember } = useAuth();

    return useMutation({
        mutationFn: async (data: Omit<AlertCreateData, 'created_by'>) => {
            if (!DATABASE_ID || !ALERTS_COLLECTION_ID || !teamMember) {
                throw new Error('Configuration missing or not authenticated');
            }

            const alert = await databases.createDocument(
                DATABASE_ID,
                ALERTS_COLLECTION_ID,
                ID.unique(),
                {
                    ...data,
                    created_by: teamMember.$id,
                    is_dismissed: false,
                }
            );

            return alert as unknown as Alert;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: alertsKeys.all });
        },
    });
}

// Dismiss an alert
export function useDismissAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string) => {
            if (!DATABASE_ID || !ALERTS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            await databases.updateDocument(
                DATABASE_ID,
                ALERTS_COLLECTION_ID,
                alertId,
                { is_dismissed: true }
            );

            return alertId;
        },
        onSuccess: () => {
            // Invalidate all alert-related queries including entity-specific ones
            queryClient.invalidateQueries({ queryKey: alertsKeys.all });
            queryClient.invalidateQueries({ queryKey: alertsKeys.lists() });
        },
    });
}

// Delete an alert
export function useDeleteAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string) => {
            if (!DATABASE_ID || !ALERTS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            await databases.deleteDocument(DATABASE_ID, ALERTS_COLLECTION_ID, alertId);
            return alertId;
        },
        onSuccess: () => {
            // Invalidate all alert-related queries including entity-specific ones
            queryClient.invalidateQueries({ queryKey: alertsKeys.all });
            queryClient.invalidateQueries({ queryKey: alertsKeys.lists() });
        },
    });
}
