'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAlerts, useDismissAlert, useDeleteAlert, useUnreadAlertCount } from '@/hooks';
import { useRealtime } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Bell,
    Check,
    MoreVertical,
    Clock,
    Calendar,
    User,
    Building2,
} from 'lucide-react';
import type { Alert } from '@/types';

export default function AlertsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const unreadAlerts = useUnreadAlertCount();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [alertToDelete, setAlertToDelete] = useState<Alert | null>(null);

    const { data: alerts, isLoading } = useAlerts();
    const dismissAlert = useDismissAlert();
    const deleteAlert = useDeleteAlert();

    // Set up real-time subscriptions
    useRealtime();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const handleDismiss = async (alertId: string) => {
        try {
            await dismissAlert.mutateAsync(alertId);
            toast.success('Alert dismissed');
        } catch (error) {
            toast.error('Failed to dismiss alert');
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!alertToDelete) return;
        try {
            await deleteAlert.mutateAsync(alertToDelete.$id);
            toast.success('Alert deleted');
            setDeleteDialogOpen(false);
            setAlertToDelete(null);
        } catch (error) {
            toast.error('Failed to delete alert');
            console.error(error);
        }
    };

    const confirmDelete = (alert: Alert) => {
        setAlertToDelete(alert);
        setDeleteDialogOpen(true);
    };

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
        return null;
    }

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
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Bell className="h-6 w-6" />
                                Alerts
                            </h1>
                            <p className="text-muted-foreground">
                                Manage your reminders and notifications
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold">{alerts?.length || 0}</div>
                                    <div className="text-xs text-muted-foreground">Total Active</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold">
                                        {alerts?.filter(a => !a.alert_time || new Date(a.alert_time) <= new Date()).length || 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Due Now</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold">
                                        {alerts?.filter(a => a.alert_time && new Date(a.alert_time) > new Date()).length || 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Scheduled</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-primary">
                                        {unreadAlerts}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Need Action</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Alerts List */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Active Alerts</CardTitle>
                                <CardDescription>
                                    Your pending reminders and follow-ups
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[500px]">
                                    {isLoading ? (
                                        <div className="p-4 space-y-4">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-1/3" />
                                                        <Skeleton className="h-3 w-2/3" />
                                                        <Skeleton className="h-3 w-1/4" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : !alerts || alerts.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground">
                                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <h3 className="text-lg font-medium mb-1">No active alerts</h3>
                                            <p className="text-sm">
                                                Set alerts on cold calls to receive reminders
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {alerts.map((alert) => {
                                                const isDue = !alert.alert_time || new Date(alert.alert_time) <= new Date();
                                                return (
                                                    <div
                                                        key={alert.$id}
                                                        className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors ${isDue ? 'bg-primary/5' : ''
                                                            }`}
                                                    >
                                                        {/* Icon */}
                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDue ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                                            }`}>
                                                            <Building2 className="h-5 w-5" />
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-medium truncate">{alert.entity_label}</h4>
                                                                {isDue && (
                                                                    <Badge variant="default" className="text-[10px]">
                                                                        Due
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {alert.message && (
                                                                <p className="text-sm text-muted-foreground mb-2">
                                                                    {alert.message}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                {alert.alert_time ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {format(new Date(alert.alert_time), 'PPp')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        Instant alert
                                                                    </span>
                                                                )}
                                                                <span className="flex items-center gap-1">
                                                                    <User className="h-3 w-3" />
                                                                    Created {format(new Date(alert.$createdAt), 'MMM d')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDismiss(alert.$id)}
                                                                disabled={dismissAlert.isPending}
                                                            >
                                                                <Check className="h-4 w-4 mr-1" />
                                                                Done
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem
                                                                        onClick={() => router.push(`/?call=${alert.entity_id}`)}
                                                                    >
                                                                        View Call
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => confirmDelete(alert)}
                                                                        className="text-destructive"
                                                                    >
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Alert</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this alert? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
