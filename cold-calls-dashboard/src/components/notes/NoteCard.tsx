'use client';

import { useState } from 'react';
import { Copy, Edit, Archive, Trash2, Undo2, ArchiveRestore, AlertTriangle, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTeamMemberName } from '@/hooks';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

interface NoteCardProps {
    note: Note;
    view: 'active' | 'archived' | 'deleted';
    onEdit?: (note: Note) => void;
    onArchive?: (noteId: string) => void;
    onUnarchive?: (noteId: string) => void;
    onDelete?: (noteId: string) => void;
    onRestore?: (noteId: string) => void;
    onPermanentDelete?: (noteId: string) => void;
    onCreateAlert?: (noteId: string) => void;
}

export function NoteCard({
    note,
    view,
    onEdit,
    onArchive,
    onUnarchive,
    onDelete,
    onRestore,
    onPermanentDelete,
    onCreateAlert,
}: NoteCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate = note.note_text.length > 200;
    const displayText = isExpanded || !shouldTruncate
        ? note.note_text
        : note.note_text.substring(0, 200) + '...';

    const createdByName = useTeamMemberName(note.created_by);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(note.note_text);
            toast.success('Note copied to clipboard');
        } catch {
            toast.error('Failed to copy note');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <Card className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold line-clamp-1">
                        {note.title}
                    </CardTitle>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleCopy}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {view === 'active' && (
                                    <>
                                        <DropdownMenuItem onClick={() => onEdit?.(note)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleCopy}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onCreateAlert?.(note.$id)}>
                                            <AlertTriangle className="h-4 w-4 mr-2" />
                                            Create Alert
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onArchive?.(note.$id)}>
                                            <Archive className="h-4 w-4 mr-2" />
                                            Archive
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onDelete?.(note.$id)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {view === 'archived' && (
                                    <>
                                        <DropdownMenuItem onClick={() => onUnarchive?.(note.$id)}>
                                            <ArchiveRestore className="h-4 w-4 mr-2" />
                                            Unarchive
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleCopy}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete?.(note.$id)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {view === 'deleted' && (
                                    <>
                                        <DropdownMenuItem onClick={() => onRestore?.(note.$id)}>
                                            <Undo2 className="h-4 w-4 mr-2" />
                                            Restore
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleCopy}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onPermanentDelete?.(note.$id)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Permanently
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p
                    className={cn(
                        "text-sm text-muted-foreground whitespace-pre-wrap",
                        shouldTruncate && !isExpanded && "cursor-pointer hover:text-foreground transition-colors"
                    )}
                    onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
                >
                    {displayText}
                </p>
                {shouldTruncate && (
                    <Button
                        variant="link"
                        size="sm"
                        className="px-0 h-auto text-xs mt-1"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? 'Show less' : 'Show more'}
                    </Button>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                    Created {createdByName ? `by ${createdByName} ` : ''}on {formatDate(note.$createdAt)}
                    {note.$updatedAt !== note.$createdAt && (
                        <span> · Edited {formatDate(note.$updatedAt)}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
