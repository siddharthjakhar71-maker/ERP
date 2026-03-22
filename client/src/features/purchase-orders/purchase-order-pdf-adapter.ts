import type { PoLayoutSettings, PoTemplateSettings, PoThemeSettings, PurchaseOrderRecord } from '@/types';

export interface PurchaseOrderPdfLineItem {
  materialLabel: string;
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  tax: string;
  amount: string;
}

export interface PurchaseOrderPdfField {
  key: string;
  label: string;
  value: string;
}

export interface PurchaseOrderPdfDocument {
  poNumber: string;
  status: string;
  orderDate: string;
  expectedDate: string;
  vendorDetails: string[];
  siteDetails: string[];
  billingAddress: string[];
  shippingAddress: string[];
  remarks: string[];
  lineItems: PurchaseOrderPdfLineItem[];
  subtotal: string;
  discount: string;
  tax: string;
  grandTotal: string;
  preparedBy: string;
  signatoryLabel: string;
  detailFields: PurchaseOrderPdfField[];
  settings: {
    theme: PoThemeSettings;
    template: PoTemplateSettings;
    layout: PoLayoutSettings;
  };
}

const currency = (value: number, theme: PoThemeSettings) => {
  const formatted = new Intl.NumberFormat(theme.currencyLocale, {
    style: 'currency',
    currency: theme.currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
  return formatted.replace(/₹|â‚¹|Rs\.?/g, theme.currencyLabel).replace(/\s+/g, ' ').trim();
};

const toDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : 'Not set';
const compactLines = (...values: Array<string | null | undefined>) => values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));

export const adaptPurchaseOrderToPdfDocument = (
  purchaseOrder: PurchaseOrderRecord,
  settings: PurchaseOrderPdfDocument['settings'],
): PurchaseOrderPdfDocument => ({
  poNumber: purchaseOrder.poNumber,
  status: purchaseOrder.status.toUpperCase(),
  orderDate: toDate(purchaseOrder.poDate),
  expectedDate: toDate(purchaseOrder.expectedDeliveryDate),
  vendorDetails: compactLines(
    purchaseOrder.vendor.name,
    `Code: ${purchaseOrder.vendor.vendorCode}`,
    purchaseOrder.vendor.address,
    purchaseOrder.vendor.phone ? `Phone: ${purchaseOrder.vendor.phone}` : undefined,
    purchaseOrder.vendor.email ? `Email: ${purchaseOrder.vendor.email}` : undefined,
  ),
  siteDetails: compactLines(
    purchaseOrder.site.name,
    `Code: ${purchaseOrder.site.siteCode}`,
    purchaseOrder.site.address,
    purchaseOrder.site.location ? `Location: ${purchaseOrder.site.location}` : undefined,
  ),
  billingAddress: compactLines(...(purchaseOrder.billingAddress ? purchaseOrder.billingAddress.split('\n') : ['Not provided'])),
  shippingAddress: compactLines(...(purchaseOrder.shippingAddress ? purchaseOrder.shippingAddress.split('\n') : ['Not provided'])),
  remarks: compactLines(...(purchaseOrder.remarks ? purchaseOrder.remarks.split('\n') : ['No remarks'])),
  lineItems: purchaseOrder.items.map((item) => ({
    materialLabel: `${item.material.name} (${item.material.materialCode})`,
    description: item.description || item.material.name,
    quantity: item.qty.toFixed(2),
    unit: item.unit || '-',
    rate: currency(item.rate, settings.theme),
    tax: `${item.taxPercent.toFixed(2)}%`,
    amount: currency(item.lineTotal, settings.theme),
  })),
  subtotal: currency(purchaseOrder.subtotal, settings.theme),
  discount: currency(purchaseOrder.discountAmount, settings.theme),
  tax: currency(purchaseOrder.taxAmount, settings.theme),
  grandTotal: currency(purchaseOrder.totalAmount, settings.theme),
  preparedBy: 'Prepared By',
  signatoryLabel: 'Authorized Signatory',
  detailFields: [
    { key: 'projectName', label: 'Project Name', value: purchaseOrder.site.name },
    { key: 'projectAddress', label: 'Project Address', value: purchaseOrder.site.address || 'Not provided' },
    { key: 'poNumber', label: 'PO Number', value: purchaseOrder.poNumber },
    { key: 'poDate', label: 'PO Date', value: toDate(purchaseOrder.poDate) },
    { key: 'billingName', label: 'Billing Name', value: purchaseOrder.vendor.name },
    { key: 'billingAddress', label: 'Billing Address', value: purchaseOrder.billingAddress || 'Not provided' },
    { key: 'expectedDate', label: 'Expected Delivery', value: toDate(purchaseOrder.expectedDeliveryDate) },
    { key: 'siteCode', label: 'Site Code', value: purchaseOrder.site.siteCode },
  ],
  settings,
});
