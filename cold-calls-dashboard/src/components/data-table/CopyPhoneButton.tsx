'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, Check } from 'lucide-react';
import { toast } from 'sonner';

export function CopyPhoneButton({ phoneNumber }: { phoneNumber: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Handle comma-separated numbers - copy the first one or show a menu? 
        // For simple UX, let's copy the raw string which might be "num1, num2"
        // OR copy the first one. Let's copy the full string for now as it's safest for "copying what is seen".
        navigator.clipboard.writeText(phoneNumber);
        setCopied(true);
        toast.success(`Copied: ${phoneNumber}`);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleCopy}
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                    ) : (
                        <Phone className="h-4 w-4" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {copied ? 'Copied!' : `Copy ${phoneNumber}`}
            </TooltipContent>
        </Tooltip>
    );
}
