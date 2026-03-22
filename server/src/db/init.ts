import { count } from 'drizzle-orm';
import { db, sqlite } from './client.js';
import { materials, passwordResets, sites, systemSettings, userProfiles, users, vendors } from '../../../shared/schema/index.js';
import { hashPassword } from '../utils/auth.js';

const baseSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'purchase_executive',
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  designation TEXT,
  phone TEXT,
  avatar_url TEXT,
  theme_preference TEXT NOT NULL DEFAULT 'system',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_email TEXT,
  company_phone TEXT,
  logo_url TEXT,
  purchase_order_prefix TEXT NOT NULL DEFAULT 'PO',
  grn_prefix TEXT NOT NULL DEFAULT 'GRN',
  bill_prefix TEXT NOT NULL DEFAULT 'BILL',
  payment_prefix TEXT NOT NULL DEFAULT 'PAY',
  default_currency TEXT NOT NULL DEFAULT 'INR',
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 4,
  po_theme_settings TEXT NOT NULL DEFAULT '{}',
  po_template_settings TEXT NOT NULL DEFAULT '{}',
  po_layout_settings TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  vendor_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  state TEXT,
  city TEXT,
  address TEXT,
  opening_balance REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  remarks TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  site_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  material_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  unit TEXT NOT NULL,
  hsn_code TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  po_date INTEGER NOT NULL,
  expected_delivery_date INTEGER,
  billing_address TEXT,
  shipping_address TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  remarks TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  description TEXT NOT NULL,
  qty REAL NOT NULL,
  unit TEXT NOT NULL,
  rate REAL NOT NULL,
  tax_percent REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL,
  received_qty REAL NOT NULL DEFAULT 0,
  pending_qty REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

CREATE TABLE IF NOT EXISTS grns (
  id TEXT PRIMARY KEY,
  grn_number TEXT NOT NULL UNIQUE,
  purchase_order_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  grn_date INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  invoice_number TEXT,
  invoice_date INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (site_id) REFERENCES sites(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS grn_items (
  id TEXT PRIMARY KEY,
  grn_id TEXT NOT NULL,
  purchase_order_item_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  description TEXT NOT NULL,
  ordered_qty REAL NOT NULL DEFAULT 0,
  previously_received_qty REAL NOT NULL DEFAULT 0,
  pending_qty REAL NOT NULL DEFAULT 0,
  received_qty REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  remarks TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);
`;

type TableColumn = { name: string };

const getColumns = (tableName: string) => sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as TableColumn[];
const hasColumn = (tableName: string, columnName: string) => getColumns(tableName).some((column) => column.name === columnName);
const hasTable = (tableName: string) => sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);

const renameLegacyTableIfNeeded = (tableName: string, legacyColumns: string[], nextColumns: string[]) => {
  if (!hasTable(tableName)) return;
  const columns = getColumns(tableName).map((column) => column.name);
  const isLegacy = legacyColumns.some((column) => columns.includes(column)) && !nextColumns.every((column) => columns.includes(column));
  if (isLegacy) {
    sqlite.exec(`ALTER TABLE ${tableName} RENAME TO ${tableName}_legacy`);
  }
};

const copyLegacyVendors = () => {
  if (!hasTable('vendors_legacy')) return;
  sqlite.exec(`
    INSERT INTO vendors (id, vendor_code, name, contact_person, phone, email, gstin, state, city, address, opening_balance, status, remarks, created_by, created_at, updated_at)
    SELECT
      id,
      COALESCE(vendor_code, code),
      name,
      contact_person,
      phone,
      email,
      COALESCE(gstin, tax_id, ''),
      state,
      city,
      COALESCE(address, trim(COALESCE(address_line_1, '') || ' ' || COALESCE(address_line_2, ''))),
      COALESCE(opening_balance, 0),
      status,
      COALESCE(remarks, ''),
      created_by,
      created_at,
      updated_at
    FROM vendors_legacy
  `);
  sqlite.exec('DROP TABLE vendors_legacy');
};

const copyLegacyMaterials = () => {
  if (!hasTable('materials_legacy')) return;
  sqlite.exec(`
    INSERT INTO materials (id, material_code, name, category, subcategory, unit, hsn_code, description, status, created_by, created_at, updated_at)
    SELECT
      id,
      COALESCE(material_code, sku),
      name,
      category,
      COALESCE(subcategory, ''),
      unit,
      COALESCE(hsn_code, ''),
      description,
      status,
      created_by,
      created_at,
      updated_at
    FROM materials_legacy
  `);
  sqlite.exec('DROP TABLE materials_legacy');
};

const copyLegacySites = () => {
  if (!hasTable('sites_legacy')) return;
  sqlite.exec(`
    INSERT INTO sites (id, site_code, name, location, address, status, created_by, created_at, updated_at)
    SELECT
      id,
      COALESCE(site_code, code),
      name,
      location,
      COALESCE(address, trim(COALESCE(city, '') || CASE WHEN state IS NOT NULL AND state <> '' THEN ', ' || state ELSE '' END || CASE WHEN postal_code IS NOT NULL AND postal_code <> '' THEN ' ' || postal_code ELSE '' END)),
      status,
      created_by,
      created_at,
      updated_at
    FROM sites_legacy
  `);
  sqlite.exec('DROP TABLE sites_legacy');
};

const ensureColumn = (tableName: string, definition: string) => {
  const columnName = definition.split(' ')[0];
  if (!hasColumn(tableName, columnName)) {
    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
};

const migrateCrudTables = () => {
  renameLegacyTableIfNeeded('vendors', ['code', 'tax_id', 'payment_terms_days'], ['vendor_code', 'gstin', 'remarks']);
  renameLegacyTableIfNeeded('materials', ['sku', 'reorder_level'], ['material_code', 'subcategory', 'hsn_code']);
  renameLegacyTableIfNeeded('sites', ['code', 'city', 'project_manager'], ['site_code']);

  sqlite.exec(baseSql);

  ensureColumn('vendors', 'vendor_code TEXT');
  ensureColumn('vendors', 'phone TEXT');
  ensureColumn('vendors', 'email TEXT');
  ensureColumn('vendors', 'gstin TEXT');
  ensureColumn('vendors', 'state TEXT');
  ensureColumn('vendors', 'city TEXT');
  ensureColumn('vendors', 'address TEXT');
  ensureColumn('vendors', 'opening_balance REAL NOT NULL DEFAULT 0');
  ensureColumn('vendors', 'remarks TEXT');

  ensureColumn('materials', 'material_code TEXT');
  ensureColumn('materials', 'subcategory TEXT');
  ensureColumn('materials', 'hsn_code TEXT');
  ensureColumn('materials', 'description TEXT');

  ensureColumn('sites', 'site_code TEXT');
  ensureColumn('sites', 'location TEXT');
  ensureColumn('sites', 'address TEXT');

  ensureColumn('system_settings', `po_theme_settings TEXT NOT NULL DEFAULT '{}'`);
  ensureColumn('system_settings', `po_template_settings TEXT NOT NULL DEFAULT '{}'`);
  ensureColumn('system_settings', `po_layout_settings TEXT NOT NULL DEFAULT '{}'`);

  ensureColumn('password_resets', 'user_id TEXT');
  ensureColumn('password_resets', 'token TEXT');
  ensureColumn('password_resets', 'expires_at INTEGER');

  ensureColumn('purchase_orders', 'po_number TEXT');
  ensureColumn('purchase_orders', 'vendor_id TEXT');
  ensureColumn('purchase_orders', 'site_id TEXT');
  ensureColumn('purchase_orders', 'po_date INTEGER');
  ensureColumn('purchase_orders', 'expected_delivery_date INTEGER');
  ensureColumn('purchase_orders', 'billing_address TEXT');
  ensureColumn('purchase_orders', 'shipping_address TEXT');
  ensureColumn('purchase_orders', 'subtotal REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_orders', 'tax_amount REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_orders', 'discount_amount REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_orders', 'total_amount REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_orders', `status TEXT NOT NULL DEFAULT 'draft'`);
  ensureColumn('purchase_orders', 'remarks TEXT');
  ensureColumn('purchase_orders', 'created_by TEXT');

  ensureColumn('purchase_order_items', 'purchase_order_id TEXT');
  ensureColumn('purchase_order_items', 'material_id TEXT');
  ensureColumn('purchase_order_items', `description TEXT NOT NULL DEFAULT ''`);
  ensureColumn('purchase_order_items', 'qty REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_order_items', `unit TEXT NOT NULL DEFAULT ''`);
  ensureColumn('purchase_order_items', 'rate REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_order_items', 'tax_percent REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_order_items', 'tax_amount REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_order_items', 'line_total REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_order_items', 'received_qty REAL NOT NULL DEFAULT 0');
  ensureColumn('purchase_order_items', 'pending_qty REAL NOT NULL DEFAULT 0');

  ensureColumn('grns', 'grn_number TEXT');
  ensureColumn('grns', 'purchase_order_id TEXT');
  ensureColumn('grns', 'vendor_id TEXT');
  ensureColumn('grns', 'site_id TEXT');
  ensureColumn('grns', 'grn_date INTEGER');
  ensureColumn('grns', 'received_at INTEGER');
  ensureColumn('grns', 'invoice_number TEXT');
  ensureColumn('grns', 'invoice_date INTEGER');
  ensureColumn('grns', `status TEXT NOT NULL DEFAULT 'draft'`);
  ensureColumn('grns', 'notes TEXT');
  ensureColumn('grns', 'created_by TEXT');

  ensureColumn('grn_items', 'grn_id TEXT');
  ensureColumn('grn_items', 'purchase_order_item_id TEXT');
  ensureColumn('grn_items', 'material_id TEXT');
  ensureColumn('grn_items', `description TEXT NOT NULL DEFAULT ''`);
  ensureColumn('grn_items', 'ordered_qty REAL NOT NULL DEFAULT 0');
  ensureColumn('grn_items', 'previously_received_qty REAL NOT NULL DEFAULT 0');
  ensureColumn('grn_items', 'pending_qty REAL NOT NULL DEFAULT 0');
  ensureColumn('grn_items', 'received_qty REAL NOT NULL DEFAULT 0');
  ensureColumn('grn_items', `unit TEXT NOT NULL DEFAULT ''`);
  ensureColumn('grn_items', 'remarks TEXT');

  sqlite.exec("UPDATE purchase_orders SET status = 'issued' WHERE status = 'approved'");
  sqlite.exec("UPDATE purchase_orders SET status = 'partially_received' WHERE status = 'partial'");
  sqlite.exec("UPDATE purchase_orders SET status = 'received' WHERE status = 'completed'");

  copyLegacyVendors();
  copyLegacyMaterials();
  copyLegacySites();
};

const seedVendors = [
  {
    id: 'ven_001',
    vendorCode: 'VEN-001',
    name: 'Shree Cement Supplies',
    contactPerson: 'Ravi Mehta',
    email: 'ravi@shreecement.example',
    phone: '+91 98989 00001',
    city: 'Ahmedabad',
    state: 'Gujarat',
    gstin: '24ABCDE1234F1Z5',
    address: 'Satellite, Ahmedabad',
    status: 'active' as const,
    openingBalance: 1280000,
    remarks: 'Preferred cement vendor',
  },
  {
    id: 'ven_002',
    vendorCode: 'VEN-002',
    name: 'Metro Steel Works',
    contactPerson: 'Ishaan Kapoor',
    email: 'accounts@metrosteel.example',
    phone: '+91 98989 00002',
    city: 'Surat',
    state: 'Gujarat',
    gstin: '24FGHIJ5678K1Z6',
    address: 'Ring Road, Surat',
    status: 'active' as const,
    openingBalance: 950000,
    remarks: 'Handles rolling schedules well',
  },
  {
    id: 'ven_003',
    vendorCode: 'VEN-003',
    name: 'Prime Electricals',
    contactPerson: 'Simran Joshi',
    email: 'simran@primeelectricals.example',
    phone: '+91 98989 00003',
    city: 'Vadodara',
    state: 'Gujarat',
    gstin: '24LMNOP9012Q1Z7',
    address: 'Alkapuri, Vadodara',
    status: 'on_hold' as const,
    openingBalance: 420000,
    remarks: 'On quality review hold',
  },
];

const seedMaterials = [
  {
    id: 'mat_001',
    materialCode: 'MAT-CEM-001',
    name: 'OPC Cement 53 Grade',
    category: 'Cement',
    subcategory: 'Structural',
    unit: 'Bag',
    hsnCode: '25232930',
    description: 'Premium quality cement for structural work',
    status: 'active' as const,
  },
  {
    id: 'mat_002',
    materialCode: 'MAT-STEEL-001',
    name: 'TMT Steel 12mm',
    category: 'Steel',
    subcategory: 'Reinforcement',
    unit: 'Ton',
    hsnCode: '72142090',
    description: 'High tensile reinforcement bars',
    status: 'active' as const,
  },
];

const seedSites = [
  {
    id: 'site_001',
    siteCode: 'SITE-AHM-01',
    name: 'Greenfield Heights',
    location: 'SG Highway',
    address: 'Near Vaishnodevi Circle, Ahmedabad',
    status: 'active' as const,
  },
  {
    id: 'site_002',
    siteCode: 'SITE-SRT-02',
    name: 'Skyline Residency',
    location: 'Vesu',
    address: 'Canal Road, Surat',
    status: 'active' as const,
  },
];

export const initializeDatabase = async () => {
  migrateCrudTables();

  ensureColumn('users', 'last_login_at INTEGER');
  ensureColumn('user_profiles', 'designation TEXT');
  ensureColumn('user_profiles', 'phone TEXT');
  ensureColumn('user_profiles', 'avatar_url TEXT');
  ensureColumn('user_profiles', `theme_preference TEXT NOT NULL DEFAULT 'system'`);

  const [{ value: usersCount }] = await db.select({ value: count() }).from(users);
  if (usersCount === 0) {
    const now = new Date();
    await db.insert(users).values({
      id: 'usr_admin',
      email: 'anika@jakhira.com',
      passwordHash: await hashPassword('password123'),
      role: 'purchase_manager',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(userProfiles).values({
      id: 'profile_usr_admin',
      userId: 'usr_admin',
      fullName: 'Anika Sharma',
      designation: 'Purchase Manager',
      phone: '+91 98765 40001',
      avatarUrl: '',
      themePreference: 'system',
      createdAt: now,
      updatedAt: now,
    });
  }

  const [{ value: profilesCount }] = await db.select({ value: count() }).from(userProfiles);
  if (profilesCount === 0) {
    const now = new Date();
    await db.insert(userProfiles).values({
      id: 'profile_usr_admin',
      userId: 'usr_admin',
      fullName: 'Anika Sharma',
      designation: 'Purchase Manager',
      phone: '+91 98765 40001',
      avatarUrl: '',
      themePreference: 'system',
      createdAt: now,
      updatedAt: now,
    });
  }

  const [{ value: vendorsCount }] = await db.select({ value: count() }).from(vendors);
  if (vendorsCount === 0) {
    await db.insert(vendors).values(seedVendors);
  }

  const [{ value: materialsCount }] = await db.select({ value: count() }).from(materials);
  if (materialsCount === 0) {
    await db.insert(materials).values(seedMaterials);
  }

  const [{ value: sitesCount }] = await db.select({ value: count() }).from(sites);
  if (sitesCount === 0) {
    await db.insert(sites).values(seedSites);
  }

  const [{ value: settingsCount }] = await db.select({ value: count() }).from(systemSettings);
  if (settingsCount === 0) {
    await db.insert(systemSettings).values({
      id: 'settings_default',
      companyName: 'JAKHIRA',
      companyEmail: 'ops@jakhira.example',
      companyPhone: '+91 98765 43210',
      purchaseOrderPrefix: 'PO',
      grnPrefix: 'GRN',
      billPrefix: 'BILL',
      paymentPrefix: 'PAY',
      defaultCurrency: 'INR',
      fiscalYearStartMonth: 4,
      poThemeSettings: JSON.stringify({
        companyName: 'JAKHIRA ERP',
        logoUrl: '',
        primaryColor: '#0F766E',
        baseFontSize: 9,
        headingFontSize: 16,
        tableFontSize: 8,
        borderStyle: 'solid',
        footerStyle: 'standard',
        currencyCode: 'INR',
        currencyLabel: 'Rs.',
        currencyLocale: 'en-IN',
      }),
      poTemplateSettings: JSON.stringify({
        showVendorDetails: true,
        showBillTo: true,
        showShipTo: true,
        showAmountInWords: true,
        showTermsAndConditions: true,
        showPreparedBy: true,
        showSignatory: true,
        visiblePoDetailFields: ['projectName', 'projectAddress', 'poNumber', 'poDate', 'billingName', 'billingAddress'],
        visibleLineItemColumns: ['index', 'description', 'unit', 'quantity', 'rate', 'amount'],
      }),
      poLayoutSettings: JSON.stringify({
        pageMarginX: 40,
        pageMarginTop: 44,
        pageMarginBottom: 42,
        sectionSpacing: 12,
        headerLeftWidthPercent: 55,
        headerRightWidthPercent: 45,
        sectionColumns: '2',
        lineItemColumnWidths: { index: 42, description: 239, unit: 46, quantity: 52, rate: 68, amount: 68 },
        totalsBlockWidth: 190,
        layoutDensity: 'standard',
        blockRows: [
          { id: 'row-1', columns: 1, blocks: [{ id: 'header-1', key: 'header', span: 1, visible: true }] },
          { id: 'row-2', columns: 1, blocks: [{ id: 'poDetails-1', key: 'poDetails', span: 1, visible: true }] },
          { id: 'row-3', columns: 2, blocks: [{ id: 'vendorDetails-1', key: 'vendorDetails', span: 2, visible: true }, { id: 'billTo-1', key: 'billTo', span: 1, visible: true }, { id: 'shipTo-1', key: 'shipTo', span: 1, visible: true }] },
          { id: 'row-4', columns: 1, blocks: [{ id: 'lineItems-1', key: 'lineItems', span: 1, visible: true }] },
          { id: 'row-5', columns: 1, blocks: [{ id: 'totals-1', key: 'totals', span: 1, visible: true }] },
          { id: 'row-6', columns: 1, blocks: [{ id: 'amountInWords-1', key: 'amountInWords', span: 1, visible: true }] },
          { id: 'row-7', columns: 1, blocks: [{ id: 'terms-1', key: 'terms', span: 1, visible: true }] },
          { id: 'row-8', columns: 1, blocks: [{ id: 'footer-1', key: 'footer', span: 1, visible: true }] },
        ],
      }),
    });
  }
};
