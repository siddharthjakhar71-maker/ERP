import type { PurchaseOrderStatus } from '@/types';

interface StatusSelectProps {
  value: PurchaseOrderStatus;
  onChange?: (value: PurchaseOrderStatus) => void;
  disabled?: boolean;
  name?: string;
}

const options: PurchaseOrderStatus[] = ['draft', 'issued', 'partially_received', 'received', 'cancelled'];
const labels: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  partially_received: 'Partially received',
  received: 'Received',
  cancelled: 'Cancelled',
};

export const StatusSelect = ({ value, onChange, disabled, name }: StatusSelectProps) => (
  <select
    name={name}
    className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
    value={value}
    disabled={disabled}
    onChange={(event) => onChange?.(event.target.value as PurchaseOrderStatus)}
  >
    {options.map((option) => (
      <option key={option} value={option}>{labels[option]}</option>
    ))}
  </select>
);
