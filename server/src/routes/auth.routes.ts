import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../utils/http.js';
import { validate } from '../utils/validate.js';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    rememberMe: z.boolean().optional(),
  }),
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    ok(
      res,
      {
        token: 'demo-session-token',
        user: {
          id: 'usr_admin',
          fullName: 'Anika Sharma',
          role: 'purchase_manager',
          email: req.body.email,
        },
      },
      'Login successful',
    );
  }),
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    ok(res, null, 'Logout successful');
  }),
);

export default router;
