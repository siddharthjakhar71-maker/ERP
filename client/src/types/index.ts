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

export type VendorStatus = 'active' | 'inactive' | 'on_hold';
export type ModuleStatus = 'active' | 'inactive';

export interface VendorRecord {
  id: string;
  code: string;
  name: string;
  status: VendorStatus;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  state?: string | null;
  paymentTermsDays: number;
  openingBalance: number;
  outstandingBalance: number;
  recentTransactions: { type: string; ref: string; amount: number; status: string }[];
}

export interface VendorPayload {
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  state?: string;
  paymentTermsDays: number;
  status: VendorStatus;
}

export interface MaterialRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  description?: string | null;
  reorderLevel: number;
  status: ModuleStatus;
}

export type MaterialPayload = Omit<MaterialRecord, 'id'>;

export interface SiteRecord {
  id: string;
  code: string;
  name: string;
  location?: string | null;
  address?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  projectManager?: string | null;
  status: ModuleStatus;
}

export type SitePayload = Omit<SiteRecord, 'id'>;

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
