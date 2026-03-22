import type { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from './http.js';

export const validate = <T>(schema: ZodSchema<T>): RequestHandler => (req, _res, next) => {
  const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!parsed.success) {
    return next(new ApiError(400, 'Validation failed', parsed.error.flatten()));
  }

  req.body = parsed.data.body;
  req.query = parsed.data.query as RequestHandler['query'];
  req.params = parsed.data.params as RequestHandler['params'];
  next();
};
