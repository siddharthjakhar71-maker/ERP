import { z } from 'zod';
import { searchQuerySchema } from './common.js';

const materialStatusSchema = z.enum(['active', 'inactive']);

const materialBodySchema = z.object({
  materialCode: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  subcategory: z.string().trim().max(80).optional().default(''),
  unit: z.string().trim().min(1).max(30),
  hsnCode: z.string().trim().max(30).optional().default(''),
  description: z.string().trim().max(300).optional().default(''),
  status: materialStatusSchema,
});

export const materialQuerySchema = z.object({
  query: searchQuerySchema.extend({
    status: materialStatusSchema.optional(),
    category: z.string().trim().optional(),
  }).default({}),
  body: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const createMaterialSchema = z.object({
  body: materialBodySchema,
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const updateMaterialSchema = z.object({
  body: materialBodySchema,
  query: z.object({}).default({}),
  params: z.object({ id: z.string().min(1) }),
});

export type MaterialPayload = z.infer<typeof materialBodySchema>;
