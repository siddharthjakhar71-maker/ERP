import { count } from 'drizzle-orm';
import { db, sqlite } from './client.js';
import { materials, sites, systemSettings, vendors } from '../../../shared/schema/index.js';

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
    });
  }
};
