import { count } from 'drizzle-orm';
import { db, sqlite } from './client.js';
import { materials, sites, systemSettings, vendors } from '../../../shared/schema/index.js';

const bootstrapSql = `
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
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  tax_id TEXT,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  opening_balance REAL NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  project_manager TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  reorder_level REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
`;

const seedVendors = [
  {
    id: 'ven_001',
    code: 'VEN-001',
    name: 'Shree Cement Supplies',
    contactPerson: 'Ravi Mehta',
    email: 'ravi@shreecement.example',
    phone: '+91 98989 00001',
    city: 'Ahmedabad',
    state: 'Gujarat',
    paymentTermsDays: 30,
    status: 'active' as const,
    openingBalance: 1280000,
  },
  {
    id: 'ven_002',
    code: 'VEN-002',
    name: 'Metro Steel Works',
    contactPerson: 'Ishaan Kapoor',
    email: 'accounts@metrosteel.example',
    phone: '+91 98989 00002',
    city: 'Surat',
    state: 'Gujarat',
    paymentTermsDays: 21,
    status: 'active' as const,
    openingBalance: 950000,
  },
  {
    id: 'ven_003',
    code: 'VEN-003',
    name: 'Prime Electricals',
    contactPerson: 'Simran Joshi',
    email: 'simran@primeelectricals.example',
    phone: '+91 98989 00003',
    city: 'Vadodara',
    state: 'Gujarat',
    paymentTermsDays: 15,
    status: 'on_hold' as const,
    openingBalance: 420000,
  },
];

const seedMaterials = [
  {
    id: 'mat_001',
    sku: 'MAT-CEM-001',
    name: 'OPC Cement 53 Grade',
    category: 'Cement',
    unit: 'Bag',
    description: 'Premium quality cement for structural work',
    reorderLevel: 500,
    status: 'active' as const,
  },
  {
    id: 'mat_002',
    sku: 'MAT-STEEL-001',
    name: 'TMT Steel 12mm',
    category: 'Steel',
    unit: 'Ton',
    description: 'High tensile reinforcement bars',
    reorderLevel: 20,
    status: 'active' as const,
  },
];

const seedSites = [
  {
    id: 'site_001',
    code: 'SITE-AHM-01',
    name: 'Greenfield Heights',
    location: 'SG Highway',
    address: 'Near Vaishnodevi Circle',
    city: 'Ahmedabad',
    state: 'Gujarat',
    postalCode: '380060',
    projectManager: 'Mihir Shah',
    status: 'active' as const,
  },
  {
    id: 'site_002',
    code: 'SITE-SRT-02',
    name: 'Skyline Residency',
    location: 'Vesu',
    address: 'Canal Road',
    city: 'Surat',
    state: 'Gujarat',
    postalCode: '395007',
    projectManager: 'Aarav Desai',
    status: 'active' as const,
  },
];

export const initializeDatabase = async () => {
  sqlite.exec(bootstrapSql);

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
