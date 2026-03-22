import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface NavigationProps {
  items: readonly NavigationItem[];
  activeId: string;
  onChange: (id: string) => void;
}

const NavigationButton = ({ item, active, onClick, compact = false }: { item: NavigationItem; active: boolean; onClick: () => void; compact?: boolean }) => {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border text-left transition-all',
        compact ? 'min-h-9 px-3 py-2.5' : 'min-h-10 px-3.5 py-3',
        active
          ? 'border-primary/30 bg-primary/10 text-foreground shadow-sm'
          : 'border-border bg-background hover:border-primary/20 hover:bg-accent/40',
      )}
    >
      <div className={cn('flex items-start', compact ? 'gap-2.5' : 'gap-3')}>
        <div className={cn(
          'shrink-0 rounded-xl',
          compact ? 'p-1.5' : 'p-2',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}>
          <Icon className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        </div>
        <div className="min-w-0">
          <p className={cn('font-medium leading-5', compact ? 'text-sm' : 'text-sm')}>{item.label}</p>
          <p className={cn('text-muted-foreground', compact ? 'mt-0.5 text-xs leading-4' : 'mt-1 text-sm leading-5')}>{item.description}</p>
        </div>
      </div>
    </button>
  );
};

export const SettingsSectionNav = ({ items, activeId, onChange }: NavigationProps) => (
  <Card className="p-4">
    <div className="mb-3 border-b border-border pb-3">
      <p className="text-sm font-semibold">Settings sections</p>
      <p className="mt-1 text-sm text-muted-foreground">Choose a primary area to manage JAKHIRA ERP preferences.</p>
    </div>
    <div className="space-y-2">
      {items.map((item) => (
        <NavigationButton key={item.id} item={item} active={item.id === activeId} onClick={() => onChange(item.id)} />
      ))}
    </div>
  </Card>
);

export const SettingsSubSectionNav = ({ items, activeId, onChange }: NavigationProps) => (
  <Card className="h-fit p-4">
    <div className="mb-3 border-b border-border pb-3">
      <p className="text-sm font-semibold">PO sub-sections</p>
      <p className="mt-1 text-sm text-muted-foreground">Navigate between template, layout, numbering, and terms.</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      {items.map((item) => (
        <NavigationButton key={item.id} item={item} active={item.id === activeId} onClick={() => onChange(item.id)} compact />
      ))}
    </div>
  </Card>
);
