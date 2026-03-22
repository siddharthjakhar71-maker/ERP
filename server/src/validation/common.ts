import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().optional(),
});
