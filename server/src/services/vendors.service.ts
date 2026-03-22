import { randomUUID } from 'node:crypto';
import { and, desc, eq, getTableColumns, like, or, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { vendors } from '../../../shared/schema/index.js';
import type { VendorPayload } from '../validation/vendors.validation.js';
import { ApiError } from '../utils/http.js';
import { handleDatabaseError } from '../utils/errors.js';

const buildVendorSearch = (query?: string) => {
  if (!query) return undefined;
  const term = `%${query.trim()}%`;
  return or(
    like(vendors.name, term),
    like(vendors.vendorCode, term),
    like(vendors.city, term),
    like(vendors.contactPerson, term),
    like(vendors.phone, term),
    like(vendors.email, term),
  );
};

export class VendorsService {
  async list(filters: { status?: string; q?: string }) {
    const where = and(filters.status ? eq(vendors.status, filters.status as typeof vendors.$inferSelect.status) : undefined, buildVendorSearch(filters.q));

    const rows = await db
      .select({
        ...getTableColumns(vendors),
        outstandingBalance: sql<number>`coalesce(${vendors.openingBalance}, 0)`,
      })
      .from(vendors)
      .where(where)
      .orderBy(desc(vendors.createdAt));

    return rows.map((row) => ({ ...row, recentTransactions: [] }));
  }

  async getById(id: string) {
    const [row] = await db
      .select({
        ...getTableColumns(vendors),
        outstandingBalance: sql<number>`coalesce(${vendors.openingBalance}, 0)`,
      })
      .from(vendors)
      .where(eq(vendors.id, id));

    return row ? { ...row, recentTransactions: [] } : null;
  }

  async create(input: VendorPayload) {
    try {
      const record = { id: randomUUID(), ...input };
      await db.insert(vendors).values(record);
      return this.getById(record.id);
    } catch (error) {
      handleDatabaseError(error, 'Vendor');
    }
  }

  async update(id: string, input: VendorPayload) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ApiError(404, 'Vendor not found');
    }

    try {
      await db.update(vendors).set({ ...input, updatedAt: new Date() }).where(eq(vendors.id, id));
      return this.getById(id);
    } catch (error) {
      handleDatabaseError(error, 'Vendor');
    }
  }

  async remove(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ApiError(404, 'Vendor not found');
    }

    await db.delete(vendors).where(eq(vendors.id, id));
    return existing;
  }
}
