/**
 * Cold Calls CRUD Hooks with Optimized Caching
 * 
 * React Query hooks for fetching, updating, and deleting cold calls.
 * Handles normalized schema: companies and transcripts in separate tables.
 * 
 * Optimizations:
 * - Caches cold call lists with filters
 * - Batch fetches related company and transcript data
 * - Reduces API calls with longer stale times
 * - Smart cache invalidation on mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import {
    databases,
    DATABASE_ID,
    COLDCALLS_COLLECTION_ID,
    COMPANIES_COLLECTION_ID,
    TRANSCRIPTS_COLLECTION_ID
} from '@/lib/appwrite';
import { cacheService, cacheKeys, cacheTTL } from '@/lib/cache-service';
import type { ColdCall, ColdCallFilters, ColdCallUpdateData, SortConfig, Company, Transcript } from '@/types';

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

/**
 * Enriches cold calls with company and transcript data from normalized tables.
 * Flattens company fields for backwards-compatible UI rendering.
 * Uses cache to minimize company fetches.
 */
async function enrichColdCalls(calls: ColdCall[]): Promise<ColdCall[]> {
    if (calls.length === 0) return calls;

    // Collect unique company IDs
    const companyIds = [...new Set(calls.map(c => c.company_id).filter(Boolean))] as string[];
    const callIds = calls.map(c => c.$id);

    // Check cache for companies first
    const companiesCache = new Map<string, Company>();
    const companiesNotCached = companyIds.filter(id => {
        const cached = cacheService.get<Company>(cacheKeys.company(id));
        if (cached) {
            companiesCache.set(id, cached);
            return false;
        }
        return true;
    });

    // Fetch companies and transcripts in parallel
    const [companiesResult, transcriptsResult] = await Promise.all([
        companiesNotCached.length > 0
            ? databases.listDocuments(DATABASE_ID, COMPANIES_COLLECTION_ID, [
                Query.equal('$id', companiesNotCached)
            ])
            : Promise.resolve({ documents: [] }),
        callIds.length > 0
            ? databases.listDocuments(DATABASE_ID, TRANSCRIPTS_COLLECTION_ID, [
                Query.equal('call_id', callIds)
            ])
            : Promise.resolve({ documents: [] })
    ]);

    // Build company map, combining cached and freshly fetched
    const companiesMap = new Map<string, Company>(companiesCache);
    (companiesResult.documents as unknown as Company[]).forEach(c => {
        companiesMap.set(c.$id, c);
        // Cache individual companies for future use
        cacheService.set(cacheKeys.company(c.$id), c, { ttl: cacheTTL.LONG });
    });

    const transcriptsMap = new Map<string, string>();
    (transcriptsResult.documents as unknown as Transcript[]).forEach(t =>
        transcriptsMap.set(t.call_id, t.transcript)
    );

    // Enrich calls with flattened company data and transcripts
    return calls.map(call => {
        const company = call.company_id ? companiesMap.get(call.company_id) : null;
        // Cast to access potential call-level fields that may come from Appwrite
        const callWithFields = call as ColdCall & { phone_number?: string };
        return {
            ...call,
            company: company || null,
            transcript: transcriptsMap.get(call.$id) || '',
            // Prefer call-level values, fall back to company values for backwards compatibility
            owner_name: call.owner_name || company?.owner_name || null,
            company_name: company?.company_name || null,
            company_location: company?.company_location || null,
            google_maps_link: company?.google_maps_link || null,
            // phone_number (singular) is on call, phone_numbers (plural) is on company
            phone_numbers: callWithFields.phone_number || company?.phone_numbers || null,
        };
    });
}

// Fetch cold calls with filters and sorting
export function useColdCalls(filters: ColdCallFilters = {}, sort?: SortConfig) {
    return useQuery({
        queryKey: coldCallsKeys.list(filters, sort),
        queryFn: async () => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            // Check cache first
            const cacheKey = JSON.stringify({ filters, sort });
            const cached = cacheService.get<ColdCall[]>('coldcalls:list:' + cacheKey.substring(0, 50));
            if (cached) {
                return cached;
            }

            const queries = buildQueries(filters, sort);
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLDCALLS_COLLECTION_ID,
                queries
            );

            const calls = response.documents as unknown as ColdCall[];

            // Enrich with company and transcript data
            const enriched = await enrichColdCalls(calls);

            // Cache the result
            cacheService.set('coldcalls:list:' + cacheKey.substring(0, 50), enriched, { ttl: cacheTTL.MEDIUM });

            return enriched;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - cold calls change moderately
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
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

            // Check cache first
            const cacheKey = cacheKeys.coldCall(id);
            const cached = cacheService.get<ColdCall>(cacheKey);
            if (cached) {
                return cached;
            }

            const document = await databases.getDocument(
                DATABASE_ID,
                COLDCALLS_COLLECTION_ID,
                id
            );

            const call = document as unknown as ColdCall;

            // Enrich with company and transcript data
            const enriched = await enrichColdCalls([call]);
            const result = enriched[0];

            // Cache the result
            cacheService.set(cacheKey, result, { ttl: cacheTTL.MEDIUM });

            return result;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });
}

// Fetch all cold calls for a specific company (for call history)
export function useColdCallsByCompany(companyId: string | null) {
    return useQuery({
        queryKey: [...coldCallsKeys.all, 'company', companyId],
        queryFn: async () => {
            if (!DATABASE_ID || !COLDCALLS_COLLECTION_ID || !companyId) {
                return [];
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                COLDCALLS_COLLECTION_ID,
                [
                    Query.equal('company_id', companyId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(50)
                ]
            );

            const calls = response.documents as unknown as ColdCall[];

            // Enrich with company and transcript data
            return enrichColdCalls(calls);
        },
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
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
            // Invalidate cache service
            cacheService.invalidate(cacheKeys.coldCall(data.$id));
            cacheService.invalidatePattern('coldcalls:list:*');
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
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
            // Invalidate cache service
            cacheService.invalidate(cacheKeys.coldCall(id));
            cacheService.invalidatePattern('coldcalls:list:*');
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
        onSuccess: (ids) => {
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
            // Invalidate cache service
            ids.forEach(id => cacheService.invalidate(cacheKeys.coldCall(id)));
            cacheService.invalidatePattern('coldcalls:list:*');
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
        onSuccess: (ids) => {
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
            // Invalidate cache service
            ids.forEach(id => cacheService.invalidate(cacheKeys.coldCall(id)));
            cacheService.invalidatePattern('coldcalls:list:*');
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
        onSuccess: (ids) => {
            queryClient.invalidateQueries({ queryKey: coldCallsKeys.all });
            // Invalidate cache service
            ids.forEach(id => cacheService.invalidate(cacheKeys.coldCall(id)));
            cacheService.invalidatePattern('coldcalls:list:*');
        },
    });
}
