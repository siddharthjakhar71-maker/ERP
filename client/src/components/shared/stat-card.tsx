import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const StatCard = ({ label, value, change }: { label: string; value: number | string; change: string }) => (
  <Card className="p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-4 text-3xl font-semibold">{value}</p>
      </div>
      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
        <ArrowUpRight className="h-5 w-5" />
      </div>
    </div>
    <p className="mt-5 text-sm text-muted-foreground">{change}</p>
  </Card>
);
