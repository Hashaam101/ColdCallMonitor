/**
 * Cache Service for Appwrite Data
 * 
 * Implements multi-layer caching strategy to minimize Appwrite API calls:
 * 1. Memory cache (in-memory object)
 * 2. LocalStorage cache (persistent across sessions)
 * 3. React Query cache (handled by @tanstack/react-query)
 * 
 * This significantly reduces database reads and bandwidth usage on Appwrite's free plan.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

interface CacheConfig {
    ttl: number; // Time to live in milliseconds
    persistToStorage?: boolean; // Persist to localStorage
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes default
    persistToStorage: true,
};

class CacheService {
    private memoryCache = new Map<string, CacheEntry<any>>();
    private readonly storagePrefix = 'cache:';

    /**
     * Get cached data
     */
    get<T>(key: string): T | null {
        // Check memory cache first
        const memEntry = this.memoryCache.get(key);
        if (memEntry && !this.isExpired(memEntry)) {
            return memEntry.data as T;
        }

        // Check localStorage if memory cache miss
        const stored = this.getFromStorage<T>(key);
        if (stored && !this.isExpired(stored)) {
            // Restore to memory cache
            this.memoryCache.set(key, stored);
            return stored.data;
        }

        // Clear expired entries
        this.memoryCache.delete(key);
        this.removeFromStorage(key);
        return null;
    }

    /**
     * Set cache data
     */
    set<T>(key: string, data: T, config: Partial<CacheConfig> = {}): void {
        const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
        const now = Date.now();
        const entry: CacheEntry<T> = {
            data,
            timestamp: now,
            expiresAt: now + finalConfig.ttl,
        };

        // Store in memory
        this.memoryCache.set(key, entry);

        // Store in localStorage if enabled
        if (finalConfig.persistToStorage) {
            try {
                localStorage.setItem(
                    this.storagePrefix + key,
                    JSON.stringify(entry)
                );
            } catch (e) {
                // Gracefully handle localStorage quota exceeded
                console.warn('Failed to persist cache to localStorage:', e);
            }
        }
    }

    /**
     * Invalidate specific cache entry
     */
    invalidate(key: string): void {
        this.memoryCache.delete(key);
        this.removeFromStorage(key);
    }

    /**
     * Invalidate by pattern (e.g., "coldcalls:*")
     */
    invalidatePattern(pattern: string): void {
        const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);

        // Clear from memory
        for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
                this.memoryCache.delete(key);
            }
        }

        // Clear from storage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.storagePrefix)) {
                const cacheKey = key.substring(this.storagePrefix.length);
                if (regex.test(cacheKey)) {
                    localStorage.removeItem(key);
                }
            }
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.memoryCache.clear();

        // Clear localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.storagePrefix)) {
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * Get cache stats (for debugging)
     */
    getStats(): { size: number; entries: Array<{ key: string; expiresIn: number }> } {
        const entries = Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
            key,
            expiresIn: Math.max(0, entry.expiresAt - Date.now()),
        }));

        return {
            size: this.memoryCache.size,
            entries,
        };
    }

    // Private helpers
    private isExpired(entry: CacheEntry<any>): boolean {
        return Date.now() > entry.expiresAt;
    }

    private getFromStorage<T>(key: string): CacheEntry<T> | null {
        try {
            const stored = localStorage.getItem(this.storagePrefix + key);
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    }

    private removeFromStorage(key: string): void {
        try {
            localStorage.removeItem(this.storagePrefix + key);
        } catch (e) {
            // Ignore errors
        }
    }
}

// Export singleton instance
export const cacheService = new CacheService();

/**
 * Cache key builders for consistent naming
 */
export const cacheKeys = {
    // Cold calls
    coldCalls: (filters?: any, sort?: any) =>
        `coldcalls:list:${JSON.stringify({ filters, sort }).substring(0, 50)}`,
    coldCall: (id: string) => `coldcalls:detail:${id}`,
    coldCallsStats: () => 'coldcalls:stats',

    // Alerts
    alerts: (userId: string) => `alerts:user:${userId}`,
    alertsUnread: (userId: string) => `alerts:unread:${userId}`,
    alertsByEntity: (entityId: string) => `alerts:entity:${entityId}`,

    // Team members
    teamMembers: () => 'team:members:list',
    teamMember: (id: string) => `team:member:${id}`,

    // Companies
    companies: () => 'companies:list',
    company: (id: string) => `company:${id}`,

    // Transcripts
    transcript: (callId: string) => `transcript:${callId}`,
};

/**
 * Cache TTL presets for different data types
 * Shorter TTLs for frequently changing data, longer for static data
 */
export const cacheTTL = {
    SHORT: 2 * 60 * 1000, // 2 minutes - for frequently changing data (alerts, calls)
    MEDIUM: 10 * 60 * 1000, // 10 minutes - for moderately changing data
    LONG: 60 * 60 * 1000, // 1 hour - for stable data (team members, companies)
    VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours - for rarely changing data (static info)
};
