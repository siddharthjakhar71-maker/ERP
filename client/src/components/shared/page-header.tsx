import type { ReactNode } from 'react';

export const PageHeader = ({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) => (
  <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
    {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
  </div>
);
