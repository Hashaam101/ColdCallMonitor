/**
 * Team Members Hook
 * 
 * React Query hooks for fetching team members.
 */

import { useQuery } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { databases, DATABASE_ID, TEAM_MEMBERS_COLLECTION_ID } from '@/lib/appwrite';
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

            const response = await databases.listDocuments(
                DATABASE_ID,
                TEAM_MEMBERS_COLLECTION_ID,
                [Query.orderAsc('name'), Query.limit(100)]
            );

            return response.documents as unknown as TeamMember[];
        },
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

            const document = await databases.getDocument(
                DATABASE_ID,
                TEAM_MEMBERS_COLLECTION_ID,
                id
            );

            return document as unknown as TeamMember;
        },
        enabled: !!id,
    });
}

// Helper to get team member name by ID
export function useTeamMemberName(id: string | null | undefined) {
    const { data: members } = useTeamMembers();

    if (!id || !members) return null;

    const member = members.find(m => m.$id === id);
    return member?.name || null;
}
