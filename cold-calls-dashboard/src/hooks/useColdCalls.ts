/**
 * Cold Calls CRUD Hooks
 * 
 * React Query hooks for fetching, updating, and deleting cold calls.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { databases, DATABASE_ID, COLDCALLS_COLLECTION_ID } from '@/lib/appwrite';
import type { ColdCall, ColdCallFilters, ColdCallUpdateData, SortConfig } from '@/types';

// Query key factory
export const coldCallsKeys = {
    all: ['coldCalls'] as const,
    lists: () => [...coldCallsKeys.all, 'list'] as const,
    list: (filters: ColdCallFilters, sort?: SortConfig) =>
        [...coldCallsKeys.lists(), { filters, sort }] as const,
    details: () => [...coldCallsKeys.all, 'detail'] as const,
    detail: (id: string) => [...coldCallsKeys.details(), id] as const,
};

// Build Appwrite queries from filters
function buildQueries(filters: ColdCallFilters, sort?: SortConfig): string[] {
    const queries: string[] = [];

    // Date range filter
    if (filters.dateRange?.from) {
        queries.push(Query.greaterThanEqual('$createdAt', filters.dateRange.from.toISOString()));
    }
    if (filters.dateRange?.to) {
        queries.push(Query.lessThanEqual('$createdAt', filters.dateRange.to.toISOString()));
    }

    // Interest level filter
    if (filters.interestLevel) {
        queries.push(Query.greaterThanEqual('interest_level', filters.interestLevel.min));
        queries.push(Query.lessThanEqual('interest_level', filters.interestLevel.max));
    }

    // Call outcome filter
    if (filters.callOutcome && filters.callOutcome.length > 0) {
        queries.push(Query.equal('call_outcome', filters.callOutcome));
    }

    // Claimed by filter
    if (filters.claimedBy === 'unclaimed') {
        queries.push(Query.isNull('claimed_by'));
    } else if (filters.claimedBy) {
        queries.push(Query.equal('claimed_by', filters.claimedBy));
    }

    // Sorting
    if (sort) {
        if (sort.direction === 'desc') {
            queries.push(Query.orderDesc(sort.field));
        } else {
            queries.push(Query.orderAsc(sort.field));
        }
    } else {
        // Default sort by created date descending
        queries.push(Query.orderDesc('$createdAt'));
    }

    // Limit to prevent excessive data fetch
    queries.push(Query.limit(100));

    return queries;
}

// Fetch cold calls with filters and sorting
export function useColdCalls(filters: ColdCallFilters = {}, sort?: SortConfig) {
    return useQuery({
        queryKey: coldCallsKeys.list(filters, sort),
        queryFn: async () => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            const queries = buildQueries(filters, sort);
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLDCALLS_COLLECTION_ID,
                queries
            );

            return response.documents as unknown as ColdCall[];
        },
    });
}

// Fetch a single cold call
export function useColdCall(id: string) {
    return useQuery({
        queryKey: coldCallsKeys.detail(id),
        queryFn: async () => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            const document = await databases.getDocument(
                DATABASE_ID,
                COLDCALLS_COLLECTION_ID,
                id
            );

            return document as unknown as ColdCall;
        },
        enabled: !!id,
    });
}

// Update a cold call
export function useUpdateColdCall() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: ColdCallUpdateData }) => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            const updated = await databases.updateDocument(
                DATABASE_ID,
                COLDCALLS_COLLECTION_ID,
                id,
                data
            );

            return updated as unknown as ColdCall;
        },
        onSuccess: (data) => {
            // Update the cache for this specific call
            queryClient.setQueryData(coldCallsKeys.detail(data.$id), data);
            // Invalidate list queries to refetch
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.lists() });
        },
    });
}

// Delete a single cold call
export function useDeleteColdCall() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            await databases.deleteDocument(DATABASE_ID, COLDCALLS_COLLECTION_ID, id);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
        },
    });
}

// Bulk delete cold calls
export function useDeleteColdCalls() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            // Delete in parallel
            await Promise.all(
                ids.map(id => databases.deleteDocument(DATABASE_ID, COLDCALLS_COLLECTION_ID, id))
            );

            return ids;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
        },
    });
}

// Bulk claim cold calls
export function useBulkClaimColdCalls() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ids, claimedBy }: { ids: string[]; claimedBy: string | null }) => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            // Update in parallel
            await Promise.all(
                ids.map(id =>
                    databases.updateDocument(DATABASE_ID, COLDCALLS_COLLECTION_ID, id, { claimed_by: claimedBy })
                )
            );

            return ids;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
        },
    });
}

// Bulk update call outcome
export function useBulkUpdateOutcome() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ids, outcome }: { ids: string[]; outcome: string }) => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            await Promise.all(
                ids.map(id =>
                    databases.updateDocument(DATABASE_ID, COLDCALLS_COLLECTION_ID, id, { call_outcome: outcome })
                )
            );

            return ids;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
        },
    });
}
