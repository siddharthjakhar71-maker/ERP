import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, like, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { materials, purchaseOrderItems, purchaseOrders, sites, vendors } from '../../../shared/schema/index.js';
import type { PurchaseOrderPayload } from '../validation/purchase-orders.validation.js';
import { ApiError } from '../utils/http.js';
import { handleDatabaseError } from '../utils/errors.js';

const buildSearch = (query?: string) => {
  if (!query?.trim()) return undefined;
  const term = `%${query.trim()}%`;
  return or(like(purchaseOrders.poNumber, term), like(vendors.name, term), like(sites.name, term));
};

const round = (value: number) => Number(value.toFixed(2));

const computeTotals = (input: PurchaseOrderPayload) => {
  const items = input.items.map((item) => {
    const taxAmount = round((item.qty * item.rate * item.taxPercent) / 100);
    const lineTotal = round(item.qty * item.rate + taxAmount);
    const receivedQty = round(item.receivedQty ?? 0);
    const pendingQty = round(Math.max(item.qty - receivedQty, 0));

    return {
      ...item,
      taxAmount,
      lineTotal,
      receivedQty,
      pendingQty,
    };
  });

  const subtotal = round(items.reduce((sum, item) => sum + item.qty * item.rate, 0));
  const taxAmount = round(items.reduce((sum, item) => sum + item.taxAmount, 0));
  const discountAmount = round(input.discountAmount ?? 0);
  const totalAmount = round(Math.max(subtotal + taxAmount - discountAmount, 0));

  return { items, subtotal, taxAmount, discountAmount, totalAmount };
};

export class PurchaseOrderService {
  async list(filters: { status?: string; q?: string }) {
    const rows = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        vendorId: purchaseOrders.vendorId,
        siteId: purchaseOrders.siteId,
        poDate: purchaseOrders.poDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        billingAddress: purchaseOrders.billingAddress,
        shippingAddress: purchaseOrders.shippingAddress,
        subtotal: purchaseOrders.subtotal,
        taxAmount: purchaseOrders.taxAmount,
        discountAmount: purchaseOrders.discountAmount,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        remarks: purchaseOrders.remarks,
        createdBy: purchaseOrders.createdBy,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
        siteName: sites.name,
        siteCode: sites.siteCode,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .innerJoin(sites, eq(purchaseOrders.siteId, sites.id))
      .where(and(filters.status ? eq(purchaseOrders.status, filters.status as typeof purchaseOrders.$inferSelect.status) : undefined, buildSearch(filters.q)))
      .orderBy(desc(purchaseOrders.createdAt));

    const ids = rows.map((row) => row.id);
    const itemCounts = ids.length
      ? await db
        .select({ purchaseOrderId: purchaseOrderItems.purchaseOrderId, id: purchaseOrderItems.id })
        .from(purchaseOrderItems)
        .where(inArray(purchaseOrderItems.purchaseOrderId, ids))
      : [];

    return rows.map((row) => ({
      ...row,
      itemCount: itemCounts.filter((item) => item.purchaseOrderId === row.id).length,
      vendor: { id: row.vendorId, name: row.vendorName, vendorCode: row.vendorCode },
      site: { id: row.siteId, name: row.siteName, siteCode: row.siteCode },
    }));
  }

  async getById(id: string) {
    const [header] = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        vendorId: purchaseOrders.vendorId,
        siteId: purchaseOrders.siteId,
        poDate: purchaseOrders.poDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        billingAddress: purchaseOrders.billingAddress,
        shippingAddress: purchaseOrders.shippingAddress,
        subtotal: purchaseOrders.subtotal,
        taxAmount: purchaseOrders.taxAmount,
        discountAmount: purchaseOrders.discountAmount,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        remarks: purchaseOrders.remarks,
        createdBy: purchaseOrders.createdBy,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
        vendorName: vendors.name,
        vendorCode: vendors.vendorCode,
        vendorAddress: vendors.address,
        vendorPhone: vendors.phone,
        vendorEmail: vendors.email,
        siteName: sites.name,
        siteCode: sites.siteCode,
        siteAddress: sites.address,
        siteLocation: sites.location,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .innerJoin(sites, eq(purchaseOrders.siteId, sites.id))
      .where(eq(purchaseOrders.id, id));

    if (!header) return null;

    const items = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        materialId: purchaseOrderItems.materialId,
        description: purchaseOrderItems.description,
        qty: purchaseOrderItems.qty,
        unit: purchaseOrderItems.unit,
        rate: purchaseOrderItems.rate,
        taxPercent: purchaseOrderItems.taxPercent,
        taxAmount: purchaseOrderItems.taxAmount,
        lineTotal: purchaseOrderItems.lineTotal,
        receivedQty: purchaseOrderItems.receivedQty,
        pendingQty: purchaseOrderItems.pendingQty,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
        materialName: materials.name,
        materialCode: materials.materialCode,
      })
      .from(purchaseOrderItems)
      .innerJoin(materials, eq(purchaseOrderItems.materialId, materials.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    return {
      ...header,
      vendor: {
        id: header.vendorId,
        name: header.vendorName,
        vendorCode: header.vendorCode,
        address: header.vendorAddress,
        phone: header.vendorPhone,
        email: header.vendorEmail,
      },
      site: {
        id: header.siteId,
        name: header.siteName,
        siteCode: header.siteCode,
        address: header.siteAddress,
        location: header.siteLocation,
      },
      items: items.map((item) => ({
        ...item,
        material: { id: item.materialId, name: item.materialName, materialCode: item.materialCode },
      })),
    };
  }

  async create(input: PurchaseOrderPayload) {
    const totals = computeTotals(input);
    const id = randomUUID();

    try {
      await db.transaction(async (tx) => {
        await tx.insert(purchaseOrders).values({
          id,
          poNumber: input.poNumber,
          vendorId: input.vendorId,
          siteId: input.siteId,
          poDate: new Date(input.poDate),
          expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
          billingAddress: input.billingAddress,
          shippingAddress: input.shippingAddress,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          status: input.status,
          remarks: input.remarks,
          createdBy: input.createdBy,
        });

        await tx.insert(purchaseOrderItems).values(totals.items.map((item) => ({
          id: randomUUID(),
          purchaseOrderId: id,
          materialId: item.materialId,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          rate: item.rate,
          taxPercent: item.taxPercent,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
          receivedQty: item.receivedQty,
          pendingQty: item.pendingQty,
        })));
      });

      return this.getById(id);
    } catch (error) {
      handleDatabaseError(error, 'Purchase order');
    }
  }

  async update(id: string, input: PurchaseOrderPayload) {
    const existing = await this.getById(id);
    if (!existing) throw new ApiError(404, 'Purchase order not found');
    const totals = computeTotals(input);

    try {
      await db.transaction(async (tx) => {
        await tx.update(purchaseOrders).set({
          poNumber: input.poNumber,
          vendorId: input.vendorId,
          siteId: input.siteId,
          poDate: new Date(input.poDate),
          expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
          billingAddress: input.billingAddress,
          shippingAddress: input.shippingAddress,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          status: input.status,
          remarks: input.remarks,
          createdBy: input.createdBy,
          updatedAt: new Date(),
        }).where(eq(purchaseOrders.id, id));

        await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
        await tx.insert(purchaseOrderItems).values(totals.items.map((item) => ({
          id: randomUUID(),
          purchaseOrderId: id,
          materialId: item.materialId,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          rate: item.rate,
          taxPercent: item.taxPercent,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
          receivedQty: item.receivedQty,
          pendingQty: item.pendingQty,
          updatedAt: new Date(),
        })));
      });

      return this.getById(id);
    } catch (error) {
      handleDatabaseError(error, 'Purchase order');
    }
  }

  async remove(id: string) {
    const existing = await this.getById(id);
    if (!existing) throw new ApiError(404, 'Purchase order not found');
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    return existing;
  }
}
