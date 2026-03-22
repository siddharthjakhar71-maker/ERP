import { z } from 'zod';
import { searchQuerySchema } from './common.js';

const vendorStatusSchema = z.enum(['active', 'inactive', 'on_hold']);

const vendorBodySchema = z.object({
  vendorCode: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  contactPerson: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().max(20).optional().default(''),
  email: z.string().trim().email().max(120).optional().or(z.literal('')).default(''),
  gstin: z.string().trim().max(30).optional().default(''),
  state: z.string().trim().max(80).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  openingBalance: z.coerce.number().min(0).max(100000000).default(0),
  status: vendorStatusSchema,
  remarks: z.string().trim().max(500).optional().default(''),
});

export const vendorQuerySchema = z.object({
  query: searchQuerySchema.extend({
    status: vendorStatusSchema.optional(),
  }).default({}),
  body: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const createVendorSchema = z.object({
  body: vendorBodySchema,
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const updateVendorSchema = z.object({
  body: vendorBodySchema,
  query: z.object({}).default({}),
  params: z.object({
    id: z.string().min(1),
  }),
});

export type VendorPayload = z.infer<typeof vendorBodySchema>;
