'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Phone,
    Bell,
    Users,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    Calendar,
} from 'lucide-react';


interface NavItem {
    title: string;
    href: string;
    icon: React.ReactNode;
    badge?: number;
    disabled?: boolean;
}

interface SidebarProps {
    unreadAlerts?: number;
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ unreadAlerts = 0, collapsed = false, onCollapsedChange }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(collapsed);

    const handleToggle = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        onCollapsedChange?.(newState);
    };

    const navItems: NavItem[] = [
        {
            title: 'Cold Calls',
            href: '/',
            icon: <Phone className="h-5 w-5" />,
        },
        {
            title: 'Alerts',
            href: '/alerts',
            icon: <Bell className="h-5 w-5" />,
            badge: unreadAlerts > 0 ? unreadAlerts : undefined,
        },
        {
            title: 'Analytics',
            href: '/analytics',
            icon: <BarChart3 className="h-5 w-5" />,
            disabled: true,
        },
        {
            title: 'Team',
            href: '/team',
            icon: <Users className="h-5 w-5" />,
            disabled: true,
        },
        {
            title: 'Schedule',
            href: '/schedule',
            icon: <Calendar className="h-5 w-5" />,
            disabled: true,
        },
    ];

    const bottomNavItems: NavItem[] = [
        {
            title: 'Settings',
            href: '/settings',
            icon: <Settings className="h-5 w-5" />,
            disabled: true,
        },
    ];

    const NavLink = ({ item }: { item: NavItem }) => {
        const isActive = pathname === item.href;
        const content = (
            <Link
                href={item.disabled ? '#' : item.href}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all relative',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground font-medium',
                    item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                    isCollapsed && 'justify-center px-2'
                )}
                onClick={(e) => item.disabled && e.preventDefault()}
            >
                <span className="relative">
                    {item.icon}
                    {item.badge && !isCollapsed && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium">
                            {item.badge > 99 ? '99+' : item.badge}
                        </span>
                    )}
                </span>
                {!isCollapsed && (
                    <>
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground">
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                        {item.disabled && (
                            <span className="text-[9px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-full border border-border/50">
                                Soon
                            </span>
                        )}
                    </>
                )}
            </Link>
        );

        if (isCollapsed) {
            return (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                        {item.title}
                        {item.badge && (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                                {item.badge}
                            </span>
                        )}
                        {item.disabled && (
                            <span className="text-[10px] text-muted-foreground">(Coming soon)</span>
                        )}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return content;
    };

    return (
        <TooltipProvider>
            <aside
                className={cn(
                    'sticky top-0 h-screen flex flex-col border-r border-border bg-card transition-all duration-300',
                    isCollapsed ? 'w-16' : 'w-64'
                )}
            >
                {/* Logo Section */}
                <div className={cn(
                    'flex items-center h-14 border-b border-border px-3',
                    isCollapsed ? 'justify-center' : 'gap-3'
                )}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <Image
                            src="/logo.svg"
                            alt="Cold Calls Dashboard"
                            width={32}
                            height={32}
                            className="w-full h-full object-contain dark:invert dark:brightness-90 dark:hue-rotate-180"
                        />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm truncate">Cold Calls</span>
                            <span className="text-[10px] text-muted-foreground truncate">Dashboard</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1 px-3 py-4">
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink key={item.href} item={item} />
                        ))}
                    </nav>
                </ScrollArea>

                {/* Bottom Navigation */}
                <div className="border-t border-border px-3 py-3 space-y-1">
                    {bottomNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}

                    {/* Collapse Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggle}
                        className={cn(
                            'w-full justify-start gap-3',
                            isCollapsed && 'justify-center px-2'
                        )}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-5 w-5" />
                        ) : (
                            <>
                                <ChevronLeft className="h-5 w-5" />
                                <span>Collapse</span>
                            </>
                        )}
                    </Button>
                </div>
            </aside>
        </TooltipProvider>
    );
}
