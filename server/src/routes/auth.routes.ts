import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { userProfiles, users } from '../../../shared/schema/index.js';
import { db } from '../db/client.js';
import { createSessionToken, verifyPassword } from '../utils/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';
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
    const email = req.body.email.trim().toLowerCase();
    const [record] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        status: users.status,
        fullName: userProfiles.fullName,
        phone: userProfiles.phone,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.email, email))
      .limit(1);

    if (!record || record.status !== 'active') {
      throw new ApiError(401, 'Invalid email or password');
    }

    const passwordMatches = await verifyPassword(req.body.password, record.passwordHash);
    if (!passwordMatches) {
      throw new ApiError(401, 'Invalid email or password');
    }

    await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, record.id));

    ok(
      res,
      {
        token: createSessionToken(record.id),
        user: {
          id: record.id,
          fullName: record.fullName,
          role: record.role,
          email: record.email,
          phone: record.phone,
          avatarUrl: record.avatarUrl,
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
