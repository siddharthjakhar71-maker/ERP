import { Link } from '@tanstack/react-router';
import type { ComponentProps, ReactNode } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tooltipBaseClassName = 'pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100';
const iconClassName = 'h-4 w-4';

const ActionTooltip = ({ label }: { label: string }) => (
  <span role="tooltip" className={tooltipBaseClassName}>
    {label}
  </span>
);

export const TableActionButtons = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center justify-center gap-1 whitespace-nowrap">{children}</div>
);

export const TableActionButton = ({
  label,
  variant = 'ghost',
  className,
  icon,
  ...props
}: ComponentProps<typeof Button> & { label: string; icon: ReactNode }) => (
  <div className="group relative inline-flex">
    <Button
      type="button"
      size="icon"
      variant={variant}
      aria-label={label}
      className={cn('h-8 w-8 rounded-xl', className)}
      {...props}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </Button>
    <ActionTooltip label={label} />
  </div>
);

export const TableActionLink = ({
  label,
  to,
  params,
  search,
  className,
  icon,
}: {
  label: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  className?: string;
  icon: ReactNode;
}) => {
  const linkProps = { to, params, search } as any;

  return (
    <div className="group relative inline-flex">
      <Link
        {...linkProps}
        aria-label={label}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8 rounded-xl', className)}
      >
        {icon}
        <span className="sr-only">{label}</span>
      </Link>
      <ActionTooltip label={label} />
    </div>
  );
};

export const tableActionIcons = {
  view: <Eye className={iconClassName} />,
  edit: <Pencil className={iconClassName} />,
  delete: <Trash2 className={cn(iconClassName, 'text-destructive')} />,
};
