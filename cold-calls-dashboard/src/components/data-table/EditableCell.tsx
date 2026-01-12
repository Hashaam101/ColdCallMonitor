'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface EditableCellProps {
    value: string | number | null | undefined;
    type?: 'text' | 'number' | 'select';
    options?: string[];
    placeholder?: string;
    onSave: (value: string | number | null) => void;
}

export function EditableCell({
    value,
    type = 'text',
    options = [],
    placeholder = '-',
    onSave,
}: EditableCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState<string>(String(value ?? ''));
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Reset edit value when value prop changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEditValue(String(value ?? ''));
    }, [value]);

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditValue(String(value ?? ''));
    };

    const handleSave = () => {
        setIsEditing(false);

        let newValue: string | number | null = editValue.trim();

        if (newValue === '') {
            newValue = null;
        } else if (type === 'number') {
            const parsed = parseInt(newValue, 10);
            newValue = isNaN(parsed) ? null : parsed;
        }

        // Only save if value changed
        if (newValue !== value && !(newValue === null && (value === null || value === undefined || value === ''))) {
            onSave(newValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(String(value ?? ''));
        }
    };

    const handleSelectChange = (newValue: string) => {
        setIsEditing(false);
        if (newValue !== value) {
            onSave(newValue);
        }
    };

    // Select type
    if (type === 'select') {
        return (
            <Select
                value={String(value ?? '')}
                onValueChange={handleSelectChange}
            >
                <SelectTrigger className="h-8 border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 rounded-none px-3 overflow-hidden">
                    <span className="truncate">
                        <SelectValue placeholder={placeholder} />
                    </span>
                </SelectTrigger>
                <SelectContent>
                    {options.map(option => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    // Editing mode
    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                type={type === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="h-8 border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary rounded-none px-3"
                min={type === 'number' ? 1 : undefined}
                max={type === 'number' ? 10 : undefined}
            />
        );
    }

    // Display mode
    const displayValue = value ?? '';
    const isEmpty = displayValue === '' || displayValue === null || displayValue === undefined;

    return (
        <div
            onClick={handleStartEdit}
            className="px-2 py-2 cursor-pointer hover:bg-muted/50 transition-colors min-h-[36px] flex items-center overflow-hidden min-w-0"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleStartEdit()}
        >
            {isEmpty ? (
                <span className="text-muted-foreground/50 text-sm truncate">{placeholder}</span>
            ) : (
                <span className="text-sm truncate flex-1 min-w-0" title={String(displayValue)}>
                    {type === 'number' && typeof displayValue === 'number' ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${displayValue >= 7 ? 'bg-green-500/20 text-green-500' :
                            displayValue >= 4 ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-red-500/20 text-red-500'
                            }`}>
                            {displayValue}
                        </span>
                    ) : (
                        String(displayValue)
                    )}
                </span>
            )}
        </div>
    );
}
