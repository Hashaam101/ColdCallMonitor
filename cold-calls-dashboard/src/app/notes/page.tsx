'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, StickyNote, Archive, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUnreadAlertCount } from '@/hooks';
import {
    useActiveNotes,
    useArchivedNotes,
    useDeletedNotes,
    useCreateNote,
    useUpdateNote,
    useArchiveNote,
    useUnarchiveNote,
    useDeleteNote,
    useRestoreNote,
    usePermanentlyDeleteNote,
    type Note,
} from '@/hooks/useNotes';

export default function NotesPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const unreadAlerts = useUnreadAlertCount();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'deleted'>('active');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    // Fetch notes
    const { data: activeNotes = [], isLoading: loadingActive } = useActiveNotes();
    const { data: archivedNotes = [], isLoading: loadingArchived } = useArchivedNotes();
    const { data: deletedNotes = [], isLoading: loadingDeleted } = useDeletedNotes();

    // Mutations
    const createNote = useCreateNote();
    const updateNote = useUpdateNote();
    const archiveNote = useArchiveNote();
    const unarchiveNote = useUnarchiveNote();
    const deleteNote = useDeleteNote();
    const restoreNote = useRestoreNote();
    const permanentlyDeleteNote = usePermanentlyDeleteNote();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const handleCreateNote = () => {
        setEditingNote(null);
        setEditorOpen(true);
    };

    const handleEditNote = (note: Note) => {
        setEditingNote(note);
        setEditorOpen(true);
    };

    const handleSaveNote = async (data: { title: string; note_text: string }) => {
        if (editingNote) {
            await updateNote.mutateAsync({ noteId: editingNote.$id, data });
        } else {
            await createNote.mutateAsync(data);
        }
    };

    const handleCreateAlert = (noteId: string) => {
        // Navigate to alerts page with noteId context
        router.push(`/alerts?noteId=${noteId}`);
    };

    const isLoading = loadingActive || loadingArchived || loadingDeleted;



    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar
                unreadAlerts={unreadAlerts}
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Header */}
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Notes</h1>
                                <p className="text-muted-foreground">
                                    Manage your team&apos;s notes and important information
                                </p>
                            </div>
                            <Button onClick={handleCreateNote}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Note
                            </Button>
                        </div>

                        {/* Tabs */}
                        <Tabs
                            value={activeTab}
                            onValueChange={(v) => setActiveTab(v as 'active' | 'archived' | 'deleted')}
                            className="space-y-4"
                        >
                            <TabsList>
                                <TabsTrigger value="active" className="gap-2">
                                    <StickyNote className="h-4 w-4" />
                                    Active
                                    {activeNotes.length > 0 && (
                                        <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                                            {activeNotes.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="archived" className="gap-2">
                                    <Archive className="h-4 w-4" />
                                    Archived
                                    {archivedNotes.length > 0 && (
                                        <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                                            {archivedNotes.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="deleted" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Recycle Bin
                                    {deletedNotes.length > 0 && (
                                        <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                                            {deletedNotes.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="active" className="space-y-0">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : activeNotes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <StickyNote className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                        <h3 className="text-lg font-medium">No notes yet</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Create your first note to get started
                                        </p>
                                        <Button onClick={handleCreateNote}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Note
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {activeNotes.map((note) => (
                                            <NoteCard
                                                key={note.$id}
                                                note={note}
                                                view="active"
                                                onEdit={handleEditNote}
                                                onArchive={(id) => archiveNote.mutate(id)}
                                                onDelete={(id) => deleteNote.mutate(id)}
                                                onCreateAlert={handleCreateAlert}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="archived" className="space-y-0">
                                {archivedNotes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                        <h3 className="text-lg font-medium">No archived notes</h3>
                                        <p className="text-muted-foreground">
                                            Archived notes will appear here
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {archivedNotes.map((note) => (
                                            <NoteCard
                                                key={note.$id}
                                                note={note}
                                                view="archived"
                                                onUnarchive={(id) => unarchiveNote.mutate(id)}
                                                onDelete={(id) => deleteNote.mutate(id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="deleted" className="space-y-0">
                                {deletedNotes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                        <h3 className="text-lg font-medium">Recycle bin is empty</h3>
                                        <p className="text-muted-foreground">
                                            Deleted notes will appear here for recovery
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {deletedNotes.map((note) => (
                                            <NoteCard
                                                key={note.$id}
                                                note={note}
                                                view="deleted"
                                                onRestore={(id) => restoreNote.mutate(id)}
                                                onPermanentDelete={(id) => permanentlyDeleteNote.mutate(id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
            </div>

            {/* Note Editor Modal */}
            <NoteEditor
                open={editorOpen}
                onOpenChange={setEditorOpen}
                note={editingNote}
                onSave={handleSaveNote}
            />
        </div>
    );
}
