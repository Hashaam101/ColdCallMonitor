'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Note {
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

interface NoteEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    note?: Note | null;
    onSave: (data: { title: string; note_text: string }) => Promise<void>;
}

export function NoteEditor({ open, onOpenChange, note, onSave }: NoteEditorProps) {
    const [title, setTitle] = useState('');
    const [noteText, setNoteText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isEdit = !!note;

    useEffect(() => {
        if (open && note) {
            setTitle(note.title);
            setNoteText(note.note_text);
        } else if (open && !note) {
            setTitle('');
            setNoteText('');
        }
    }, [open, note]);

    const handleSave = async () => {
        if (!title.trim() || !noteText.trim()) return;

        setIsSaving(true);
        try {
            await onSave({ title: title.trim(), note_text: noteText.trim() });
            onOpenChange(false);
            setTitle('');
            setNoteText('');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Note' : 'Create Note'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Make changes to your note here.'
                            : 'Add a new note to your collection.'
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4" onKeyDown={handleKeyDown}>
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="Note title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="note_text">Content</Label>
                        <Textarea
                            id="note_text"
                            placeholder="Write your note here..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="min-h-[200px] resize-y"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !title.trim() || !noteText.trim()}
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Note'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
