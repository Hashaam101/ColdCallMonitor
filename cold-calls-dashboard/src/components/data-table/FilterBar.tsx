'use client';

import { useState, useEffect, useMemo } from 'react';
import { ColdCallFilters, CALL_OUTCOMES } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, CalendarIcon, Filter, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useTeamMembers } from '@/hooks';
import { useAuth } from '@/lib/auth';

interface FilterBarProps {
    filters: ColdCallFilters;
    onFiltersChange: (filters: ColdCallFilters) => void;
    onSearch?: (search: string) => void;
    children?: React.ReactNode;
}

const INTEREST_LEVELS = [
    { value: 'high', label: 'High (7-10)', min: 7, max: 10 },
    { value: 'medium', label: 'Medium (4-6)', min: 4, max: 6 },
    { value: 'low', label: 'Low (1-3)', min: 1, max: 3 },
];

export function FilterBar({ filters, onFiltersChange, onSearch, children }: FilterBarProps) {
    const [searchValue, setSearchValue] = useState('');
    const [dateOpen, setDateOpen] = useState(false);
    const { data: teamMembers } = useTeamMembers();
    const { teamMember } = useAuth();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch?.(searchValue);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchValue, onSearch]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.dateRange?.from || filters.dateRange?.to) count++;
        if (filters.interestLevel) count++;
        if (filters.callOutcome && filters.callOutcome.length > 0) count++;
        if (filters.claimedBy) count++;
        return count;
    }, [filters]);

    const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
        onFiltersChange({
            ...filters,
            dateRange: range ? { from: range.from || null, to: range.to || null } : undefined,
        });
    };

    const handleOutcomeToggle = (outcome: string) => {
        const current = filters.callOutcome || [];
        const updated = current.includes(outcome)
            ? current.filter(o => o !== outcome)
            : [...current, outcome];
        onFiltersChange({
            ...filters,
            callOutcome: updated.length > 0 ? updated : undefined,
        });
    };

    const handleInterestChange = (value: string) => {
        if (value === 'all') {
            onFiltersChange({ ...filters, interestLevel: undefined });
        } else {
            const level = INTEREST_LEVELS.find(l => l.value === value);
            if (level) {
                onFiltersChange({
                    ...filters,
                    interestLevel: { min: level.min, max: level.max },
                });
            }
        }
    };

    const handleClaimedByChange = (value: string) => {
        if (value === 'all') {
            onFiltersChange({ ...filters, claimedBy: undefined });
        } else if (value === 'unclaimed') {
            onFiltersChange({ ...filters, claimedBy: 'unclaimed' });
        } else if (value === 'mine') {
            onFiltersChange({ ...filters, claimedBy: teamMember?.$id || null });
        } else {
            onFiltersChange({ ...filters, claimedBy: value });
        }
    };

    const clearAllFilters = () => {
        setSearchValue('');
        onFiltersChange({});
        onSearch?.('');
    };

    const getInterestValue = () => {
        if (!filters.interestLevel) return 'all';
        const level = INTEREST_LEVELS.find(
            l => l.min === filters.interestLevel?.min && l.max === filters.interestLevel?.max
        );
        return level?.value || 'all';
    };

    const getClaimedByValue = () => {
        if (!filters.claimedBy) return 'all';
        if (filters.claimedBy === 'unclaimed') return 'unclaimed';
        if (filters.claimedBy === teamMember?.$id) return 'mine';
        return filters.claimedBy;
    };

    return (
        <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm space-y-3">
            {/* Top Row: Search and Quick Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search company, recipient..."
                        className="pl-8 h-9"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </div>

                {/* Date Range Filter */}
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={filters.dateRange?.from ? "secondary" : "outline"}
                            size="sm"
                            className="h-9 gap-2"
                        >
                            <CalendarIcon className="h-4 w-4" />
                            {filters.dateRange?.from ? (
                                filters.dateRange.to ? (
                                    <>
                                        {format(filters.dateRange.from, "MMM d")} - {format(filters.dateRange.to, "MMM d")}
                                    </>
                                ) : (
                                    format(filters.dateRange.from, "MMM d, yyyy")
                                )
                            ) : (
                                "Date Range"
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            selected={{
                                from: filters.dateRange?.from || undefined,
                                to: filters.dateRange?.to || undefined,
                            }}
                            onSelect={handleDateSelect}
                            numberOfMonths={2}
                        />
                        <div className="p-3 border-t flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    handleDateSelect(undefined);
                                    setDateOpen(false);
                                }}
                            >
                                Clear
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setDateOpen(false)}
                                className="ml-auto"
                            >
                                Apply
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Interest Level Filter */}
                <Select value={getInterestValue()} onValueChange={handleInterestChange}>
                    <SelectTrigger className="h-9 w-[140px]">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Interest" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {INTEREST_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                                {level.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Outcome Filter (Multi-select Dropdown) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={filters.callOutcome?.length ? "secondary" : "outline"}
                            size="sm"
                            className="h-9 gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Outcome
                            {filters.callOutcome?.length ? (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                    {filters.callOutcome.length}
                                </Badge>
                            ) : (
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel>Filter by Outcome</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {CALL_OUTCOMES.map(outcome => (
                            <DropdownMenuCheckboxItem
                                key={outcome}
                                checked={filters.callOutcome?.includes(outcome)}
                                onCheckedChange={() => handleOutcomeToggle(outcome)}
                            >
                                {outcome}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Claimed By Filter */}
                <Select value={getClaimedByValue()} onValueChange={handleClaimedByChange}>
                    <SelectTrigger className="h-9 w-[150px]">
                        <SelectValue placeholder="Claimed By" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Calls</SelectItem>
                        <SelectItem value="unclaimed">Unclaimed</SelectItem>
                        <SelectItem value="mine">My Claims</SelectItem>
                        {teamMembers?.filter(m => m.$id !== teamMember?.$id).map(member => (
                            <SelectItem key={member.$id} value={member.$id}>
                                {member.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Clear All Button */}
                {(activeFilterCount > 0 || searchValue) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-9 gap-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                        Clear all
                    </Button>
                )}

                {/* Custom Children (e.g. View Options) */}
                <div className="ml-auto">
                    {children}
                </div>
            </div>

            {/* Active Filters Pills */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Active filters:</span>

                    {filters.dateRange?.from && (
                        <Badge variant="secondary" className="gap-1 pl-2">
                            {filters.dateRange.to
                                ? `${format(filters.dateRange.from, "MMM d")} - ${format(filters.dateRange.to, "MMM d")}`
                                : format(filters.dateRange.from, "MMM d, yyyy")}
                            <button
                                onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}

                    {filters.interestLevel && (
                        <Badge variant="secondary" className="gap-1 pl-2">
                            Interest: {INTEREST_LEVELS.find(l => l.min === filters.interestLevel?.min)?.label || 'Custom'}
                            <button
                                onClick={() => onFiltersChange({ ...filters, interestLevel: undefined })}
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}

                    {filters.callOutcome?.map(outcome => (
                        <Badge key={outcome} variant="secondary" className="gap-1 pl-2">
                            {outcome}
                            <button
                                onClick={() => handleOutcomeToggle(outcome)}
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}

                    {filters.claimedBy && (
                        <Badge variant="secondary" className="gap-1 pl-2">
                            {filters.claimedBy === 'unclaimed'
                                ? 'Unclaimed'
                                : filters.claimedBy === teamMember?.$id
                                    ? 'My Claims'
                                    : teamMembers?.find(m => m.$id === filters.claimedBy)?.name || 'Unknown'}
                            <button
                                onClick={() => onFiltersChange({ ...filters, claimedBy: undefined })}
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}
