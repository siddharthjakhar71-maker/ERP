import { Building2, ChartColumn, ClipboardList, FileStack, LayoutDashboard, Package, Receipt, Settings, Truck, Wallet } from 'lucide-react';
import { NavLink } from '@/components/layout/nav-link';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

const items = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Vendors', href: '/vendors', icon: Truck },
  { label: 'Materials', href: '/materials', icon: Package },
  { label: 'Sites', href: '/sites', icon: Building2 },
  { label: 'Purchase', href: '/purchase-orders', icon: ClipboardList },
  { label: 'GRN', href: '/grn', icon: FileStack },
  { label: 'Bills', href: '/bills', icon: Receipt },
  { label: 'Payments', href: '/payments', icon: Wallet },
  { label: 'Stock', href: '/stock', icon: Package },
  { label: 'Reports', href: '/reports', icon: ChartColumn },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const { sidebarCollapsed } = useUiStore();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden h-screen flex-col border-r border-border bg-card/95 px-4 py-5 backdrop-blur lg:flex',
        sidebarCollapsed ? 'w-24' : 'w-72',
      )}
    >
      <div className="flex items-center gap-3 rounded-3xl border border-border bg-background p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">J</div>
        {!sidebarCollapsed ? (
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">JAKHIRA</p>
            <p className="text-sm font-semibold">ERP Control Center</p>
          </div>
        ) : null}
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-2 overflow-y-auto">
        {items.map((item) => (
          <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>
      <div className="rounded-3xl border border-border bg-background p-4 text-sm text-muted-foreground">
        {!sidebarCollapsed ? 'Procurement visibility for every site, vendor, and payable.' : 'ERP'}
      </div>
    </aside>
  );
};
