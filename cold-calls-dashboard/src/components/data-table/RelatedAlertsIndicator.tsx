'use client';

import { useAlertsByEntity } from '@/hooks';
import { Bell } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RelatedAlertsIndicatorProps {
    entityId: string;
}

export function RelatedAlertsIndicator({ entityId }: RelatedAlertsIndicatorProps) {
    const { data: alerts } = useAlertsByEntity(entityId);

    if (!alerts || alerts.length === 0) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 cursor-help">
                        <Bell className="w-3 h-3" />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
