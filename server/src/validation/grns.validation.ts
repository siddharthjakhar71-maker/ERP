import { z } from 'zod';
import { grnStatuses } from '../../../shared/schema/index.js';
import { searchQuerySchema } from './common.js';

const numberField = z.coerce.number().finite().min(0);
const dateField = z.string().trim().min(1).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');
const optionalDateField = z.union([z.string().trim().length(0), dateField]).optional().transform((value) => value || undefined);

export const grnItemSchema = z.object({
  purchaseOrderItemId: z.string().trim().min(1),
  materialId: z.string().trim().min(1),
  description: z.string().trim().max(300).optional().default(''),
  orderedQty: numberField,
  previouslyReceivedQty: numberField,
  pendingQty: numberField,
  receivedQty: numberField.positive(),
  unit: z.string().trim().max(30).optional().default(''),
  remarks: z.string().trim().max(300).optional().default(''),
});

const grnBodySchema = z.object({
  grnNumber: z.string().trim().min(2).max(30),
  purchaseOrderId: z.string().trim().min(1),
  vendorId: z.string().trim().min(1),
  siteId: z.string().trim().min(1),
  grnDate: dateField,
  receivedAt: dateField,
  invoiceNumber: z.string().trim().max(100).optional().default(''),
  invoiceDate: optionalDateField,
  status: z.enum(grnStatuses).optional().default('posted'),
  notes: z.string().trim().max(1000).optional().default(''),
  createdBy: z.string().trim().optional(),
  items: z.array(grnItemSchema).min(1),
});

export const grnQuerySchema = z.object({
  query: searchQuerySchema.extend({
    purchaseOrderId: z.string().trim().optional(),
    status: z.enum(grnStatuses).optional(),
  }).default({}),
  body: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const createGrnSchema = z.object({ body: grnBodySchema, query: z.object({}).default({}), params: z.object({}).default({}) });
export const updateGrnSchema = z.object({ body: grnBodySchema, query: z.object({}).default({}), params: z.object({ id: z.string().trim().min(1) }) });
export type GrnPayload = z.infer<typeof grnBodySchema>;
