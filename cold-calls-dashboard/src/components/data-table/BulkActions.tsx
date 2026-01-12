'use client';

import { useState } from 'react';
import { ColdCall, CALL_OUTCOMES } from '@/types';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { X, Trash2, Download, UserPlus, PhoneIncoming } from 'lucide-react';
import { useDeleteColdCalls, useBulkClaimColdCalls, useBulkUpdateOutcome } from '@/hooks';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

interface BulkActionsProps {
    selectedIds: string[];
    selectedCalls: ColdCall[];
    onClearSelection: () => void;
}

export function BulkActions({ selectedIds, selectedCalls, onClearSelection }: BulkActionsProps) {
    const { teamMember } = useAuth();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Hooks
    const deleteCalls = useDeleteColdCalls();
    const claimCalls = useBulkClaimColdCalls();
    const updateOutcome = useBulkUpdateOutcome();

    const handleDelete = async () => {
        try {
            await deleteCalls.mutateAsync(selectedIds);
            toast.success(`Deleted ${selectedIds.length} calls`);
            onClearSelection();
            setIsDeleteDialogOpen(false);
        } catch (error) {
            toast.error('Failed to delete calls');
            console.error(error);
        }
    };

    const handleClaim = async (claim: boolean) => {
        if (!teamMember) return;
        try {
            await claimCalls.mutateAsync({
                ids: selectedIds,
                claimedBy: claim ? teamMember.$id : null
            });
            toast.success(claim ? 'Calls claimed' : 'Calls unclaimed');
            onClearSelection();
        } catch (error) {
            toast.error('Failed to update claim status');
            console.error(error);
        }
    };

    const handleChangeOutcome = async (outcome: string) => {
        try {
            await updateOutcome.mutateAsync({
                ids: selectedIds,
                outcome
            });
            toast.success(`Updated outcome to ${outcome}`);
            onClearSelection();
        } catch (error) {
            toast.error('Failed to update outcome');
            console.error(error);
        }
    };

    const handleExport = () => {
        const headers = ['Company', 'Recipients', 'Outcome', 'Location', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...selectedCalls.map(call => [
                `"${(call.company_name || '').replace(/"/g, '""')}"`,
                `"${(call.recipients || '').replace(/"/g, '""')}"`,
                `"${(call.call_outcome || '').replace(/"/g, '""')}"`,
                `"${(call.company_location || '').replace(/"/g, '""')}"`,
                `"${new Date(call.$createdAt).toISOString()}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `cold_calls_export_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                    {selectedIds.length} selected
                </span>
                <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear selection</span>
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <PhoneIncoming className="mr-2 h-4 w-4" />
                            Set Outcome
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {CALL_OUTCOMES.map((outcome) => (
                            <DropdownMenuItem key={outcome} onClick={() => handleChangeOutcome(outcome)}>
                                {outcome}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assignment
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleClaim(true)}>
                            Claim Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClaim(false)}>
                            Unclaim Selected
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </Button>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {selectedIds.length} calls?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the selected call records.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
