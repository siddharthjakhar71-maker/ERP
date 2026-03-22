import type { CSSProperties, PropsWithChildren } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { useUiStore } from '@/store/ui-store';

const SIDEBAR_WIDTH = 288;
const SIDEBAR_COLLAPSED_WIDTH = 96;

export const AppShell = ({ children }: PropsWithChildren) => {
  const { sidebarCollapsed } = useUiStore();
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div
      className="h-screen overflow-hidden bg-muted/40"
      style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <Sidebar />
      <div className="flex h-screen min-h-0 flex-col lg:pl-[var(--sidebar-width)]">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
};
