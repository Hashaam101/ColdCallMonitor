/**
 * useNotifications Hook
 * 
 * Handles browser notifications with persistent sound for alerts.
 * - Requests notification permission
 * - Polls for due alerts and triggers notifications
 * - Plays sound on loop until tab is focused
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useAlerts } from './useAlerts';
import { client, DATABASE_ID, ALERTS_COLLECTION_ID } from '@/lib/appwrite';
import type { Alert } from '@/types';

type NotificationPermission = 'default' | 'granted' | 'denied';

export function useNotifications() {
    const { user } = useAuth();
    const { data: alerts } = useAlerts();
    const [permission, setPermission] = useState<NotificationPermission>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission as NotificationPermission;
        }
        return 'default'; // Default to 'default' if Notification API not available
    });
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const notifiedAlertsRef = useRef<Set<string>>(new Set());
    const isPlayingRef = useRef(false);

    // Check initial permission state
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            // Show prompt if permission not yet requested and user is logged in
            if (permission === 'default' && user && !showPermissionPrompt) { // Added !showPermissionPrompt // Use 'permission' from state, which is initialized
                const dismissed = localStorage.getItem('notification-prompt-dismissed');
                if (!dismissed) {
                    setTimeout(() => setShowPermissionPrompt(true), 0);
                }
            }
        }
    }, [user, permission, showPermissionPrompt]);

    // Request permission
    const requestPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return 'denied' as NotificationPermission;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            setShowPermissionPrompt(false);
            return result;
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return 'denied' as NotificationPermission;
        }
    }, []);

    // Dismiss permission prompt
    const dismissPrompt = useCallback(() => {
        setShowPermissionPrompt(false);
        localStorage.setItem('notification-prompt-dismissed', 'true');
    }, []);

    // Play notification sound on loop
    const playSound = useCallback(() => {
        if (isPlayingRef.current) return;

        if (!audioRef.current) {
            audioRef.current = new Audio('/sounds/alert.mp3');
            audioRef.current.loop = true;
        }

        audioRef.current.play().catch(err => {
            console.warn('Could not play notification sound:', err);
        });
        isPlayingRef.current = true;
    }, []);

    // Stop sound
    const stopSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        isPlayingRef.current = false;
    }, []);

    // Handle visibility change - stop sound when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                stopSound();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [stopSound]);

    // Show notification for due alerts
    const showNotification = useCallback((title: string, body: string, alertId: string) => {
        if (permission !== 'granted') return;
        if (notifiedAlertsRef.current.has(alertId)) return;

        notifiedAlertsRef.current.add(alertId);

        const notification = new Notification(title, {
            body,
            icon: '/favicon/favicon-96x96.png',
            badge: '/favicon/favicon-96x96.png',
            requireInteraction: true,
            tag: alertId,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            stopSound();
        };

        // Play sound if tab is not visible
        if (document.visibilityState !== 'visible') {
            playSound();
        }
    }, [permission, playSound, stopSound]);

    // Polling effect (existing) replaced by this combined effect or separate?
    // Let's keep separate effects for clarity.

    // Realtime subscription for NEW assignments
    useEffect(() => {
        if (!user || !DATABASE_ID || !ALERTS_COLLECTION_ID || permission !== 'granted') return;

        const channel = `databases.${DATABASE_ID}.collections.${ALERTS_COLLECTION_ID}.documents`;

        const unsubscribe = client.subscribe(channel, (response) => {
            const event = response.events[0];
            const payload = response.payload as Alert;

            // If new alert key created
            if (event.includes('.create')) {
                // If assigned to ME, but NOT created by ME (avoid double notify for self-set alerts)
                if (payload.target_user === user.$id && payload.created_by !== user.$id) {
                    showNotification(
                        'New Alert Assigned',
                        payload.message || 'You have been assigned a new alert',
                        payload.$id
                    );
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [user, permission, showNotification]);

    // Poll alerts and trigger notifications for due alerts
    useEffect(() => {
        if (!alerts || permission !== 'granted') return;

        const now = new Date();

        alerts.forEach(alert => {
            // Check if alert is due (no alert_time means instant, or alert_time <= now)
            const isDue = !alert.alert_time || new Date(alert.alert_time) <= now;

            if (isDue && !notifiedAlertsRef.current.has(alert.$id)) {
                showNotification(
                    `Alert: ${alert.entity_label || 'Follow-up Required'}`,
                    alert.message || 'You have a pending alert',
                    alert.$id
                );
            }
        });
    }, [alerts, permission, showNotification]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSound();
        };
    }, [stopSound]);

    return {
        permission,
        showPermissionPrompt,
        requestPermission,
        dismissPrompt,
        stopSound,
    };
}
