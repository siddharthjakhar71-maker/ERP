export interface DashboardMetric {
  label: string;
  value: number | string;
  change: string;
}

export interface DashboardSnapshot {
  summary: DashboardMetric[];
  monthlyPurchases: { month: string; amount: number }[];
  vendorBreakdown: { name: string; value: number }[];
  activities: { id: string; title: string; description: string; time: string }[];
}

export interface VendorRecord {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive' | 'on_hold';
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  paymentTermsDays: number;
  openingBalance: number;
  outstandingBalance: number;
  recentTransactions: { type: string; ref: string; amount: number; status: string }[];
}

export interface SettingsRecord {
  companyName: string;
  procurementEmail: string;
  purchaseOrderPrefix: string;
  grnPrefix: string;
  billPrefix: string;
  paymentPrefix: string;
  fiscalYearStartMonth: number;
  themePreference: string;
}
