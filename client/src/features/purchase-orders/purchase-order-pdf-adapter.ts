import type { PurchaseOrderRecord } from '@/types';

export interface PurchaseOrderPdfLineItem {
  materialLabel: string;
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  tax: string;
  amount: string;
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
}

const currency = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(value).replace(/₹|â‚¹/g, '\u20B9');

const toDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : 'Not set';
const compactLines = (...values: Array<string | null | undefined>) => values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));

export const adaptPurchaseOrderToPdfDocument = (purchaseOrder: PurchaseOrderRecord): PurchaseOrderPdfDocument => ({
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
  remarks: compactLines(...(purchaseOrder.remarks ? purchaseOrder.remarks.split('\n') : ['No remarks'])) ,
  lineItems: purchaseOrder.items.map((item) => ({
    materialLabel: `${item.material.name} (${item.material.materialCode})`,
    description: item.description || item.material.name,
    quantity: item.qty.toFixed(2),
    unit: item.unit || '-',
    rate: currency(item.rate),
    tax: `${item.taxPercent.toFixed(2)}%`,
    amount: currency(item.lineTotal),
  })),
  subtotal: currency(purchaseOrder.subtotal),
  discount: currency(purchaseOrder.discountAmount),
  tax: currency(purchaseOrder.taxAmount),
  grandTotal: currency(purchaseOrder.totalAmount),
});
