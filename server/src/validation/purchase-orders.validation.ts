import { z } from 'zod';
import { purchaseOrderStatuses } from '../../../shared/schema/index.js';
import { searchQuerySchema } from './common.js';

const numberField = z.coerce.number().finite().min(0);
const dateField = z.string().trim().min(1).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');
const optionalDateField = z.union([z.string().trim().length(0), dateField]).optional().transform((value) => value || undefined);

export const purchaseOrderItemSchema = z.object({
  materialId: z.string().trim().min(1),
  description: z.string().trim().max(300).optional().default(''),
  qty: numberField.positive(),
  unit: z.string().trim().max(30).optional().default(''),
  rate: numberField,
  taxPercent: numberField.max(100),
  receivedQty: numberField.optional().default(0),
});

const purchaseOrderBodySchema = z.object({
  poNumber: z.string().trim().min(2).max(30),
  vendorId: z.string().trim().min(1),
  siteId: z.string().trim().min(1),
  poDate: dateField,
  expectedDeliveryDate: optionalDateField,
  billingAddress: z.string().trim().max(500).optional().default(''),
  shippingAddress: z.string().trim().max(500).optional().default(''),
  discountAmount: numberField.optional().default(0),
  status: z.enum(purchaseOrderStatuses).optional().default('draft'),
  remarks: z.string().trim().max(1000).optional().default(''),
  createdBy: z.string().trim().optional(),
  items: z.array(purchaseOrderItemSchema).min(1),
});

export const purchaseOrderQuerySchema = z.object({
  query: searchQuerySchema.extend({
    status: z.enum(purchaseOrderStatuses).optional(),
  }).default({}),
  body: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const createPurchaseOrderSchema = z.object({
  body: purchaseOrderBodySchema,
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const updatePurchaseOrderSchema = z.object({
  body: purchaseOrderBodySchema,
  query: z.object({}).default({}),
  params: z.object({ id: z.string().trim().min(1) }),
});

export type PurchaseOrderPayload = z.infer<typeof purchaseOrderBodySchema>;
