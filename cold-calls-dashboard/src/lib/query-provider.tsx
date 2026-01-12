'use client';

/**
 * React Query Provider with Optimized Caching
 * 
 * Configured to minimize Appwrite API calls:
 * - Longer stale times to reduce refetches
 * - Increased gcTime (previously cacheTime) for persistence
 * - Disabled automatic refetches on window focus
 * - Different configs for different query types
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
                        gcTime: 1000 * 60 * 60, // 1 hour - keep cached data for longer
                        refetchOnWindowFocus: false, // Don't refetch when window regains focus
                        refetchOnReconnect: true, // Only refetch if data is stale
                        refetchOnMount: true, // Only refetch if data is stale
                        retry: 1, // Reduce retry attempts
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
                    },
                    mutations: {
                        retry: 1,
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
