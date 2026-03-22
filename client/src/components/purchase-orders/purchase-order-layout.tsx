import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface PurchaseOrderPageLayoutProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const PurchaseOrderPageLayout = ({ eyebrow = 'Procurement', title, description, actions, children, className }: PurchaseOrderPageLayoutProps) => (
  <div className={cn('mx-auto w-full max-w-[1600px] px-6 py-6', className)}>
    <div className="space-y-8">
      <div className="flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <Link
            to="/purchase-orders"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to purchase orders
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children}
    </div>
  </div>
);
