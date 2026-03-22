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
  ...timestamps,
});

export const vendors = sqliteTable('vendors', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  taxId: text('tax_id'),
  paymentTermsDays: integer('payment_terms_days').notNull().default(30),
  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  status: text('status', { enum: ['active', 'inactive', 'on_hold'] }).notNull().default('active'),
  openingBalance: real('opening_balance').notNull().default(0),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const materials = sqliteTable('materials', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unit: text('unit').notNull(),
  description: text('description'),
  reorderLevel: real('reorder_level').notNull().default(0),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  location: text('location'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  projectManager: text('project_manager'),
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

export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  orderDate: integer('order_date', { mode: 'timestamp' }).notNull(),
  expectedDeliveryDate: integer('expected_delivery_date', { mode: 'timestamp' }),
  billingAddress: text('billing_address'),
  shippingAddress: text('shipping_address'),
  status: text('status', { enum: ['draft', 'approved', 'partially_received', 'completed', 'cancelled'] }).notNull().default('draft'),
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull().default(0),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const purchaseOrderItems = sqliteTable('purchase_order_items', {
  id: text('id').primaryKey(),
  purchaseOrderId: text('purchase_order_id').notNull().references(() => purchaseOrders.id),
  materialId: text('material_id').notNull().references(() => materials.id),
  quantity: real('quantity').notNull(),
  unitRate: real('unit_rate').notNull(),
  taxRate: real('tax_rate').notNull().default(0),
  discountRate: real('discount_rate').notNull().default(0),
  lineTotal: real('line_total').notNull(),
  ...timestamps,
});

export const grns = sqliteTable('grns', {
  id: text('id').primaryKey(),
  grnNumber: text('grn_number').notNull().unique(),
  purchaseOrderId: text('purchase_order_id').notNull().references(() => purchaseOrders.id),
  receivedAt: integer('received_at', { mode: 'timestamp' }).notNull(),
  invoiceNumber: text('invoice_number'),
  invoiceDate: integer('invoice_date', { mode: 'timestamp' }),
  status: text('status', { enum: ['draft', 'received', 'quality_hold', 'closed'] }).notNull().default('draft'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  ...timestamps,
});

export const grnItems = sqliteTable('grn_items', {
  id: text('id').primaryKey(),
  grnId: text('grn_id').notNull().references(() => grns.id),
  purchaseOrderItemId: text('purchase_order_item_id').notNull().references(() => purchaseOrderItems.id),
  acceptedQty: real('accepted_qty').notNull().default(0),
  rejectedQty: real('rejected_qty').notNull().default(0),
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
  type: text('type', { enum: ['info', 'warning', 'success', 'error'] }).notNull().default('info'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  actionUrl: text('action_url'),
  ...timestamps,
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  metadata: text('metadata'),
  ipAddress: text('ip_address'),
  ...timestamps,
});

export const vendorsRelations = relations(vendors, ({ many, one }) => ({
  rates: many(vendorMaterialRates),
  purchaseOrders: many(purchaseOrders),
  bills: many(bills),
  payments: many(payments),
  creator: one(users, { fields: [vendors.createdBy], references: [users.id] }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  rates: many(vendorMaterialRates),
  purchaseOrderItems: many(purchaseOrderItems),
  stockEntries: many(stockLedger),
}));

export const sitesRelations = relations(sites, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  stockEntries: many(stockLedger),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  vendor: one(vendors, { fields: [purchaseOrders.vendorId], references: [vendors.id] }),
  site: one(sites, { fields: [purchaseOrders.siteId], references: [sites.id] }),
  items: many(purchaseOrderItems),
  grns: many(grns),
  bills: many(bills),
}));

export const grnsRelations = relations(grns, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [grns.purchaseOrderId], references: [purchaseOrders.id] }),
  items: many(grnItems),
  bill: many(bills),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  vendor: one(vendors, { fields: [bills.vendorId], references: [vendors.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [bills.purchaseOrderId], references: [purchaseOrders.id] }),
  grn: one(grns, { fields: [bills.grnId], references: [grns.id] }),
  items: many(billItems),
  payments: many(payments),
}));

export const schema = {
  users,
  userProfiles,
  systemSettings,
  vendors,
  materials,
  sites,
  vendorMaterialRates,
  purchaseOrders,
  purchaseOrderItems,
  grns,
  grnItems,
  bills,
  billItems,
  payments,
  stockLedger,
  notifications,
  auditLogs,
};

export type User = typeof users.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type VendorInsert = typeof vendors.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type SiteInsert = typeof sites.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type MaterialInsert = typeof materials.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type Grn = typeof grns.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type Payment = typeof payments.$inferSelect;
