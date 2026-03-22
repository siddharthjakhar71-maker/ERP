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
  defaultRate?: number;
}

export type MaterialPayload = Omit<MaterialRecord, 'id' | 'defaultRate'>;

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

export type PurchaseOrderStatus = 'draft' | 'approved' | 'partial' | 'completed' | 'cancelled';

export interface PurchaseOrderItemPayload {
  materialId: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  taxPercent: number;
  receivedQty?: number;
}

export interface PurchaseOrderPayload {
  poNumber: string;
  vendorId: string;
  siteId: string;
  poDate: string;
  expectedDeliveryDate?: string;
  billingAddress: string;
  shippingAddress: string;
  discountAmount: number;
  status: PurchaseOrderStatus;
  remarks: string;
  createdBy?: string;
  items: PurchaseOrderItemPayload[];
}

export interface PurchaseOrderListRecord {
  id: string;
  poNumber: string;
  vendorId: string;
  siteId: string;
  poDate: string;
  expectedDeliveryDate?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  remarks?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  vendor: { id: string; name: string; vendorCode: string };
  site: { id: string; name: string; siteCode: string };
}

export interface PurchaseOrderItemRecord {
  id: string;
  purchaseOrderId: string;
  materialId: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  receivedQty: number;
  pendingQty: number;
  createdAt: string;
  updatedAt: string;
  material: { id: string; name: string; materialCode: string };
}

export interface PurchaseOrderRecord extends Omit<PurchaseOrderListRecord, 'itemCount'> {
  items: PurchaseOrderItemRecord[];
  vendor: { id: string; name: string; vendorCode: string; address?: string | null; phone?: string | null; email?: string | null };
  site: { id: string; name: string; siteCode: string; address?: string | null; location?: string | null };
}
