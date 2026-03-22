import { cn } from '@/lib/utils';

const palette: Record<string, string> = {
  active: 'bg-primary/10 text-primary',
  approved: 'bg-primary/10 text-primary',
  completed: 'bg-primary/10 text-primary',
  on_hold: 'bg-destructive/10 text-destructive',
  overdue: 'bg-destructive/10 text-destructive',
  unpaid: 'bg-muted text-foreground',
  inactive: 'bg-muted text-muted-foreground',
};

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize', palette[status] ?? 'bg-muted text-foreground')}>
    {status.replace('_', ' ')}
  </span>
);
