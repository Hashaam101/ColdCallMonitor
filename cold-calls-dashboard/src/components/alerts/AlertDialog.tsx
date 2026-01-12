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
import { Clock } from 'lucide-react';

interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    call: ColdCall | null;
}

// Time gap presets in minutes
const TIME_GAPS = [
    { label: 'In 5 min', minutes: 5 },
    { label: 'In 15 min', minutes: 15 },
    { label: 'In 30 min', minutes: 30 },
    { label: 'In 1 hour', minutes: 60 },
    { label: 'In 2 hours', minutes: 120 },
    { label: 'Tomorrow', minutes: 24 * 60 },
];

export function AlertDialog({ open, onOpenChange, call }: AlertDialogProps) {
    const { teamMember } = useAuth();
    const { data: teamMembers } = useTeamMembers();
    const createAlert = useCreateAlert();

    const [message, setMessage] = useState('');
    const [targetUserId, setTargetUserId] = useState('');
    const [alertTime, setAlertTime] = useState(''); // Empty = now/instant
    const [selectedGap, setSelectedGap] = useState<number | null>(null);

    useEffect(() => {
        if (open && teamMember) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTargetUserId(teamMember.$id);
            setMessage('');
            setAlertTime('');
            setSelectedGap(null);
        }
    }, [open, teamMember]);

    const handleGapSelect = (minutes: number) => {
        setSelectedGap(minutes);
        const futureTime = new Date(Date.now() + minutes * 60 * 1000);
        // Format for datetime-local input (YYYY-MM-DDTHH:mm) in LOCAL time
        const year = futureTime.getFullYear();
        const month = String(futureTime.getMonth() + 1).padStart(2, '0');
        const day = String(futureTime.getDate()).padStart(2, '0');
        const hours = String(futureTime.getHours()).padStart(2, '0');
        const mins = String(futureTime.getMinutes()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}T${hours}:${mins}`;
        setAlertTime(formatted);
    };

    const handleCustomTimeChange = (value: string) => {
        setAlertTime(value);
        setSelectedGap(null); // Clear gap selection when custom time is entered
    };

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

                    {/* Time Gap Presets */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                            <Clock className="h-4 w-4 inline mr-1" />
                            When
                        </Label>
                        <div className="col-span-3 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {TIME_GAPS.map((gap) => (
                                    <Button
                                        key={gap.minutes}
                                        type="button"
                                        variant={selectedGap === gap.minutes ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => handleGapSelect(gap.minutes)}
                                    >
                                        {gap.label}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">or custom:</span>
                                <Input
                                    id="time"
                                    type="datetime-local"
                                    className="flex-1"
                                    value={alertTime}
                                    onChange={(e) => handleCustomTimeChange(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {alertTime
                                    ? `Alert scheduled for ${new Date(alertTime).toLocaleString()}`
                                    : 'Leave empty for instant alert'
                                }
                            </p>
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

