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
  vendorCode: string;
  name: string;
  status: VendorStatus;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  city: string | null;
  state?: string | null;
  address?: string | null;
  openingBalance: number;
  outstandingBalance: number;
  remarks?: string | null;
  recentTransactions: { type: string; ref: string; amount: number; status: string }[];
}

export interface VendorPayload {
  vendorCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  state: string;
  city: string;
  address: string;
  openingBalance: number;
  status: VendorStatus;
  remarks: string;
}

export interface MaterialRecord {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  subcategory?: string | null;
  unit: string;
  hsnCode?: string | null;
  description?: string | null;
  status: ModuleStatus;
}

export type MaterialPayload = Omit<MaterialRecord, 'id'>;

export interface SiteRecord {
  id: string;
  siteCode: string;
  name: string;
  location?: string | null;
  address?: string | null;
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
