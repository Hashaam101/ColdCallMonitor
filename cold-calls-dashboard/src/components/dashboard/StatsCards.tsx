'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Phone,
    TrendingUp,
    Users,
    CheckCircle,
    Clock,
    Target,
    PhoneForwarded,
} from 'lucide-react';
import { ColdCall } from '@/types';
import { useAuth } from '@/lib/auth';

interface StatsCardsProps {
    calls: ColdCall[] | undefined;
    isLoading: boolean;
}

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

function StatCard({ title, value, description, icon, trend, className }: StatCardProps) {
    return (
        <Card className={className}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {title}
                        </p>
                        <p className="text-2xl font-bold">{value}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {icon}
                    </div>
                </div>
                {trend && (
                    <div className={`mt-3 flex items-center gap-1 text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'
                        }`}>
                        <TrendingUp className={`h-3 w-3 ${!trend.isPositive && 'rotate-180'}`} />
                        <span>{trend.isPositive ? '+' : ''}{trend.value}% from last week</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function StatCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
            </CardContent>
        </Card>
    );
}

export function StatsCards({ calls, isLoading }: StatsCardsProps) {
    const { teamMember } = useAuth();

    const stats = useMemo(() => {
        if (!calls || calls.length === 0) {
            return {
                totalCalls: 0,
                avgInterest: 0,
                interested: 0,
                callbacks: 0,
                myClaims: 0,
                unclaimed: 0,
                conversionRate: 0,
            };
        }

        const totalCalls = calls.length;

        // Calculate average interest level
        const callsWithInterest = calls.filter(c => c.interest_level !== null);
        const avgInterest = callsWithInterest.length > 0
            ? callsWithInterest.reduce((sum, c) => sum + (c.interest_level || 0), 0) / callsWithInterest.length
            : 0;

        // Count outcomes
        const interested = calls.filter(c =>
            c.call_outcome && c.call_outcome.trim().toLowerCase() === 'interested'
        ).length;

        const callbacks = calls.filter(c =>
            c.call_outcome && c.call_outcome.trim().toLowerCase() === 'callback'
        ).length;

        // Count claims
        const myClaims = teamMember
            ? calls.filter(c => c.claimed_by === teamMember.$id).length
            : 0;

        const unclaimed = calls.filter(c => !c.claimed_by).length;

        // Calculate conversion rate (interested / total)
        const conversionRate = totalCalls > 0 ? (interested / totalCalls) * 100 : 0;

        return {
            totalCalls,
            avgInterest,
            interested,
            callbacks,
            myClaims,
            unclaimed,
            conversionRate,
        };
    }, [calls, teamMember]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
                title="Total Calls"
                value={stats.totalCalls}
                description="All time"
                icon={<Phone className="h-5 w-5" />}
            />
            <StatCard
                title="Avg Interest"
                value={stats.avgInterest.toFixed(1)}
                description="Out of 10"
                icon={<Target className="h-5 w-5" />}
            />
            <StatCard
                title="Interested"
                value={stats.interested}
                description={`${stats.conversionRate.toFixed(1)}% rate`}
                icon={<CheckCircle className="h-5 w-5" />}
            />
            <StatCard
                title="Callbacks"
                value={stats.callbacks}
                description="Scheduled"
                icon={<PhoneForwarded className="h-5 w-5" />}
            />
            <StatCard
                title="My Claims"
                value={stats.myClaims}
                description="Assigned to you"
                icon={<Users className="h-5 w-5" />}
            />
            <StatCard
                title="Unclaimed"
                value={stats.unclaimed}
                description="Available"
                icon={<Clock className="h-5 w-5" />}
            />
        </div>
    );
}
