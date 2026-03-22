import { eq } from 'drizzle-orm';
import { userProfiles, users } from '../../../shared/schema/index.js';
import { db } from '../db/client.js';
import type { AuthenticatedUser } from '../utils/auth.js';
import { hashPassword, verifyPassword } from '../utils/auth.js';
import { ApiError } from '../utils/http.js';

export interface AccountProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phone: string | null;
  avatarUrl: string | null;
}

export interface UpdateProfileInput {
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export class AccountService {
  async getMe(user: AuthenticatedUser): Promise<AccountProfile> {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }

  async updateProfile(user: AuthenticatedUser, input: UpdateProfileInput): Promise<AccountProfile> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.fullName.trim();
    const normalizedPhone = input.phone?.trim() ? input.phone.trim() : null;
    const normalizedAvatarUrl = input.avatarUrl?.trim() ? input.avatarUrl.trim() : null;

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser && existingUser.id !== user.id) {
      throw new ApiError(409, 'Email address is already in use');
    }

    const now = new Date();

    await db.update(users).set({ email: normalizedEmail, updatedAt: now }).where(eq(users.id, user.id));
    await db.update(userProfiles).set({ fullName: normalizedName, phone: normalizedPhone, avatarUrl: normalizedAvatarUrl, updatedAt: now }).where(eq(userProfiles.userId, user.id));

    return {
      id: user.id,
      email: normalizedEmail,
      fullName: normalizedName,
      role: user.role,
      status: user.status,
      phone: normalizedPhone,
      avatarUrl: normalizedAvatarUrl,
    };
  }

  async changePassword(userId: string, currentPassword: string, nextPassword: string) {
    const [record] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
    if (!record) {
      throw new ApiError(404, 'Account not found');
    }

    const passwordMatches = await verifyPassword(currentPassword, record.passwordHash);
    if (!passwordMatches) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(nextPassword);
    await db.update(users).set({ passwordHash: newPasswordHash, updatedAt: new Date() }).where(eq(users.id, userId));

    return {
      forceRelogin: true,
      message: 'Password updated successfully. Please sign in again to continue.',
    };
  }
}
