'use client';

import { useAlertsByEntity } from '@/hooks';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AlertBellButtonProps {
    entityId: string;
    onClick: () => void;
}

/**
 * AlertBellButton
 * 
 * A bell icon button that changes color based on alert status:
 * - Dim/faded (text-muted-foreground/50): No alerts set
 * - Bright white (text-foreground): Has upcoming alert(s)
 * - Red (text-red-500): Has triggered/due alert(s)
 */
export function AlertBellButton({ entityId, onClick }: AlertBellButtonProps) {
    const { data: alerts } = useAlertsByEntity(entityId);

    // Determine alert state
    const hasAlerts = alerts && alerts.length > 0;
    const now = new Date();

    const hasTriggeredAlert = alerts?.some(a => !a.alert_time || new Date(a.alert_time) <= now);
    const hasUpcomingAlert = alerts?.some(a => a.alert_time && new Date(a.alert_time) > now);

    // Determine icon styling
    let iconClass = 'text-muted-foreground/50 hover:text-foreground'; // No alerts - dim
    let tooltipText = 'Set Alert';

    if (hasTriggeredAlert) {
        iconClass = 'text-red-500 hover:text-red-400'; // Triggered - red
        tooltipText = `${alerts?.filter(a => !a.alert_time || new Date(a.alert_time) <= now).length} alert(s) due`;
    } else if (hasUpcomingAlert) {
        iconClass = 'text-foreground hover:text-foreground/80'; // Upcoming - bright white
        tooltipText = `${alerts?.filter(a => a.alert_time && new Date(a.alert_time) > now).length} upcoming alert(s)`;
    }

    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClick}
                    className={cn('h-8 w-8 transition-colors', iconClass)}
                >
                    <Bell className={cn(
                        'h-4 w-4',
                        hasTriggeredAlert && 'animate-pulse'
                    )} />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {tooltipText}
                {hasAlerts && (
                    <span className="block text-xs text-muted-foreground">
                        Click to add more
                    </span>
                )}
            </TooltipContent>
        </Tooltip>
    );
}
