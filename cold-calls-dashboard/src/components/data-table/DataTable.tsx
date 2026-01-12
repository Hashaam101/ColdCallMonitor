'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useColdCalls, useUpdateColdCall, useTeamMembers } from '@/hooks';
import { useAuth } from '@/lib/auth';
import type { ColdCall, ColdCallFilters, SortConfig } from '@/types';
import { CALL_OUTCOMES } from '@/types';
import { FilterBar } from './FilterBar';
import { BulkActions } from './BulkActions';
import { EditableCell } from './EditableCell';
import { CallDetailsSheet } from './CallDetailsSheet';
import { AlertDialog } from '@/components/alerts/AlertDialog';

import { StatsCards } from '@/components/dashboard/StatsCards';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Eye, User, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

// Column definitions (initial defaults)
// Column definitions (initial defaults)
const defaultColumns: { key: keyof ColdCall; label: string; width: number; editable?: boolean; visible?: boolean }[] = [
    { key: 'company_name', label: 'Company', width: 150, editable: true, visible: true },
    { key: 'recipients', label: 'Recipients', width: 120, editable: true, visible: true },
    { key: 'call_outcome', label: 'Outcome', width: 120, editable: true, visible: true },
    { key: 'interest_level', label: 'Interest', width: 100, editable: true, visible: true },
    { key: 'company_location', label: 'Location', width: 120, editable: true, visible: true },
    { key: 'call_summary', label: 'Summary', width: 250, editable: true, visible: true },
    { key: 'follow_up_actions', label: 'Follow-up', width: 150, editable: true, visible: true },
    { key: 'google_maps_link', label: 'Maps', width: 80, editable: true, visible: true },
    { key: '$createdAt', label: 'Date', width: 100, editable: false, visible: true },
];

const ITEMS_PER_PAGE = 20;

export function DataTable() {
    const { teamMember } = useAuth();
    const [filters, setFilters] = useState<ColdCallFilters>({});
    const [sort, setSort] = useState<SortConfig>({ field: '$createdAt', direction: 'desc' });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);
    const [alertTargetCall, setAlertTargetCall] = useState<ColdCall | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
    const [selectedCall, setSelectedCall] = useState<ColdCall | null>(null);

    // Column Resizing State
    const [columns, setColumns] = useState(defaultColumns);
    const [resizing, setResizing] = useState<{ index: number; startX: number; startWidth: number } | null>(null);
    const isResizingRef = useRef(false);

    // Persistence: Load columns on mount
    useEffect(() => {
        const saved = localStorage.getItem('cold-call-monitor-v1-columns');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                // Validate parsed data structure roughly
                if (!Array.isArray(parsed)) return;

                // Match 1:1 with defaultColumns to be safe, while preserving saved properties
                // This handles cases where we add/remove columns in future updates
                const merged = defaultColumns.map(defCol => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const savedCol = parsed.find((p: any) => p.key === defCol.key);
                    if (savedCol) {
                        return {
                            ...defCol,
                            width: savedCol.width,
                            visible: savedCol.visible ?? true, // Default to true if missing
                        };
                    }
                    return defCol;
                });

                // For now, let's use the merged array to ensure we have all current columns with saved preferences
                // If we want to support reordering, we need deeper logic, but let's stick to default order + saved props for stability
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setColumns(merged);
            } catch (e) {
                console.error("Failed to parse saved columns", e);
            }
        }
    }, []);

    // Persistence: Save columns on change
    useEffect(() => {
        if (columns !== defaultColumns) {
            localStorage.setItem('cold-call-monitor-v1-columns', JSON.stringify(columns));
        }
    }, [columns]);

    const { data: coldCalls, isLoading, error } = useColdCalls(filters, sort);
    const { data: teamMembers } = useTeamMembers();
    const updateColdCall = useUpdateColdCall();


    // Resize Handlers
    const handleResizeStart = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        isResizingRef.current = true;
        setResizing({
            index,
            startX: e.clientX,
            startWidth: columns[index].width,
        });

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const diff = moveEvent.clientX - e.clientX;
            setColumns(prev => {
                const newCols = [...prev];
                newCols[index] = {
                    ...newCols[index],
                    width: Math.max(20, columns[index].width + diff), // Min width 20px
                };
                return newCols;
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            setResizing(null);
            // Reset the ref after a short delay to block the subsequent click event
            setTimeout(() => {
                isResizingRef.current = false;
            }, 50);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Client-side search filtering
    const filteredCalls = useMemo(() => {
        if (!coldCalls) return [];
        if (!searchQuery.trim()) return coldCalls;

        const query = searchQuery.toLowerCase();
        return coldCalls.filter(call =>
            call.company_name?.toLowerCase().includes(query) ||
            call.recipients?.toLowerCase().includes(query) ||
            call.company_location?.toLowerCase().includes(query) ||
            call.call_summary?.toLowerCase().includes(query)
        );
    }, [coldCalls, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredCalls.length / ITEMS_PER_PAGE);
    const paginatedCalls = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCalls.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredCalls, currentPage]);

    // Reset page when filters change
    const handleFiltersChange = useCallback((newFilters: ColdCallFilters) => {
        setFilters(newFilters);
        setCurrentPage(1);
    }, []);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    }, []);

    // Auto-resize on double click
    const handleAutoResize = (index: number) => {
        const col = columns[index];
        const key = col.key;

        // Start with header length
        let maxLen = col.label.length;

        // Check visible data to find max content length
        paginatedCalls.forEach(call => {
            let cellValue = '';

            if (key === '$createdAt') {
                cellValue = new Date(call.$createdAt).toLocaleDateString();
            } else if (key === 'google_maps_link') {
                // If link exists, we show 'View', else 'Add link' (placeholder)
                // EditableCell 'Add link' is 8 chars. 'View' is 4.
                cellValue = call.google_maps_link ? 'View' : 'Add link';
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const raw = (call as any)[key];
                if (raw !== null && raw !== undefined && raw !== '') {
                    cellValue = String(raw);
                } else {
                    // Check placeholder logic from usage in render or default to '-'
                    // Most columns use default '-' (1 char)
                    // Specifics:
                    // Maps: 'Add link' (handled above if I did it right check logic) -> actually logic above handles maps specifically
                    // Others: '-'
                    cellValue = '-';
                }
            }
            maxLen = Math.max(maxLen, cellValue.length);
        });

        // Heuristic: 8px per char (avg for 14px font) + 32px padding
        // Min 40px, Max 600px
        const estimatedWidth = Math.ceil(maxLen * 8.5) + 32;
        const newWidth = Math.max(40, Math.min(600, estimatedWidth));

        setColumns(prev => {
            const newCols = [...prev];
            newCols[index] = { ...newCols[index], width: newWidth };
            return newCols;
        });
    };

    // View details handler
    const handleViewDetails = (call: ColdCall) => {
        setSelectedCall(call);
        setDetailsSheetOpen(true);
    };

    // Toggle sort
    const handleSort = (field: keyof ColdCall) => {
        setSort(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    // Selection handlers - now based on paginated results
    const isAllSelected = paginatedCalls.length > 0 && paginatedCalls.every(c => selectedIds.includes(c.$id));
    const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

    const handleSelectAll = () => {
        if (isAllSelected) {
            // Deselect all on current page
            const currentPageIds = paginatedCalls.map(c => c.$id);
            setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
        } else {
            // Select all on current page
            const currentPageIds = paginatedCalls.map(c => c.$id);
            setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])]);
        }
    };

    const handleSelectRow = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Cell update handler
    const handleCellUpdate = async (id: string, field: keyof ColdCall, value: string | number | null) => {
        try {
            await updateColdCall.mutateAsync({
                id,
                data: { [field]: value },
            });
            toast.success('Updated successfully');
        } catch (error) {
            toast.error('Failed to update');
            console.error(error);
        }
    };

    // Claim handler
    const handleClaim = async (id: string, currentClaimedBy: string | null) => {
        if (!teamMember) return;

        const newClaimedBy = currentClaimedBy === teamMember.$id ? null : teamMember.$id;

        try {
            await updateColdCall.mutateAsync({
                id,
                data: { claimed_by: newClaimedBy },
            });
            toast.success(newClaimedBy ? 'Call claimed' : 'Call unclaimed');
        } catch (error) {
            toast.error('Failed to update claim');
            console.error(error);
        }
    };

    // Get team member name by ID
    const getMemberName = (id: string | null) => {
        if (!id || !teamMembers) return null;
        return teamMembers.find(m => m.$id === id)?.name || 'Unknown';
    };

    // Open alert dialog
    const handleSetAlert = (call: ColdCall) => {
        setAlertTargetCall(call);
        setAlertDialogOpen(true);
    };

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Error loading data: {error.message}</p>
                <p className="text-muted-foreground text-sm mt-2">
                    Make sure your Appwrite configuration is correct.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <StatsCards calls={coldCalls} isLoading={isLoading} />

            {/* Filter Bar and View Options */}
            <FilterBar filters={filters} onFiltersChange={handleFiltersChange} onSearch={handleSearch}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                            <Settings2 className="h-4 w-4" />
                            View
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[150px]">
                        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {columns.map((column, index) => {
                            return (
                                <DropdownMenuCheckboxItem
                                    key={column.key}
                                    className="capitalize"
                                    checked={column.visible !== false}
                                    onCheckedChange={(checked) => {
                                        setColumns(prev => {
                                            const newCols = [...prev];
                                            newCols[index] = { ...newCols[index], visible: !!checked };
                                            return newCols;
                                        });
                                    }}
                                >
                                    {column.label}
                                </DropdownMenuCheckboxItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </FilterBar>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
                <BulkActions
                    selectedIds={selectedIds}
                    selectedCalls={filteredCalls.filter(c => selectedIds.includes(c.$id))}
                    onClearSelection={() => setSelectedIds([])}
                />
            )}

            {/* Data Table */}
            <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar pb-2">
                    <Table style={{
                        tableLayout: 'fixed',
                        width: columns.filter(c => c.visible !== false).reduce((acc, col) => acc + col.width, 0) + 48 + 128 + 'px',
                        minWidth: '100%'
                    }}>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12 text-center">
                                    <div className="flex justify-center">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Select all"
                                            className={isSomeSelected ? 'opacity-50' : ''}
                                        />
                                    </div>
                                </TableHead>
                                <TableHead className="w-32 text-center">Actions</TableHead>
                                {columns.filter(c => c.visible !== false).map(col => (
                                    <TableHead
                                        key={col.key}
                                        style={{ width: col.width, position: 'relative' }}
                                        className={`cursor-pointer hover:bg-muted/80 transition-colors group select-none ${resizing ? 'cursor-col-resize' : ''}`}
                                        draggable={!resizing}
                                        onDragStart={(e) => {
                                            if (resizing) {
                                                e.preventDefault();
                                                return;
                                            }
                                            e.dataTransfer.setData('text/plain', col.key);
                                            // Add transparency effect
                                            e.currentTarget.style.opacity = '0.5';
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault(); // Allow drop
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const draggedKey = e.dataTransfer.getData('text/plain');
                                            const targetKey = col.key;

                                            if (draggedKey !== targetKey) {
                                                const sourceIndex = columns.findIndex(c => c.key === draggedKey);
                                                const targetIndex = columns.findIndex(c => c.key === targetKey);

                                                if (sourceIndex !== -1 && targetIndex !== -1) {
                                                    setColumns(prev => {
                                                        const newCols = [...prev];
                                                        const [removed] = newCols.splice(sourceIndex, 1);
                                                        newCols.splice(targetIndex, 0, removed);
                                                        return newCols;
                                                    });
                                                }
                                            }
                                        }}
                                        onClick={() => {
                                            if (isResizingRef.current) return;
                                            handleSort(col.key);
                                        }}
                                    >
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            <span className="truncate" title={col.label}>
                                                {col.label}
                                            </span>
                                            {sort.field === col.key && (
                                                <span className="text-xs shrink-0">
                                                    {sort.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Resize Handle */}
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/20 transition-colors z-10"
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => handleResizeStart(e, columns.findIndex(c => c.key === col.key))}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                handleAutoResize(columns.findIndex(c => c.key === col.key));
                                            }}
                                        />
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                // Skeleton loading rows
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                        {columns.filter(c => c.visible !== false).map(col => (
                                            <TableCell key={col.key}><Skeleton className="h-4 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : paginatedCalls.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.filter(c => c.visible !== false).length + 2} className="h-32 text-center text-muted-foreground">
                                        {searchQuery ? `No results for "${searchQuery}"` : 'No cold calls found'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCalls.map(call => (
                                    <TableRow
                                        key={call.$id}
                                        className={`hover:bg-muted/30 transition-colors group/row ${selectedIds.includes(call.$id) ? 'bg-muted/50' : ''}`}
                                    >
                                        <TableCell className="p-0 text-center relative w-12 group-hover/row:bg-muted/50">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {/* Default State: Index Number */}
                                                <span className={`text-xs text-muted-foreground group-hover/row:opacity-0 ${selectedIds.includes(call.$id) ? 'opacity-0' : 'opacity-100'}`}>
                                                    {((currentPage - 1) * ITEMS_PER_PAGE) + paginatedCalls.indexOf(call) + 1}
                                                </span>

                                                {/* Hover/Selected State: Checkbox */}
                                                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${selectedIds.includes(call.$id) ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}>
                                                    <Checkbox
                                                        checked={selectedIds.includes(call.$id)}
                                                        onCheckedChange={() => handleSelectRow(call.$id)}
                                                        aria-label={`Select ${call.company_name}`}
                                                        className="h-4 w-4"
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="p-2">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* 1. View Details (Eye) */}
                                                <Tooltip delayDuration={300}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleViewDetails(call)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View Details</TooltipContent>
                                                </Tooltip>

                                                {/* 2. Alerts (Bell) */}
                                                <Tooltip delayDuration={300}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleSetAlert(call)}
                                                            className="h-8 w-8 text-muted-foreground/50 hover:text-foreground"
                                                        >
                                                            <Bell className="h-4 w-4" />
                                                            {/* We can add logic for alert active color here later */}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Set Alert</TooltipContent>
                                                </Tooltip>


                                                {/* 3. Claim (Person/Avatar) */}
                                                <Tooltip delayDuration={300}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 p-0 rounded-full overflow-hidden"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleClaim(call.$id, call.claimed_by);
                                                            }}
                                                        >
                                                            {call.claimed_by ? (
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage
                                                                        src={`https://ui-avatars.com/api/?name=${getMemberName(call.claimed_by)}&background=random`}
                                                                        alt={getMemberName(call.claimed_by) || 'User'}
                                                                    />
                                                                    <AvatarFallback className="text-[10px]">
                                                                        {getMemberName(call.claimed_by)?.substring(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            ) : (
                                                                <User className="h-4 w-4 text-muted-foreground/40 hover:text-primary transition-colors" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {call.claimed_by ? `Claimed by ${getMemberName(call.claimed_by)}` : 'Claim Call'}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>

                                        {columns.filter(c => c.visible !== false).map(col => (
                                            <TableCell key={col.key} className="p-0">
                                                {col.key === 'claimed_by' ? (
                                                    null // Should not happen as we removed it
                                                ) : col.key === '$createdAt' ? (
                                                    <span className="px-3 py-2 block text-sm text-muted-foreground truncate overflow-hidden whitespace-nowrap">
                                                        {new Date(call.$createdAt).toLocaleDateString()}
                                                    </span>
                                                ) : col.key === 'google_maps_link' ? (
                                                    call.google_maps_link ? (
                                                        <a
                                                            href={call.google_maps_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-2 block text-primary hover:underline text-sm truncate"
                                                        >
                                                            View
                                                        </a>
                                                    ) : (
                                                        <EditableCell
                                                            value=""
                                                            onSave={(value) => handleCellUpdate(call.$id, col.key, value)}
                                                            placeholder="Add link"
                                                        />
                                                    )
                                                ) : col.key === 'interest_level' ? (
                                                    <EditableCell
                                                        value={call[col.key]}
                                                        type="number"
                                                        onSave={(value) => handleCellUpdate(call.$id, col.key, value)}
                                                    />
                                                ) : col.key === 'call_outcome' ? (
                                                    <EditableCell
                                                        value={call[col.key]}
                                                        type="select"
                                                        options={[...CALL_OUTCOMES]}
                                                        onSave={(value) => handleCellUpdate(call.$id, col.key, value)}
                                                    />
                                                ) : col.key === 'call_summary' ? (
                                                    <EditableCell
                                                        value={call[col.key] as string | null}
                                                        onSave={(value) => handleCellUpdate(call.$id, col.key, value)}
                                                    />
                                                ) : (
                                                    <EditableCell
                                                        value={call[col.key] as string | null}
                                                        onSave={(value) => handleCellUpdate(call.$id, col.key, value)}
                                                    />
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {!isLoading && filteredCalls.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCalls.length)} of {filteredCalls.length} results
                        {searchQuery && ` for "${searchQuery}"`}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? 'default' : 'outline'}
                                        size="sm"
                                        className="w-8 h-8 p-0"
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Call Details Sheet */}
            <CallDetailsSheet
                call={selectedCall}
                open={detailsSheetOpen}
                onOpenChange={setDetailsSheetOpen}
                onSetAlert={(call) => {
                    setDetailsSheetOpen(false);
                    handleSetAlert(call);
                }}
            />

            {/* Alert Dialog */}
            <AlertDialog
                open={alertDialogOpen}
                onOpenChange={setAlertDialogOpen}
                call={alertTargetCall}
            />
        </div>
    );
}
