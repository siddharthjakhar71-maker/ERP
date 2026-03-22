import { relations, sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
};

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'purchase_manager', 'purchase_executive', 'accounts'] }).notNull().default('purchase_executive'),
  status: text('status', { enum: ['active', 'inactive', 'invited'] }).notNull().default('active'),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  ...timestamps,
});

export const passwordResets = sqliteTable('password_resets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ...timestamps,
});

export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  fullName: text('full_name').notNull(),
  designation: text('designation'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  themePreference: text('theme_preference', { enum: ['light', 'dark', 'system'] }).notNull().default('system'),
  ...timestamps,
});

export const systemSettings = sqliteTable('system_settings', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  companyEmail: text('company_email'),
  companyPhone: text('company_phone'),
  logoUrl: text('logo_url'),
  purchaseOrderPrefix: text('purchase_order_prefix').notNull().default('PO'),
  grnPrefix: text('grn_prefix').notNull().default('GRN'),
  billPrefix: text('bill_prefix').notNull().default('BILL'),
  paymentPrefix: text('payment_prefix').notNull().default('PAY'),
  defaultCurrency: text('default_currency').notNull().default('INR'),
  fiscalYearStartMonth: integer('fiscal_year_start_month').notNull().default(4),
  poThemeSettings: text('po_theme_settings').notNull().default('{}'),
  poTemplateSettings: text('po_template_settings').notNull().default('{}'),
  poLayoutSettings: text('po_layout_settings').notNull().default('{}'),
  ...timestamps,
});

export const vendors = sqliteTable('vendors', {
  id: text('id').primaryKey(),
  vendorCode: text('vendor_code').notNull().unique(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  gstin: text('gstin'),
  state: text('state'),
  city: text('city'),
  address: text('address'),
  openingBalance: real('opening_balance').notNull().default(0),
  status: text('status', { enum: ['active', 'inactive', 'on_hold'] }).notNull().default('active'),
  remarks: text('remarks'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const materials = sqliteTable('materials', {
  id: text('id').primaryKey(),
  materialCode: text('material_code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  unit: text('unit').notNull(),
  hsnCode: text('hsn_code'),
  description: text('description'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  siteCode: text('site_code').notNull().unique(),
  name: text('name').notNull(),
  location: text('location'),
  address: text('address'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const vendorMaterialRates = sqliteTable('vendor_material_rates', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  materialId: text('material_id').notNull().references(() => materials.id),
  rate: real('rate').notNull(),
  currency: text('currency').notNull().default('INR'),
  leadTimeDays: integer('lead_time_days').notNull().default(0),
  isPreferred: integer('is_preferred', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});

export const purchaseOrderStatuses = ['draft', 'issued', 'partially_received', 'received', 'cancelled', 'approved', 'partial', 'completed'] as const;
export const grnStatuses = ['draft', 'posted'] as const;

export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  poDate: integer('po_date', { mode: 'timestamp' }).notNull(),
  expectedDeliveryDate: integer('expected_delivery_date', { mode: 'timestamp' }),
  billingAddress: text('billing_address'),
  shippingAddress: text('shipping_address'),
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull().default(0),
  status: text('status', { enum: purchaseOrderStatuses }).notNull().default('draft'),
  remarks: text('remarks'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const purchaseOrderItems = sqliteTable('purchase_order_items', {
  id: text('id').primaryKey(),
  purchaseOrderId: text('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  materialId: text('material_id').notNull().references(() => materials.id),
  description: text('description').notNull(),
  qty: real('qty').notNull(),
  unit: text('unit').notNull(),
  rate: real('rate').notNull(),
  taxPercent: real('tax_percent').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  lineTotal: real('line_total').notNull(),
  receivedQty: real('received_qty').notNull().default(0),
  pendingQty: real('pending_qty').notNull().default(0),
  ...timestamps,
});

export const grns = sqliteTable('grns', {
  id: text('id').primaryKey(),
  grnNumber: text('grn_number').notNull().unique(),
  purchaseOrderId: text('purchase_order_id').notNull().references(() => purchaseOrders.id),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  grnDate: integer('grn_date', { mode: 'timestamp' }).notNull(),
  receivedAt: integer('received_at', { mode: 'timestamp' }).notNull(),
  invoiceNumber: text('invoice_number'),
  invoiceDate: integer('invoice_date', { mode: 'timestamp' }),
  status: text('status', { enum: grnStatuses }).notNull().default('draft'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const grnItems = sqliteTable('grn_items', {
  id: text('id').primaryKey(),
  grnId: text('grn_id').notNull().references(() => grns.id, { onDelete: 'cascade' }),
  purchaseOrderItemId: text('purchase_order_item_id').notNull().references(() => purchaseOrderItems.id),
  materialId: text('material_id').notNull().references(() => materials.id),
  description: text('description').notNull(),
  orderedQty: real('ordered_qty').notNull().default(0),
  previouslyReceivedQty: real('previously_received_qty').notNull().default(0),
  pendingQty: real('pending_qty').notNull().default(0),
  receivedQty: real('received_qty').notNull().default(0),
  unit: text('unit').notNull().default(''),
  remarks: text('remarks'),
  ...timestamps,
});

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  billNumber: text('bill_number').notNull().unique(),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  purchaseOrderId: text('purchase_order_id').references(() => purchaseOrders.id),
  grnId: text('grn_id').references(() => grns.id),
  invoiceNumber: text('invoice_number').notNull(),
  invoiceDate: integer('invoice_date', { mode: 'timestamp' }).notNull(),
  dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['draft', 'unpaid', 'partial', 'paid', 'overdue'] }).notNull().default('draft'),
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull().default(0),
  amountPaid: real('amount_paid').notNull().default(0),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const billItems = sqliteTable('bill_items', {
  id: text('id').primaryKey(),
  billId: text('bill_id').notNull().references(() => bills.id),
  materialId: text('material_id').references(() => materials.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(0),
  unitRate: real('unit_rate').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  lineTotal: real('line_total').notNull().default(0),
  ...timestamps,
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  paymentNumber: text('payment_number').notNull().unique(),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  billId: text('bill_id').references(() => bills.id),
  paymentDate: integer('payment_date', { mode: 'timestamp' }).notNull(),
  paymentMode: text('payment_mode', { enum: ['bank_transfer', 'cheque', 'cash', 'upi'] }).notNull(),
  referenceNumber: text('reference_number'),
  amount: real('amount').notNull(),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const stockLedger = sqliteTable('stock_ledger', {
  id: text('id').primaryKey(),
  materialId: text('material_id').notNull().references(() => materials.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  transactionType: text('transaction_type', { enum: ['inward', 'outward', 'adjustment'] }).notNull(),
  referenceType: text('reference_type', { enum: ['grn', 'issue', 'adjustment'] }).notNull(),
  referenceId: text('reference_id').notNull(),
  quantity: real('quantity').notNull(),
  balanceQuantity: real('balance_quantity').notNull(),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  link: text('link'),
  ...timestamps,
});

export const userRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  passwordResets: many(passwordResets),
}));

export const passwordResetRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, { fields: [passwordResets.userId], references: [users.id] }),
}));

export const vendorRelations = relations(vendors, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  bills: many(bills),
  payments: many(payments),
  materialRates: many(vendorMaterialRates),
  grns: many(grns),
}));

export const materialRelations = relations(materials, ({ many }) => ({
  rates: many(vendorMaterialRates),
  purchaseOrderItems: many(purchaseOrderItems),
  grnItems: many(grnItems),
  billItems: many(billItems),
  stockLedger: many(stockLedger),
}));

export const siteRelations = relations(sites, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  grns: many(grns),
  stockLedger: many(stockLedger),
}));

export const purchaseOrderRelations = relations(purchaseOrders, ({ one, many }) => ({
  vendor: one(vendors, { fields: [purchaseOrders.vendorId], references: [vendors.id] }),
  site: one(sites, { fields: [purchaseOrders.siteId], references: [sites.id] }),
  items: many(purchaseOrderItems),
  grns: many(grns),
  bills: many(bills),
}));

export const purchaseOrderItemRelations = relations(purchaseOrderItems, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [purchaseOrderItems.purchaseOrderId], references: [purchaseOrders.id] }),
  material: one(materials, { fields: [purchaseOrderItems.materialId], references: [materials.id] }),
  grnItems: many(grnItems),
}));

export const grnRelations = relations(grns, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [grns.purchaseOrderId], references: [purchaseOrders.id] }),
  vendor: one(vendors, { fields: [grns.vendorId], references: [vendors.id] }),
  site: one(sites, { fields: [grns.siteId], references: [sites.id] }),
  items: many(grnItems),
}));

export const grnItemRelations = relations(grnItems, ({ one }) => ({
  grn: one(grns, { fields: [grnItems.grnId], references: [grns.id] }),
  purchaseOrderItem: one(purchaseOrderItems, { fields: [grnItems.purchaseOrderItemId], references: [purchaseOrderItems.id] }),
  material: one(materials, { fields: [grnItems.materialId], references: [materials.id] }),
}));

export type PurchaseOrderStatus = (typeof purchaseOrderStatuses)[number];
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type GrnStatus = (typeof grnStatuses)[number];
export type Grn = typeof grns.$inferSelect;
export type NewGrn = typeof grns.$inferInsert;
export type GrnItem = typeof grnItems.$inferSelect;
export type NewGrnItem = typeof grnItems.$inferInsert;
