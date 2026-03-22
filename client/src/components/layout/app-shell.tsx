import type { PropsWithChildren } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';

export const AppShell = ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-muted/40 lg:grid lg:grid-cols-[auto_1fr]">
    <Sidebar />
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
    </div>
  </div>
);
