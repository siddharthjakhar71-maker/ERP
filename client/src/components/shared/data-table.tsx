import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (row: T) => ReactNode;
}

export const DataTable = <T extends { id: string }>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) => (
  <Card className="overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/60">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-5 py-4 text-left font-medium text-muted-foreground">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-accent/60">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-5 py-4 align-top">
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);
