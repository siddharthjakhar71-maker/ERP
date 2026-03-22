import type { ReactNode } from 'react';

export const GrnPageLayout = ({ eyebrow, title, description, actions, children }: { eyebrow: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) => (
  <div className="space-y-8">
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card/80 p-6 shadow-soft lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
    {children}
  </div>
);
