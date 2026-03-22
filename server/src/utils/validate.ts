import type { Request, RequestHandler } from 'express';
import { type ZodSchema } from 'zod';
import { ApiError } from './http.js';

export const validate = <T>(schema: ZodSchema<T>): RequestHandler => (req, _res, next) => {
  const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!parsed.success) {
    return next(new ApiError(400, 'Validation failed', parsed.error.flatten()));
  }

  (req as Request).body = (parsed.data as { body: Request['body'] }).body;
  (req as Request).query = (parsed.data as { query: Request['query'] }).query;
  (req as Request).params = (parsed.data as { params: Request['params'] }).params;
  next();
};
