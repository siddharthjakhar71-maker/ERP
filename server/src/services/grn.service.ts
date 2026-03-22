import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, like, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { grnItems, grns, materials, purchaseOrderItems, purchaseOrders, sites, vendors } from '../../../shared/schema/index.js';
import type { GrnPayload } from '../validation/grns.validation.js';
import { handleDatabaseError } from '../utils/errors.js';
import { ApiError } from '../utils/http.js';

const round = (value: number) => Number(value.toFixed(2));
const normalizePoStatus = (status: string) => ({ approved: 'issued', partial: 'partially_received', completed: 'received' }[status] ?? status);
const buildSearch = (query?: string) => {
  if (!query?.trim()) return undefined;
  const term = `%${query.trim()}%`;
  return or(like(grns.grnNumber, term), like(purchaseOrders.poNumber, term), like(vendors.name, term), like(sites.name, term));
};
const computePoStatus = (items: Array<{ qty: number; receivedQty: number }>) => {
  if (items.every((item) => item.receivedQty <= 0)) return 'issued';
  if (items.every((item) => item.receivedQty >= item.qty)) return 'received';
  return 'partially_received';
};

export class GrnService {
  async list(filters: { status?: string; purchaseOrderId?: string; q?: string }) {
    const rows = await db.select({
      id: grns.id, grnNumber: grns.grnNumber, purchaseOrderId: grns.purchaseOrderId, vendorId: grns.vendorId, siteId: grns.siteId, grnDate: grns.grnDate,
      receivedAt: grns.receivedAt, invoiceNumber: grns.invoiceNumber, invoiceDate: grns.invoiceDate, status: grns.status, notes: grns.notes, createdBy: grns.createdBy,
      createdAt: grns.createdAt, updatedAt: grns.updatedAt, poNumber: purchaseOrders.poNumber, vendorName: vendors.name, vendorCode: vendors.vendorCode, siteName: sites.name, siteCode: sites.siteCode,
    }).from(grns)
      .innerJoin(purchaseOrders, eq(grns.purchaseOrderId, purchaseOrders.id))
      .innerJoin(vendors, eq(grns.vendorId, vendors.id))
      .innerJoin(sites, eq(grns.siteId, sites.id))
      .where(and(filters.status ? eq(grns.status, filters.status as typeof grns.$inferSelect.status) : undefined, filters.purchaseOrderId ? eq(grns.purchaseOrderId, filters.purchaseOrderId) : undefined, buildSearch(filters.q)))
      .orderBy(desc(grns.createdAt));

    const ids = rows.map((row) => row.id);
    const items = ids.length ? await db.select({ grnId: grnItems.grnId, receivedQty: grnItems.receivedQty }).from(grnItems).where(inArray(grnItems.grnId, ids)) : [];

    return rows.map((row) => ({
      ...row,
      itemCount: items.filter((item) => item.grnId === row.id).length,
      totalReceivedQty: round(items.filter((item) => item.grnId === row.id).reduce((sum, item) => sum + Number(item.receivedQty), 0)),
      purchaseOrder: { id: row.purchaseOrderId, poNumber: row.poNumber },
      vendor: { id: row.vendorId, name: row.vendorName, vendorCode: row.vendorCode },
      site: { id: row.siteId, name: row.siteName, siteCode: row.siteCode },
    }));
  }

  async getReceiptOptions(purchaseOrderId: string) {
    const [header] = await db.select({
      id: purchaseOrders.id, poNumber: purchaseOrders.poNumber, vendorId: purchaseOrders.vendorId, siteId: purchaseOrders.siteId, poDate: purchaseOrders.poDate,
      expectedDeliveryDate: purchaseOrders.expectedDeliveryDate, billingAddress: purchaseOrders.billingAddress, shippingAddress: purchaseOrders.shippingAddress,
      subtotal: purchaseOrders.subtotal, taxAmount: purchaseOrders.taxAmount, discountAmount: purchaseOrders.discountAmount, totalAmount: purchaseOrders.totalAmount,
      status: purchaseOrders.status, remarks: purchaseOrders.remarks, createdBy: purchaseOrders.createdBy, createdAt: purchaseOrders.createdAt, updatedAt: purchaseOrders.updatedAt,
      vendorName: vendors.name, vendorCode: vendors.vendorCode, siteName: sites.name, siteCode: sites.siteCode,
    }).from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .innerJoin(sites, eq(purchaseOrders.siteId, sites.id))
      .where(eq(purchaseOrders.id, purchaseOrderId));

    if (!header) throw new ApiError(404, 'Purchase order not found');

    const items = await db.select({
      id: purchaseOrderItems.id, purchaseOrderId: purchaseOrderItems.purchaseOrderId, materialId: purchaseOrderItems.materialId, description: purchaseOrderItems.description,
      qty: purchaseOrderItems.qty, unit: purchaseOrderItems.unit, rate: purchaseOrderItems.rate, taxPercent: purchaseOrderItems.taxPercent, taxAmount: purchaseOrderItems.taxAmount,
      lineTotal: purchaseOrderItems.lineTotal, receivedQty: purchaseOrderItems.receivedQty, pendingQty: purchaseOrderItems.pendingQty, createdAt: purchaseOrderItems.createdAt, updatedAt: purchaseOrderItems.updatedAt,
      materialName: materials.name, materialCode: materials.materialCode,
    }).from(purchaseOrderItems)
      .innerJoin(materials, eq(purchaseOrderItems.materialId, materials.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

    return {
      ...header,
      status: normalizePoStatus(header.status),
      vendor: { id: header.vendorId, name: header.vendorName, vendorCode: header.vendorCode },
      site: { id: header.siteId, name: header.siteName, siteCode: header.siteCode },
      items: items.map((item) => ({ ...item, material: { id: item.materialId, name: item.materialName, materialCode: item.materialCode } })),
      receiptEligibleItems: items.filter((item) => Number(item.pendingQty) > 0).map((item) => ({ ...item, material: { id: item.materialId, name: item.materialName, materialCode: item.materialCode } })),
    };
  }

  async getById(id: string) {
    const [header] = await db.select({
      id: grns.id, grnNumber: grns.grnNumber, purchaseOrderId: grns.purchaseOrderId, vendorId: grns.vendorId, siteId: grns.siteId, grnDate: grns.grnDate, receivedAt: grns.receivedAt,
      invoiceNumber: grns.invoiceNumber, invoiceDate: grns.invoiceDate, status: grns.status, notes: grns.notes, createdBy: grns.createdBy, createdAt: grns.createdAt, updatedAt: grns.updatedAt,
      poNumber: purchaseOrders.poNumber, poStatus: purchaseOrders.status, vendorName: vendors.name, vendorCode: vendors.vendorCode, vendorAddress: vendors.address, vendorPhone: vendors.phone, vendorEmail: vendors.email,
      siteName: sites.name, siteCode: sites.siteCode, siteAddress: sites.address, siteLocation: sites.location,
    }).from(grns)
      .innerJoin(purchaseOrders, eq(grns.purchaseOrderId, purchaseOrders.id))
      .innerJoin(vendors, eq(grns.vendorId, vendors.id))
      .innerJoin(sites, eq(grns.siteId, sites.id))
      .where(eq(grns.id, id));

    if (!header) return null;

    const items = await db.select({
      id: grnItems.id, grnId: grnItems.grnId, purchaseOrderItemId: grnItems.purchaseOrderItemId, materialId: grnItems.materialId, description: grnItems.description,
      orderedQty: grnItems.orderedQty, previouslyReceivedQty: grnItems.previouslyReceivedQty, pendingQty: grnItems.pendingQty, receivedQty: grnItems.receivedQty, unit: grnItems.unit,
      remarks: grnItems.remarks, createdAt: grnItems.createdAt, updatedAt: grnItems.updatedAt, materialName: materials.name, materialCode: materials.materialCode,
    }).from(grnItems).innerJoin(materials, eq(grnItems.materialId, materials.id)).where(eq(grnItems.grnId, id));

    return {
      ...header,
      purchaseOrder: { id: header.purchaseOrderId, poNumber: header.poNumber, status: normalizePoStatus(header.poStatus) },
      vendor: { id: header.vendorId, name: header.vendorName, vendorCode: header.vendorCode, address: header.vendorAddress, phone: header.vendorPhone, email: header.vendorEmail },
      site: { id: header.siteId, name: header.siteName, siteCode: header.siteCode, address: header.siteAddress, location: header.siteLocation },
      items: items.map((item) => ({ ...item, material: { id: item.materialId, name: item.materialName, materialCode: item.materialCode } })),
    };
  }

  async create(input: GrnPayload) { return this.save(undefined, input); }
  async update(id: string, input: GrnPayload) { return this.save(id, input); }

  private async save(id: string | undefined, input: GrnPayload) {
    const currentId = id ?? randomUUID();

    try {
      await db.transaction(async (tx) => {
        if (id) {
          const existingItems = await tx.select({ purchaseOrderItemId: grnItems.purchaseOrderItemId, receivedQty: grnItems.receivedQty }).from(grnItems).where(eq(grnItems.grnId, id));
          for (const existingItem of existingItems) {
            const [poItem] = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, existingItem.purchaseOrderItemId));
            if (!poItem) continue;
            const receivedQty = round(Math.max(Number(poItem.receivedQty) - Number(existingItem.receivedQty), 0));
            await tx.update(purchaseOrderItems).set({ receivedQty, pendingQty: round(Math.max(Number(poItem.qty) - receivedQty, 0)), updatedAt: new Date() }).where(eq(purchaseOrderItems.id, poItem.id));
          }
          await tx.delete(grnItems).where(eq(grnItems.grnId, id));
        }

        const po = await this.getReceiptOptions(input.purchaseOrderId);
        if (po.vendorId !== input.vendorId || po.siteId !== input.siteId) throw new ApiError(400, 'GRN must match the selected purchase order vendor and site');

        const poItems = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, input.purchaseOrderId));
        const poMap = new Map(poItems.map((item) => [item.id, item]));
        const lineItems = input.items.map((item) => {
          const poItem = poMap.get(item.purchaseOrderItemId);
          if (!poItem) throw new ApiError(400, 'Invalid purchase order item selected');
          const pendingQty = round(Number(poItem.qty) - Number(poItem.receivedQty));
          if (Number(item.receivedQty) <= 0) throw new ApiError(400, `Received quantity must be greater than zero for ${poItem.description}`);
          if (Number(item.receivedQty) > pendingQty) throw new ApiError(400, `Cannot receive more than pending quantity for ${poItem.description}`);
          return { item, poItem, pendingQty };
        });

        if (id) {
          await tx.update(grns).set({
            grnNumber: input.grnNumber, purchaseOrderId: input.purchaseOrderId, vendorId: input.vendorId, siteId: input.siteId,
            grnDate: new Date(input.grnDate), receivedAt: new Date(input.receivedAt), invoiceNumber: input.invoiceNumber || null,
            invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : null, status: input.status, notes: input.notes, createdBy: input.createdBy, updatedAt: new Date(),
          }).where(eq(grns.id, id));
        } else {
          await tx.insert(grns).values({
            id: currentId, grnNumber: input.grnNumber, purchaseOrderId: input.purchaseOrderId, vendorId: input.vendorId, siteId: input.siteId,
            grnDate: new Date(input.grnDate), receivedAt: new Date(input.receivedAt), invoiceNumber: input.invoiceNumber || null,
            invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : null, status: input.status, notes: input.notes, createdBy: input.createdBy,
          });
        }

        await tx.insert(grnItems).values(lineItems.map(({ item, poItem, pendingQty }) => ({
          id: randomUUID(), grnId: currentId, purchaseOrderItemId: item.purchaseOrderItemId, materialId: item.materialId, description: item.description || poItem.description,
          orderedQty: poItem.qty, previouslyReceivedQty: poItem.receivedQty, pendingQty, receivedQty: item.receivedQty, unit: item.unit || poItem.unit, remarks: item.remarks || null,
        })));

        for (const { item, poItem } of lineItems) {
          const receivedQty = round(Number(poItem.receivedQty) + Number(item.receivedQty));
          await tx.update(purchaseOrderItems).set({ receivedQty, pendingQty: round(Math.max(Number(poItem.qty) - receivedQty, 0)), updatedAt: new Date() }).where(eq(purchaseOrderItems.id, poItem.id));
        }

        const refreshedPoItems = await tx.select({ qty: purchaseOrderItems.qty, receivedQty: purchaseOrderItems.receivedQty }).from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, input.purchaseOrderId));
        await tx.update(purchaseOrders).set({ status: computePoStatus(refreshedPoItems as Array<{ qty: number; receivedQty: number }>), updatedAt: new Date() }).where(eq(purchaseOrders.id, input.purchaseOrderId));
      });

      return this.getById(currentId);
    } catch (error) {
      handleDatabaseError(error, 'GRN');
    }
  }

  async remove(id: string) {
    const existing = await this.getById(id);
    if (!existing) throw new ApiError(404, 'GRN not found');

    await db.transaction(async (tx) => {
      const items = await tx.select({ purchaseOrderItemId: grnItems.purchaseOrderItemId, receivedQty: grnItems.receivedQty }).from(grnItems).where(eq(grnItems.grnId, id));
      for (const item of items) {
        const [poItem] = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, item.purchaseOrderItemId));
        if (!poItem) continue;
        const receivedQty = round(Math.max(Number(poItem.receivedQty) - Number(item.receivedQty), 0));
        await tx.update(purchaseOrderItems).set({ receivedQty, pendingQty: round(Math.max(Number(poItem.qty) - receivedQty, 0)), updatedAt: new Date() }).where(eq(purchaseOrderItems.id, poItem.id));
      }
      await tx.delete(grns).where(eq(grns.id, id));
      const refreshedPoItems = await tx.select({ qty: purchaseOrderItems.qty, receivedQty: purchaseOrderItems.receivedQty }).from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, existing.purchaseOrderId));
      await tx.update(purchaseOrders).set({ status: computePoStatus(refreshedPoItems as Array<{ qty: number; receivedQty: number }>), updatedAt: new Date() }).where(eq(purchaseOrders.id, existing.purchaseOrderId));
    });

    return existing;
  }
}
