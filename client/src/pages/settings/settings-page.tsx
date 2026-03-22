import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { useSettings } from '@/hooks/use-settings';

export const SettingsPage = () => {
  const { data } = useSettings();

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Company identity, numbering controls, and workspace preferences." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Company profile</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Company Name</dt><dd>{data?.companyName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Procurement Email</dt><dd>{data?.procurementEmail}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Fiscal Year Start</dt><dd>Month {data?.fiscalYearStartMonth}</dd></div>
          </dl>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Numbering configuration</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">PO Prefix</dt><dd>{data?.purchaseOrderPrefix}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">GRN Prefix</dt><dd>{data?.grnPrefix}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Bill Prefix</dt><dd>{data?.billPrefix}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Payment Prefix</dt><dd>{data?.paymentPrefix}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
};
