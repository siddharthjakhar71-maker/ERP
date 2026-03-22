import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export const ModuleToolbar = ({ filters, meta }: { filters: ReactNode; meta?: ReactNode }) => (
  <Card className="p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-4 sm:flex-row">{filters}</div>
      {meta ? <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{meta}</div> : null}
    </div>
  </Card>
);
