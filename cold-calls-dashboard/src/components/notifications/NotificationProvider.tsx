'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPrompt } from './NotificationPrompt';

/**
 * NotificationProvider
 * 
 * Wraps the app to provide notification functionality.
 * Shows permission prompt when needed and manages sound playback.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { showPermissionPrompt, requestPermission, dismissPrompt } = useNotifications();

    return (
        <>
            {children}
            {showPermissionPrompt && (
                <NotificationPrompt
                    onAllow={requestPermission}
                    onDismiss={dismissPrompt}
                />
            )}
        </>
    );
}
