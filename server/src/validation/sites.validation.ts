import { z } from 'zod';
import { searchQuerySchema } from './common.js';

const siteStatusSchema = z.enum(['active', 'inactive']);

const siteBodySchema = z.object({
  siteCode: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().max(120).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  status: siteStatusSchema,
});

export const siteQuerySchema = z.object({
  query: searchQuerySchema.extend({
    status: siteStatusSchema.optional(),
  }).default({}),
  body: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const createSiteSchema = z.object({
  body: siteBodySchema,
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

export const updateSiteSchema = z.object({
  body: siteBodySchema,
  query: z.object({}).default({}),
  params: z.object({ id: z.string().min(1) }),
});

export type SitePayload = z.infer<typeof siteBodySchema>;
