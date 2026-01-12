'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAllAlerts, useDismissAlert, useDeleteAlert, useUnreadAlertCount } from '@/hooks';
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
import { format, formatDistanceToNow } from 'date-fns';
import {
    Bell,
    Check,
    MoreVertical,
    Clock,
    Calendar,
    User,
    Building2,
    Timer,
} from 'lucide-react';
import type { Alert } from '@/types';

// Alert item component to avoid duplication
function AlertItem({
    alert,
    isUpcoming,
    onDismiss,
    onDelete,
    onViewCall,
    isPending
}: {
    alert: Alert;
    isUpcoming?: boolean;
    onDismiss: (id: string) => void;
    onDelete: (alert: Alert) => void;
    onViewCall: (entityId: string) => void;
    isPending: boolean;
}) {
    const isDue = !alert.alert_time || new Date(alert.alert_time) <= new Date();

    return (
        <div
            className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors ${isDue && !isUpcoming ? 'bg-primary/5' : ''
                } ${isUpcoming ? 'bg-muted/30' : ''}`}
        >
            {/* Icon */}
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isUpcoming
                    ? 'bg-blue-500/20 text-blue-500'
                    : isDue
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                }`}>
                {isUpcoming ? <Timer className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{alert.entity_label}</h4>
                    {isDue && !isUpcoming && (
                        <Badge variant="default" className="text-[10px]">
                            Due
                        </Badge>
                    )}
                    {isUpcoming && alert.alert_time && (
                        <Badge variant="secondary" className="text-[10px]">
                            {formatDistanceToNow(new Date(alert.alert_time), { addSuffix: true })}
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
                {!isUpcoming && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDismiss(alert.$id)}
                        disabled={isPending}
                    >
                        <Check className="h-4 w-4 mr-1" />
                        Done
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewCall(alert.entity_id)}>
                            View Call
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(alert)}
                            className="text-destructive"
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export default function AlertsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const unreadAlerts = useUnreadAlertCount();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [alertToDelete, setAlertToDelete] = useState<Alert | null>(null);

    const { data: alertsData, isLoading } = useAllAlerts();
    const dismissAlert = useDismissAlert();
    const deleteAlert = useDeleteAlert();

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

    const handleViewCall = (entityId: string) => {
        router.push(`/?call=${entityId}`);
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

    const triggered = alertsData?.triggered || [];
    const upcoming = alertsData?.upcoming || [];
    const totalAlerts = triggered.length + upcoming.length;

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
                                    <div className="text-2xl font-bold">{totalAlerts}</div>
                                    <div className="text-xs text-muted-foreground">Total Active</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-red-500">
                                        {triggered.length}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Due Now</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-blue-500">
                                        {upcoming.length}
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

                        {/* Triggered Alerts */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-red-500" />
                                    Triggered Alerts
                                </CardTitle>
                                <CardDescription>
                                    Alerts that are due and need your attention
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="max-h-[300px]">
                                    {isLoading ? (
                                        <div className="p-4 space-y-4">
                                            {Array.from({ length: 2 }).map((_, i) => (
                                                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-1/3" />
                                                        <Skeleton className="h-3 w-2/3" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : triggered.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No triggered alerts</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {triggered.map((alert) => (
                                                <AlertItem
                                                    key={alert.$id}
                                                    alert={alert}
                                                    onDismiss={handleDismiss}
                                                    onDelete={confirmDelete}
                                                    onViewCall={handleViewCall}
                                                    isPending={dismissAlert.isPending}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Upcoming Alerts */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    Upcoming Alerts
                                </CardTitle>
                                <CardDescription>
                                    Scheduled alerts that will trigger in the future
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="max-h-[300px]">
                                    {isLoading ? (
                                        <div className="p-4 space-y-4">
                                            {Array.from({ length: 2 }).map((_, i) => (
                                                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-1/3" />
                                                        <Skeleton className="h-3 w-2/3" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : upcoming.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No upcoming alerts scheduled</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {upcoming.map((alert) => (
                                                <AlertItem
                                                    key={alert.$id}
                                                    alert={alert}
                                                    isUpcoming
                                                    onDismiss={handleDismiss}
                                                    onDelete={confirmDelete}
                                                    onViewCall={handleViewCall}
                                                    isPending={dismissAlert.isPending}
                                                />
                                            ))}
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
