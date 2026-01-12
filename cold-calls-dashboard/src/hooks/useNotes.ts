/**
 * Notes Hook with CRUD operations and caching
 * 
 * Provides hooks for:
 * - Fetching notes (active, archived, deleted)
 * - Creating, updating, archiving, deleting notes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Query, ID } from 'appwrite';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Notes collection ID - default to 'notes' if not set in environment
const NOTES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID || 'notes';

export interface Note {
    $id: string;
    title: string;
    note_text: string;
    created_by: string;
    last_edited_by?: string;
    is_archived: boolean;
    is_deleted: boolean;
    deleted_at?: string;
    $createdAt: string;
    $updatedAt: string;
}

// Query key factory
export const notesKeys = {
    all: ['notes'] as const,
    lists: () => [...notesKeys.all, 'list'] as const,
    active: () => [...notesKeys.lists(), 'active'] as const,
    archived: () => [...notesKeys.lists(), 'archived'] as const,
    deleted: () => [...notesKeys.lists(), 'deleted'] as const,
};

// Fetch active notes (not archived, not deleted)
export function useActiveNotes() {
    return useQuery({
        queryKey: notesKeys.active(),
        queryFn: async () => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID) {
                return [];
            }

            try {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    NOTES_COLLECTION_ID,
                    [
                        Query.equal('is_deleted', false),
                        Query.equal('is_archived', false),
                        Query.orderDesc('$createdAt'),
                        Query.limit(100),
                    ]
                );

                return response.documents as unknown as Note[];
            } catch (error) {
                console.error('Error fetching active notes:', error);
                return [];
            }
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Fetch archived notes
export function useArchivedNotes() {
    return useQuery({
        queryKey: notesKeys.archived(),
        queryFn: async () => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID) {
                return [];
            }

            try {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    NOTES_COLLECTION_ID,
                    [
                        Query.equal('is_archived', true),
                        Query.equal('is_deleted', false),
                        Query.orderDesc('$createdAt'),
                        Query.limit(100),
                    ]
                );

                return response.documents as unknown as Note[];
            } catch (error) {
                console.error('Error fetching archived notes:', error);
                return [];
            }
        },
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

// Fetch deleted notes (recycle bin)
export function useDeletedNotes() {
    return useQuery({
        queryKey: notesKeys.deleted(),
        queryFn: async () => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID) {
                return [];
            }

            try {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    NOTES_COLLECTION_ID,
                    [
                        Query.equal('is_deleted', true),
                        Query.orderDesc('deleted_at'),
                        Query.limit(100),
                    ]
                );

                return response.documents as unknown as Note[];
            } catch (error) {
                console.error('Error fetching deleted notes:', error);
                return [];
            }
        },
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

// Create a new note
export function useCreateNote() {
    const queryClient = useQueryClient();
    const { teamMember } = useAuth();

    return useMutation({
        mutationFn: async (data: { title: string; note_text: string }) => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID || !teamMember) {
                throw new Error('Configuration missing or not authenticated');
            }

            const note = await databases.createDocument(
                DATABASE_ID,
                NOTES_COLLECTION_ID,
                ID.unique(),
                {
                    title: data.title,
                    note_text: data.note_text,
                    created_by: teamMember.$id,
                    is_archived: false,
                    is_deleted: false,
                }
            );

            return note as unknown as Note;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
            toast.success('Note created');
        },
        onError: (error) => {
            console.error('Error creating note:', error);
            toast.error('Failed to create note');
        },
    });
}

// Update a note
export function useUpdateNote() {
    const queryClient = useQueryClient();
    const { teamMember } = useAuth();

    return useMutation({
        mutationFn: async ({ noteId, data }: { noteId: string; data: { title: string; note_text: string } }) => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID || !teamMember) {
                throw new Error('Configuration missing or not authenticated');
            }

            const note = await databases.updateDocument(
                DATABASE_ID,
                NOTES_COLLECTION_ID,
                noteId,
                {
                    title: data.title,
                    note_text: data.note_text,
                    last_edited_by: teamMember.$id,
                }
            );

            return note as unknown as Note;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
            toast.success('Note updated');
        },
        onError: (error) => {
            console.error('Error updating note:', error);
            toast.error('Failed to update note');
        },
    });
}

// Archive a note
export function useArchiveNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (noteId: string) => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID) {
                throw new Error('Configuration missing');
            }

            await databases.updateDocument(
                DATABASE_ID,
                NOTES_COLLECTION_ID,
                noteId,
                { is_archived: true }
            );

            return noteId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
            toast.success('Note archived');
        },
        onError: (error) => {
            console.error('Error archiving note:', error);
            toast.error('Failed to archive note');
        },
    });
}

// Unarchive a note
export function useUnarchiveNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (noteId: string) => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID) {
                throw new Error('Configuration missing');
            }

            await databases.updateDocument(
                DATABASE_ID,
                NOTES_COLLECTION_ID,
                noteId,
                { is_archived: false }
            );

            return noteId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
            toast.success('Note unarchived');
        },
        onError: (error) => {
            console.error('Error unarchiving note:', error);
            toast.error('Failed to unarchive note');
        },
    });
}

// Soft delete a note (move to recycle bin)
export function useDeleteNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (noteId: string) => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID) {
                throw new Error('Configuration missing');
            }

            await databases.updateDocument(
                DATABASE_ID,
                NOTES_COLLECTION_ID,
                noteId,
                {
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                }
            );

            return noteId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
            toast.success('Note moved to recycle bin');
        },
        onError: (error) => {
            console.error('Error deleting note:', error);
            toast.error('Failed to delete note');
        },
    });
}

// Restore a note from recycle bin
export function useRestoreNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (noteId: string) => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID) {
                throw new Error('Configuration missing');
            }

            await databases.updateDocument(
                DATABASE_ID,
                NOTES_COLLECTION_ID,
                noteId,
                {
                    is_deleted: false,
                    deleted_at: null,
                }
            );

            return noteId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
            toast.success('Note restored');
        },
        onError: (error) => {
            console.error('Error restoring note:', error);
            toast.error('Failed to restore note');
        },
    });
}

// Permanently delete a note
export function usePermanentlyDeleteNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (noteId: string) => {
            if (!DATABASE_ID || !NOTES_COLLECTION_ID) {
                throw new Error('Configuration missing');
            }

            await databases.deleteDocument(DATABASE_ID, NOTES_COLLECTION_ID, noteId);

            return noteId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
            toast.success('Note permanently deleted');
        },
        onError: (error) => {
            console.error('Error permanently deleting note:', error);
            toast.error('Failed to permanently delete note');
        },
    });
}
