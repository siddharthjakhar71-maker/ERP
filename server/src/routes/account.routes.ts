import { Router } from 'express';
import { z } from 'zod';
import { AccountService } from '../services/account.service.js';
import { getAuthenticatedUser } from '../utils/auth.js';
import { asyncHandler, ok } from '../utils/http.js';
import { validate } from '../utils/validate.js';

const router = Router();
const service = new AccountService();

const emptyShape = z.object({}).default({});

const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Full name is required').max(120, 'Full name is too long'),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z.string().trim().max(30, 'Phone number is too long').optional().or(z.literal('')),
    avatarUrl: z.union([z.string().trim().url('Enter a valid avatar URL'), z.literal(''), z.null()]).optional(),
  }),
  query: emptyShape,
  params: emptyShape,
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128, 'New password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  }).superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
    }
    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'New password must be different from current password', path: ['newPassword'] });
    }
  }),
  query: emptyShape,
  params: emptyShape,
});

router.get('/me', asyncHandler(async (req, res) => {
  const user = await getAuthenticatedUser(req);
  ok(res, await service.getMe(user));
}));

router.patch('/profile', validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const user = await getAuthenticatedUser(req);
  ok(res, await service.updateProfile(user, req.body), 'Profile updated successfully');
}));

router.post('/change-password', validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const user = await getAuthenticatedUser(req);
  ok(res, await service.changePassword(user.id, req.body.currentPassword, req.body.newPassword), 'Password updated successfully');
}));

export default router;
