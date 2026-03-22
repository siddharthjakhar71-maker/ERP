import { PackageSearch } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <Card className="flex flex-col items-center justify-center p-10 text-center">
    <div className="rounded-full bg-muted p-4 text-muted-foreground">
      <PackageSearch className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-lg font-semibold">{title}</h3>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
  </Card>
);
