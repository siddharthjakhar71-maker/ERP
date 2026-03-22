import crypto from 'node:crypto';
import { Router } from 'express';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { passwordResets, userProfiles, users } from '../../../shared/schema/index.js';
import { db } from '../db/client.js';
import { createSessionToken, hashPassword, verifyPassword } from '../utils/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';
import { validate } from '../utils/validate.js';

const router = Router();
const resetLinkBaseUrl = 'http://localhost:5173/reset-password';
const resetTokenTtlMs = 1000 * 60 * 30;

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    rememberMe: z.boolean().optional(),
  }),
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1),
      newPassword: z.string().min(8),
      confirmPassword: z.string().min(8).optional(),
    })
    .refine((value) => !value.confirmPassword || value.newPassword === value.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
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
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.trim().toLowerCase();
    console.log('FORGOT PASSWORD HIT', { email });

    const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);

    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + resetTokenTtlMs);
      const resetLink = `${resetLinkBaseUrl}/${token}`;

      await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));
      await db.insert(passwordResets).values({
        id: crypto.randomUUID(),
        userId: user.id,
        token,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('RESET TOKEN', token);
      console.log('RESET LINK', resetLink);
    }

    ok(res, null, 'If an account exists for that email, a reset link has been generated.');
  }),
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const now = new Date();

    const [resetRecord] = await db
      .select({ id: passwordResets.id, userId: passwordResets.userId, expiresAt: passwordResets.expiresAt })
      .from(passwordResets)
      .where(and(eq(passwordResets.token, token), gt(passwordResets.expiresAt, now)))
      .limit(1);

    if (!resetRecord) {
      throw new ApiError(400, 'Reset link is invalid or has expired');
    }

    const nextPasswordHash = await hashPassword(newPassword);

    await db.update(users).set({ passwordHash: nextPasswordHash, updatedAt: now }).where(eq(users.id, resetRecord.userId));
    await db.delete(passwordResets).where(eq(passwordResets.id, resetRecord.id));

    ok(res, null, 'Password reset successful');
  }),
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    ok(res, null, 'Logout successful');
  }),
);

export default router;
