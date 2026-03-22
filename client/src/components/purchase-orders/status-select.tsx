import type { PurchaseOrderStatus } from '@/types';

interface StatusSelectProps {
  value: PurchaseOrderStatus;
  onChange?: (value: PurchaseOrderStatus) => void;
  disabled?: boolean;
  name?: string;
}

const options: PurchaseOrderStatus[] = ['draft', 'approved', 'partial', 'completed', 'cancelled'];

export const StatusSelect = ({ value, onChange, disabled, name }: StatusSelectProps) => (
  <select
    name={name}
    className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
    value={value}
    disabled={disabled}
    onChange={(event) => onChange?.(event.target.value as PurchaseOrderStatus)}
  >
    {options.map((option) => (
      <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
    ))}
  </select>
);
