import { z } from 'zod';
import { searchQuerySchema } from './common.js';

const siteStatusSchema = z.enum(['active', 'inactive']);

const siteBodySchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().max(120).optional().default(''),
  address: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().max(80).optional().default(''),
  postalCode: z.string().trim().max(20).optional().default(''),
  projectManager: z.string().trim().max(120).optional().default(''),
  status: siteStatusSchema,
});

export const siteQuerySchema = z.object({
  query: searchQuerySchema.extend({
    status: siteStatusSchema.optional(),
    city: z.string().trim().optional(),
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
