import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { userProfiles, users } from '../../../shared/schema/index.js';
import { db } from '../db/client.js';
import { ApiError } from './http.js';

const scrypt = promisify(nodeScrypt);
const TOKEN_PREFIX = 'session';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  status: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
}

const parseStoredHash = (value: string) => {
  const [algorithm, salt, hash] = value.split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) {
    throw new ApiError(500, 'Password hash format is invalid');
  }

  return { salt, hash };
};

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
};

const verifyScryptPassword = async (password: string, storedHash: string) => {
  const { salt, hash } = parseStoredHash(storedHash);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hash, 'hex');

  if (stored.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(stored, derived);
};

export const verifyPassword = async (password: string, storedHash: string) => verifyScryptPassword(password, storedHash);

export const createSessionToken = (userId: string) => `${TOKEN_PREFIX}:${userId}`;

export const getSessionUserId = (authorization?: string | null) => {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length);
  if (!token.startsWith(`${TOKEN_PREFIX}:`)) {
    return null;
  }

  return token.slice(`${TOKEN_PREFIX}:`.length) || null;
};

export const getAuthenticatedUser = async (req: Request): Promise<AuthenticatedUser> => {
  const userId = getSessionUserId(req.header('authorization'));
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const [record] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      fullName: userProfiles.fullName,
      phone: userProfiles.phone,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!record || record.status !== 'active') {
    throw new ApiError(401, 'Active account not found for this session');
  }

  return record;
};
