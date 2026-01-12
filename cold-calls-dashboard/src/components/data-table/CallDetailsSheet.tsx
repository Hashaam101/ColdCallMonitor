'use client';

import { ColdCall } from '@/types';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    MapPin,
    Phone,
    Calendar,
    User,
    Building2,
    Clock,
    TrendingUp,
    MessageSquare,
    AlertTriangle,
    CheckCircle2,
    Target,
    ExternalLink,
    Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTeamMembers } from '@/hooks';

interface CallDetailsSheetProps {
    call: ColdCall | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSetAlert?: (call: ColdCall) => void;
}

export function CallDetailsSheet({ call, open, onOpenChange, onSetAlert }: CallDetailsSheetProps) {
    const { data: teamMembers } = useTeamMembers();

    if (!call) return null;

    const getClaimantName = () => {
        if (!call.claimed_by) return null;
        const member = teamMembers?.find(m => m.$id === call.claimed_by);
        return member?.name || 'Unknown';
    };

    const getInterestColor = (level: number | null) => {
        if (!level) return 'bg-muted text-muted-foreground';
        if (level >= 7) return 'bg-green-500/20 text-green-500';
        if (level >= 4) return 'bg-yellow-500/20 text-yellow-500';
        return 'bg-red-500/20 text-red-500';
    };

    const getOutcomeColor = (outcome: string | null) => {
        switch (outcome?.toLowerCase()) {
            case 'interested':
                return 'bg-green-500/20 text-green-500';
            case 'callback':
                return 'bg-blue-500/20 text-blue-500';
            case 'not interested':
                return 'bg-red-500/20 text-red-500';
            case 'no answer':
                return 'bg-yellow-500/20 text-yellow-500';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const parseListField = (value: string | null): string[] => {
        if (!value) return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
        } catch {
            return value.split(',').map(s => s.trim()).filter(Boolean);
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied to clipboard`);
        } catch {
            toast.error('Failed to copy');
        }
    };

    const objections = parseListField(call.objections);
    const painPoints = parseListField(call.pain_points);
    const followUpActions = parseListField(call.follow_up_actions);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <SheetTitle className="flex items-center gap-2 text-xl">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                {call.company_name || 'Unknown Company'}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-2">
                                {call.company_location && (
                                    <>
                                        <MapPin className="h-3.5 w-3.5" />
                                        {call.company_location}
                                    </>
                                )}
                            </SheetDescription>
                        </div>
                        <div className="flex gap-2">
                            {call.call_outcome && (
                                <Badge className={getOutcomeColor(call.call_outcome)}>
                                    {call.call_outcome}
                                </Badge>
                            )}
                            {call.interest_level && (
                                <Badge className={getInterestColor(call.interest_level)}>
                                    Interest: {call.interest_level}/10
                                </Badge>
                            )}
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="px-6 py-4">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                                <TabsTrigger value="insights">Insights</TabsTrigger>
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-6">
                                {/* Quick Info Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <User className="h-3.5 w-3.5" />
                                            Recipient
                                        </div>
                                        <p className="font-medium text-sm">{call.recipients || 'Unknown'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5" />
                                            Caller
                                        </div>
                                        <p className="font-medium text-sm">{call.caller_name || 'Unknown'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Date
                                        </div>
                                        <p className="font-medium text-sm">
                                            {format(new Date(call.$createdAt), 'PPP')}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" />
                                            Duration
                                        </div>
                                        <p className="font-medium text-sm">
                                            {call.call_duration_estimate || 'Unknown'}
                                        </p>
                                    </div>
                                </div>

                                {/* Claimed By */}
                                {call.claimed_by && (
                                    <div className="p-3 rounded-lg border bg-card">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="h-4 w-4 text-primary" />
                                            <span className="text-muted-foreground">Claimed by</span>
                                            <span className="font-medium">{getClaimantName()}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Summary */}
                                {call.call_summary && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            Summary
                                        </h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
                                            {call.call_summary}
                                        </p>
                                    </div>
                                )}

                                {/* Follow-up Actions */}
                                {followUpActions.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                            <Target className="h-4 w-4" />
                                            Follow-up Actions
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {followUpActions.map((action, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm">
                                                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                                    <span className="text-muted-foreground">{action}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Google Maps Link */}
                                {call.google_maps_link && (
                                    <div className="pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full gap-2"
                                            onClick={() => window.open(call.google_maps_link!, '_blank')}
                                        >
                                            <MapPin className="h-4 w-4" />
                                            Open in Google Maps
                                            <ExternalLink className="h-3 w-3 ml-auto" />
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Transcript Tab */}
                            <TabsContent value="transcript" className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">Call Transcript</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(call.transcript, 'Transcript')}
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                                        {call.transcript}
                                    </pre>
                                </div>
                                {call.model_used && (
                                    <div className="text-xs text-muted-foreground pt-2 border-t">
                                        <span>Analyzed with: {call.model_used}</span>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Insights Tab */}
                            <TabsContent value="insights" className="space-y-6">
                                {/* Interest Level */}
                                {call.interest_level && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Interest Level
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${call.interest_level >= 7 ? 'bg-green-500' :
                                                        call.interest_level >= 4 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                    style={{ width: `${call.interest_level * 10}%` }}
                                                />
                                            </div>
                                            <span className="text-lg font-bold min-w-[3rem] text-right">
                                                {call.interest_level}/10
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Objections */}
                                {objections.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                            Objections Raised
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {objections.map((obj, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm bg-yellow-500/10 p-2 rounded-lg">
                                                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                                    <span className="text-muted-foreground">{obj}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Pain Points */}
                                {painPoints.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium flex items-center gap-2">
                                            <Target className="h-4 w-4 text-blue-500" />
                                            Pain Points Identified
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {painPoints.map((point, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm bg-blue-500/10 p-2 rounded-lg">
                                                    <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                    <span className="text-muted-foreground">{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Empty State */}
                                {objections.length === 0 && painPoints.length === 0 && !call.interest_level && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>No insights available for this call</p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="border-t px-6 py-4 flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => onSetAlert?.(call)}
                    >
                        Set Alert
                    </Button>
                    <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
