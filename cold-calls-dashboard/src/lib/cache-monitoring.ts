/**
 * Cache Monitoring Utilities
 * 
 * Provides functions to monitor and debug cache performance.
 * Can be exposed in development environment for inspection.
 */

import { cacheService } from './cache-service';

export interface CacheMetrics {
    totalEntries: number;
    entriesByType: Record<string, number>;
    storageUsage: string;
    expiredEntries: number;
    entries: Array<{
        key: string;
        expiresIn: number;
        expiresAt: string;
        type: 'alerts' | 'coldcalls' | 'team' | 'company' | 'other';
    }>;
}

/**
 * Get detailed cache metrics
 */
export function getCacheMetrics(): CacheMetrics {
    const stats = cacheService.getStats();
    
    const entries = stats.entries.map(entry => {
        // Infer type from key
        let type: 'alerts' | 'coldcalls' | 'team' | 'company' | 'other' = 'other';
        if (entry.key.startsWith('alerts:')) type = 'alerts';
        else if (entry.key.startsWith('coldcalls:')) type = 'coldcalls';
        else if (entry.key.startsWith('team:')) type = 'team';
        else if (entry.key.startsWith('company:')) type = 'company';

        return {
            key: entry.key,
            expiresIn: entry.expiresIn,
            expiresAt: new Date(Date.now() + entry.expiresIn).toISOString(),
            type,
        };
    });

    const entriesByType: Record<string, number> = {
        alerts: 0,
        coldcalls: 0,
        team: 0,
        company: 0,
        other: 0,
    };

    entries.forEach(entry => {
        entriesByType[entry.type]++;
    });

    // Estimate storage usage
    const estimatedSize = entries.reduce((sum, entry) => sum + entry.key.length, 0);
    const storageUsage = estimatedSize > 1024 * 1024 
        ? `${(estimatedSize / (1024 * 1024)).toFixed(2)} MB`
        : estimatedSize > 1024 
        ? `${(estimatedSize / 1024).toFixed(2)} KB`
        : `${estimatedSize} bytes`;

    const expiredEntries = entries.filter(e => e.expiresIn <= 0).length;

    return {
        totalEntries: stats.size,
        entriesByType,
        storageUsage,
        expiredEntries,
        entries,
    };
}

/**
 * Format metrics for console output
 */
export function printCacheMetrics(): void {
    const metrics = getCacheMetrics();
    
    console.group('📦 Cache Metrics');
    console.log(`Total entries: ${metrics.totalEntries}`);
    console.log(`Estimated storage: ${metrics.storageUsage}`);
    console.log(`Expired entries: ${metrics.expiredEntries}`);
    console.table(metrics.entriesByType);
    
    console.group('Entries');
    const sortedEntries = [...metrics.entries].sort((a, b) => b.expiresIn - a.expiresIn);
    console.table(sortedEntries.slice(0, 20)); // Show top 20
    console.groupEnd();
    console.groupEnd();
}

/**
 * Log cache hit/miss ratio (requires instrumentation of cache-service)
 */
export interface CacheStats {
    hits: number;
    misses: number;
    ratio: number;
}

class CacheStatsTracker {
    private hits = 0;
    private misses = 0;

    recordHit() {
        this.hits++;
    }

    recordMiss() {
        this.misses++;
    }

    getStats(): CacheStats {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            ratio: total === 0 ? 0 : (this.hits / total) * 100,
        };
    }

    reset() {
        this.hits = 0;
        this.misses = 0;
    }

    print() {
        const stats = this.getStats();
        console.log(`🎯 Cache Hit Ratio: ${stats.ratio.toFixed(2)}% (${stats.hits} hits / ${stats.misses} misses)`);
    }
}

export const cacheStatsTracker = new CacheStatsTracker();

/**
 * Set up global cache inspection in development
 */
export function setupCacheInspection() {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        (window as any).__cacheDebug = {
            metrics: getCacheMetrics,
            print: printCacheMetrics,
            clear: () => cacheService.clear(),
            stats: () => cacheStatsTracker.getStats(),
            printStats: () => cacheStatsTracker.print(),
        };
        
        console.info(
            '🔍 Cache inspection available: window.__cacheDebug\n' +
            '  - metrics(): Get detailed cache metrics\n' +
            '  - print(): Print formatted metrics to console\n' +
            '  - clear(): Clear all cache\n' +
            '  - stats(): Get cache hit/miss ratio\n' +
            '  - printStats(): Print hit/miss ratio'
        );
    }
}

/**
 * Detect and warn about potentially inefficient queries
 */
export function detectCacheIssues(): string[] {
    const metrics = getCacheMetrics();
    const issues: string[] = [];

    // Warn if many alerts entries (might indicate memory leak)
    if (metrics.entriesByType.alerts > 10) {
        issues.push(`⚠️ High number of alert cache entries (${metrics.entriesByType.alerts})`);
    }

    // Warn if many cold call entries
    if (metrics.entriesByType.coldcalls > 10) {
        issues.push(`⚠️ High number of cold call cache entries (${metrics.entriesByType.coldcalls})`);
    }

    // Warn if expired entries accumulating
    if (metrics.expiredEntries > 5) {
        issues.push(`⚠️ ${metrics.expiredEntries} expired cache entries (consider clearing)`);
    }

    // Warn if cache getting large
    if (metrics.storageUsage.includes('KB') && parseFloat(metrics.storageUsage) > 500) {
        issues.push(`⚠️ Cache size is large (${metrics.storageUsage}), consider clearing`);
    }

    return issues;
}

/**
 * Auto-clean expired cache entries
 */
export function autoCleanExpiredCache(): number {
    const metrics = getCacheMetrics();
    let cleaned = 0;

    metrics.entries.forEach(entry => {
        if (entry.expiresIn <= 0) {
            cacheService.invalidate(entry.key);
            cleaned++;
        }
    });

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
}

// Auto-detect issues periodically in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    setInterval(() => {
        const issues = detectCacheIssues();
        if (issues.length > 0) {
            console.warn('Cache Issues Detected:');
            issues.forEach(issue => console.warn(issue));
        }
    }, 5 * 60 * 1000); // Check every 5 minutes
}
