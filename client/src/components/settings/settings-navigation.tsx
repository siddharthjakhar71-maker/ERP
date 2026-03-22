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
        compact ? 'p-4' : 'p-4',
        active
          ? 'border-primary/30 bg-primary/10 text-foreground shadow-sm'
          : 'border-border bg-background hover:border-primary/20 hover:bg-accent/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-xl p-2', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium">{item.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        </div>
      </div>
    </button>
  );
};

export const SettingsSectionNav = ({ items, activeId, onChange }: NavigationProps) => (
  <Card className="p-4">
    <div className="mb-4 border-b border-border pb-4">
      <p className="text-sm font-semibold">Settings sections</p>
      <p className="mt-1 text-sm text-muted-foreground">Choose a primary area to manage JAKHIRA ERP preferences.</p>
    </div>
    <div className="space-y-3">
      {items.map((item) => (
        <NavigationButton key={item.id} item={item} active={item.id === activeId} onClick={() => onChange(item.id)} />
      ))}
    </div>
  </Card>
);

export const SettingsSubSectionNav = ({ items, activeId, onChange }: NavigationProps) => (
  <Card className="h-fit p-4">
    <div className="mb-4 border-b border-border pb-4">
      <p className="text-sm font-semibold">PO sub-sections</p>
      <p className="mt-1 text-sm text-muted-foreground">Navigate between template, layout, numbering, and terms.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {items.map((item) => (
        <NavigationButton key={item.id} item={item} active={item.id === activeId} onClick={() => onChange(item.id)} compact />
      ))}
    </div>
  </Card>
);
