import { Link, useLocation } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NavLink = ({ item, collapsed }: { item: { label: string; href: string; icon: LucideIcon }; collapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
};
