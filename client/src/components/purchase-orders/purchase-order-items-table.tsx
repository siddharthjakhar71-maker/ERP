import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MaterialRecord } from '@/types';

export interface PurchaseOrderItemDraft {
  materialId: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  taxPercent: number;
  receivedQty: number;
}

interface PurchaseOrderItemsTableProps {
  items: PurchaseOrderItemDraft[];
  materials: MaterialRecord[];
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: <K extends keyof PurchaseOrderItemDraft>(index: number, field: K, value: PurchaseOrderItemDraft[K]) => void;
}

const round = (value: number) => Number(value.toFixed(2));

export const PurchaseOrderItemsTable = ({ items, materials, disabled, onAdd, onRemove, onChange }: PurchaseOrderItemsTableProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold">Line items</h3>
        <p className="text-xs text-muted-foreground">Add one or more materials with pricing, tax, and fulfillment tracking.</p>
      </div>
      <Button type="button" variant="outline" onClick={onAdd} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" /> Add item
      </Button>
    </div>

    <div className="overflow-x-auto rounded-3xl border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/60">
          <tr>
            {['Material', 'Description', 'Qty', 'Unit', 'Rate', 'Tax %', 'Tax', 'Line total', ''].map((label) => (
              <th key={label} className="px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {items.map((item, index) => {
            const taxAmount = round((item.qty * item.rate * item.taxPercent) / 100);
            const lineTotal = round(item.qty * item.rate + taxAmount);
            return (
              <tr key={`item-${index}`} className="align-top">
                <td className="min-w-48 px-4 py-3">
                  <select
                    className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
                    value={item.materialId}
                    disabled={disabled}
                    onChange={(event) => {
                      const material = materials.find((entry) => entry.id === event.target.value);
                      onChange(index, 'materialId', event.target.value);
                      if (material) {
                        onChange(index, 'description', material.description || material.name);
                        onChange(index, 'unit', material.unit);
                      }
                    }}
                  >
                    <option value="">Select material</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>{material.name} • {material.materialCode}</option>
                    ))}
                  </select>
                </td>
                <td className="min-w-56 px-4 py-3">
                  <Input value={item.description} disabled={disabled} onChange={(event) => onChange(index, 'description', event.target.value)} />
                </td>
                <td className="w-28 px-4 py-3">
                  <Input type="number" min="0" step="0.01" value={item.qty} disabled={disabled} onChange={(event) => onChange(index, 'qty', Number(event.target.value))} />
                </td>
                <td className="w-28 px-4 py-3">
                  <Input value={item.unit} disabled={disabled} onChange={(event) => onChange(index, 'unit', event.target.value)} />
                </td>
                <td className="w-32 px-4 py-3">
                  <Input type="number" min="0" step="0.01" value={item.rate} disabled={disabled} onChange={(event) => onChange(index, 'rate', Number(event.target.value))} />
                </td>
                <td className="w-28 px-4 py-3">
                  <Input type="number" min="0" max="100" step="0.01" value={item.taxPercent} disabled={disabled} onChange={(event) => onChange(index, 'taxPercent', Number(event.target.value))} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{taxAmount.toFixed(2)}</td>
                <td className="px-4 py-3 font-medium">{lineTotal.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Button type="button" variant="ghost" size="icon" disabled={disabled || items.length === 1} onClick={() => onRemove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
