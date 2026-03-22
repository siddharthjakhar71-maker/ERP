import { z } from 'zod';
import { searchQuerySchema } from './common.js';

const vendorStatusSchema = z.enum(['active', 'inactive', 'on_hold']);

const vendorBodySchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  contactPerson: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(6).max(20),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().max(80).optional().default(''),
  paymentTermsDays: z.coerce.number().int().min(0).max(365),
  status: vendorStatusSchema,
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
