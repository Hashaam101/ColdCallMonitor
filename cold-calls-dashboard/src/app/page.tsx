'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DataTable } from '@/components/data-table/DataTable';
import { useRealtime, useUnreadAlertCount } from '@/hooks';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';


export default function DashboardPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const unreadAlerts = useUnreadAlertCount();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Set up real-time subscriptions
    useRealtime();

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // ? - Show keyboard shortcuts
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
            }

            // Escape - Close dialogs
            if (e.key === 'Escape') {
                setShowShortcuts(false);
            }

            // Ctrl/Cmd + B - Toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                setSidebarCollapsed(prev => !prev);
            }

            // G then H - Go home (dashboard)
            if (e.key === 'g') {
                const handleSecondKey = (e2: KeyboardEvent) => {
                    if (e2.key === 'h') {
                        router.push('/');
                    }
                    document.removeEventListener('keydown', handleSecondKey);
                };
                setTimeout(() => {
                    document.removeEventListener('keydown', handleSecondKey);
                }, 1000);
                document.addEventListener('keydown', handleSecondKey);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [router]);

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
        return null; // Will redirect
    }

    const shortcuts = [
        { keys: ['?'], description: 'Show keyboard shortcuts' },
        { keys: ['Ctrl', 'B'], description: 'Toggle sidebar' },
        { keys: ['G', 'H'], description: 'Go to home' },
        { keys: ['Esc'], description: 'Close dialogs' },
    ];

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <Sidebar
                unreadAlerts={unreadAlerts}
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-[1800px] mx-auto">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Cold Calls</h1>
                                <p className="text-muted-foreground">
                                    View and manage your team&apos;s cold call data
                                </p>
                            </div>
                            <button
                                onClick={() => setShowShortcuts(true)}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                            >
                                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd>
                                Shortcuts
                            </button>
                        </div>
                        <DataTable />
                    </div>
                </main>
            </div>

            {/* Keyboard Shortcuts Dialog */}
            <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Keyboard Shortcuts</DialogTitle>
                        <DialogDescription>
                            Quick shortcuts to navigate the dashboard
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        {shortcuts.map((shortcut, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                                <div className="flex items-center gap-1">
                                    {shortcut.keys.map((key, j) => (
                                        <span key={j}>
                                            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono border border-border">
                                                {key}
                                            </kbd>
                                            {j < shortcut.keys.length - 1 && (
                                                <span className="mx-1 text-muted-foreground">+</span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
