import { randomUUID } from 'node:crypto';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sites } from '../../../shared/schema/index.js';
import type { SitePayload } from '../validation/sites.validation.js';
import { ApiError } from '../utils/http.js';
import { handleDatabaseError } from '../utils/errors.js';

const buildSiteSearch = (query?: string) => {
  if (!query) return undefined;
  const term = `%${query.trim()}%`;
  return or(like(sites.name, term), like(sites.siteCode, term), like(sites.location, term), like(sites.address, term));
};

export class SitesService {
  async list(filters: { status?: string; q?: string }) {
    return db
      .select()
      .from(sites)
      .where(and(filters.status ? eq(sites.status, filters.status as typeof sites.$inferSelect.status) : undefined, buildSiteSearch(filters.q)))
      .orderBy(desc(sites.createdAt));
  }

  async getById(id: string) {
    const [row] = await db.select().from(sites).where(eq(sites.id, id));
    return row ?? null;
  }

  async create(input: SitePayload) {
    try {
      const record = { id: randomUUID(), ...input };
      await db.insert(sites).values(record);
      return this.getById(record.id);
    } catch (error) {
      handleDatabaseError(error, 'Site');
    }
  }

  async update(id: string, input: SitePayload) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ApiError(404, 'Site not found');
    }

    try {
      await db.update(sites).set({ ...input, updatedAt: new Date() }).where(eq(sites.id, id));
      return this.getById(id);
    } catch (error) {
      handleDatabaseError(error, 'Site');
    }
  }

  async remove(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ApiError(404, 'Site not found');
    }

    await db.delete(sites).where(eq(sites.id, id));
    return existing;
  }
}
