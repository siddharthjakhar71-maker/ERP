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
  unitTouched?: boolean;
  rateTouched?: boolean;
  descriptionTouched?: boolean;
}

interface PurchaseOrderItemsTableProps {
  items: PurchaseOrderItemDraft[];
  materials: MaterialRecord[];
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: <K extends keyof PurchaseOrderItemDraft>(index: number, field: K, value: PurchaseOrderItemDraft[K]) => void;
  onMaterialSelect: (index: number, materialId: string) => void;
}

const round = (value: number) => Number(value.toFixed(2));
const cellInputClassName = 'min-w-0';

export const PurchaseOrderItemsTable = ({ items, materials, disabled, onAdd, onRemove, onChange, onMaterialSelect }: PurchaseOrderItemsTableProps) => (
  <div className="space-y-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Line items</h3>
        <p className="text-sm text-muted-foreground">Use the full-width table below for material selection, pricing, tax, and amount calculation across multiple PO lines.</p>
      </div>
      <Button type="button" variant="outline" onClick={onAdd} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" /> Add item
      </Button>
    </div>

    <div className="overflow-hidden rounded-3xl border border-border bg-card/40">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] divide-y divide-border text-sm">
          <thead className="bg-muted/60">
            <tr>
              {['Material', 'Description', 'Qty', 'Unit', 'Rate', 'Tax %', 'Amount', 'Remove'].map((label) => (
                <th key={label} className="px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {items.map((item, index) => {
              const amount = round(item.qty * item.rate);
              return (
                <tr key={`item-${index}`} className="align-top">
                  <td className="w-[240px] min-w-[240px] px-4 py-3">
                    <select
                      className="h-11 w-full min-w-0 rounded-2xl border border-input bg-background px-4 text-sm"
                      value={item.materialId}
                      disabled={disabled}
                      onChange={(event) => onMaterialSelect(index, event.target.value)}
                    >
                      <option value="">Select material</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>{material.name} • {material.materialCode}</option>
                      ))}
                    </select>
                  </td>
                  <td className="w-[320px] min-w-[320px] px-4 py-3">
                    <Input className={cellInputClassName} value={item.description} disabled={disabled} onChange={(event) => onChange(index, 'description', event.target.value)} />
                  </td>
                  <td className="w-[120px] min-w-[120px] px-4 py-3">
                    <Input className={cellInputClassName} type="number" min="0" step="0.01" value={item.qty} disabled={disabled} onChange={(event) => onChange(index, 'qty', Number(event.target.value))} />
                  </td>
                  <td className="w-[120px] min-w-[120px] px-4 py-3">
                    <Input className={cellInputClassName} value={item.unit} disabled={disabled} onChange={(event) => onChange(index, 'unit', event.target.value)} />
                  </td>
                  <td className="w-[140px] min-w-[140px] px-4 py-3">
                    <Input className={cellInputClassName} type="number" min="0" step="0.01" value={item.rate} disabled={disabled} onChange={(event) => onChange(index, 'rate', Number(event.target.value))} />
                  </td>
                  <td className="w-[120px] min-w-[120px] px-4 py-3">
                    <Input className={cellInputClassName} type="number" min="0" max="100" step="0.01" value={item.taxPercent} disabled={disabled} onChange={(event) => onChange(index, 'taxPercent', Number(event.target.value))} />
                  </td>
                  <td className="w-[140px] min-w-[140px] px-4 py-3 font-medium text-foreground">{amount.toFixed(2)}</td>
                  <td className="w-[96px] min-w-[96px] px-4 py-3">
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
  </div>
);
