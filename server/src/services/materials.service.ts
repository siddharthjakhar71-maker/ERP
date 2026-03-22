import { randomUUID } from 'node:crypto';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { materials } from '../../../shared/schema/index.js';
import type { MaterialPayload } from '../validation/materials.validation.js';
import { ApiError } from '../utils/http.js';
import { handleDatabaseError } from '../utils/errors.js';

const buildMaterialSearch = (query?: string) => {
  if (!query) return undefined;
  const term = `%${query.trim()}%`;
  return or(like(materials.name, term), like(materials.sku, term), like(materials.category, term), like(materials.unit, term));
};

export class MaterialsService {
  async list(filters: { status?: string; category?: string; q?: string }) {
    return db
      .select()
      .from(materials)
      .where(and(filters.status ? eq(materials.status, filters.status as typeof materials.$inferSelect.status) : undefined, filters.category ? eq(materials.category, filters.category) : undefined, buildMaterialSearch(filters.q)))
      .orderBy(desc(materials.createdAt));
  }

  async getById(id: string) {
    const [row] = await db.select().from(materials).where(eq(materials.id, id));
    return row ?? null;
  }

  async create(input: MaterialPayload) {
    try {
      const record = { id: randomUUID(), ...input };
      await db.insert(materials).values(record);
      return this.getById(record.id);
    } catch (error) {
      handleDatabaseError(error, 'Material');
    }
  }

  async update(id: string, input: MaterialPayload) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ApiError(404, 'Material not found');
    }

    try {
      await db.update(materials).set({ ...input, updatedAt: new Date() }).where(eq(materials.id, id));
      return this.getById(id);
    } catch (error) {
      handleDatabaseError(error, 'Material');
    }
  }

  async remove(id: string) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ApiError(404, 'Material not found');
    }

    await db.delete(materials).where(eq(materials.id, id));
    return existing;
  }
}
