'use client';

import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface NotificationPromptProps {
    onAllow: () => void;
    onDismiss: () => void;
}

export function NotificationPrompt({ onAllow, onDismiss }: NotificationPromptProps) {
    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <Card className="w-[360px] border-primary/20 bg-card/95 backdrop-blur-sm shadow-xl">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1">Enable Notifications</h4>
                            <p className="text-xs text-muted-foreground mb-3">
                                Get notified when your alerts are due. We&apos;ll ring until you check them!
                            </p>
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={onAllow} className="h-8">
                                    Allow Notifications
                                </Button>
                                <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8">
                                    Not Now
                                </Button>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 -mt-1 -mr-1"
                            onClick={onDismiss}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
