import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export const asyncHandler =
  <T extends Request>(handler: (req: T, res: Response, next: NextFunction) => Promise<void>) =>
  (req: T, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };

export const ok = <T>(res: Response, data: T, message = 'OK') => {
  res.json({ success: true, message, data });
};
