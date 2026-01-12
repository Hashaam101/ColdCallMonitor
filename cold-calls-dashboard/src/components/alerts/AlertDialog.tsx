'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useCreateAlert, useTeamMembers } from '@/hooks';
import { ColdCall } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    call: ColdCall | null;
}

export function AlertDialog({ open, onOpenChange, call }: AlertDialogProps) {
    const { teamMember } = useAuth();
    const { data: teamMembers } = useTeamMembers();
    const createAlert = useCreateAlert();

    const [message, setMessage] = useState('');
    const [targetUserId, setTargetUserId] = useState('');
    const [alertTime, setAlertTime] = useState(''); // Empty = now/instant

    useEffect(() => {
        if (open && teamMember) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTargetUserId(teamMember.$id);
            setMessage('');
            setAlertTime('');
        }
    }, [open, teamMember]);

    const handleSubmit = async () => {
        if (!call || !targetUserId) return;

        try {
            await createAlert.mutateAsync({
                target_user: targetUserId,
                entity_type: 'cold_call',
                entity_id: call.$id,
                entity_label: call.company_name || 'Unknown Company',
                alert_time: alertTime ? new Date(alertTime).toISOString() : undefined,
                message: message || `Follow up with ${call.company_name}`,
            });

            toast.success('Alert set successfully');
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to set alert');
        }
    };

    if (!call) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Set Alert</DialogTitle>
                    <DialogDescription>
                        Set a reminder for {call.company_name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="target" className="text-right">
                            Assign To
                        </Label>
                        <div className="col-span-3">
                            <Select value={targetUserId} onValueChange={setTargetUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teamMembers?.map((member) => (
                                        <SelectItem key={member.$id} value={member.$id}>
                                            {member.name} {member.$id === teamMember?.$id ? '(You)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">
                            When
                        </Label>
                        <Input
                            id="time"
                            type="datetime-local"
                            className="col-span-3"
                            value={alertTime}
                            onChange={(e) => setAlertTime(e.target.value)}
                        />
                        <div className="col-start-2 col-span-3">
                            <span className="text-xs text-muted-foreground">Leave empty for instant alert</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="message" className="text-right">
                            Message
                        </Label>
                        <textarea
                            id="message"
                            className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Reason for alert..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={createAlert.isPending}>
                        {createAlert.isPending ? 'Saving...' : 'Set Alert'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
