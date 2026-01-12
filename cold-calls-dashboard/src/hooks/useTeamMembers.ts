/**
 * Team Members Hook with Optimized Caching
 * 
 * Minimizes database reads by:
 * - Using longer stale times (team members change rarely)
 * - Persistent caching with 1-hour TTL
 * - Only refetching when explicitly invalidated
 */

import { useQuery } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { databases, DATABASE_ID, TEAM_MEMBERS_COLLECTION_ID } from '@/lib/appwrite';
import { cacheService, cacheKeys, cacheTTL } from '@/lib/cache-service';
import { useAuth } from '@/lib/auth';
import type { TeamMember } from '@/types';

// Query key factory
export const teamMembersKeys = {
    all: ['teamMembers'] as const,
    lists: () => [...teamMembersKeys.all, 'list'] as const,
    details: () => [...teamMembersKeys.all, 'detail'] as const,
    detail: (id: string) => [...teamMembersKeys.details(), id] as const,
};

// Fetch all team members
export function useTeamMembers() {
    return useQuery({
        queryKey: teamMembersKeys.lists(),
        queryFn: async () => {
            if (!DATABASE_ID || !TEAM_MEMBERS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            // Check cache first - team members rarely change
            const cacheKey = cacheKeys.teamMembers();
            const cached = cacheService.get<TeamMember[]>(cacheKey);
            if (cached) {
                return cached;
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                TEAM_MEMBERS_COLLECTION_ID,
                [Query.orderAsc('name'), Query.limit(100)]
            );

            const members = response.documents as unknown as TeamMember[];

            // Cache with long TTL - team members change rarely
            cacheService.set(cacheKey, members, { ttl: cacheTTL.LONG });

            return members;
        },
        staleTime: 30 * 60 * 1000, // 30 minutes - team members change rarely
        gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
    });
}

// Get current user's team member record
export function useCurrentMember() {
    const { teamMember } = useAuth();
    return teamMember;
}

// Fetch a single team member
export function useTeamMember(id: string) {
    return useQuery({
        queryKey: teamMembersKeys.detail(id),
        queryFn: async () => {
            if (!DATABASE_ID || !TEAM_MEMBERS_COLLECTION_ID) {
                throw new Error('Database configuration missing');
            }

            // Check cache first
            const cacheKey = cacheKeys.teamMember(id);
            const cached = cacheService.get<TeamMember>(cacheKey);
            if (cached) {
                return cached;
            }

            const document = await databases.getDocument(
                DATABASE_ID,
                TEAM_MEMBERS_COLLECTION_ID,
                id
            );

            const member = document as unknown as TeamMember;

            // Cache with long TTL
            cacheService.set(cacheKey, member, { ttl: cacheTTL.LONG });

            return member;
        },
        enabled: !!id,
        staleTime: 30 * 60 * 1000, // 30 minutes
        gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
    });
}

// Helper to get team member name by ID
export function useTeamMemberName(id: string | null | undefined) {
    const { data: members } = useTeamMembers();

    if (!id || !members) return null;

    const member = members.find(m => m.$id === id);
    return member?.name || null;
}
