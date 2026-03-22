import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { systemSettings } from '../../../shared/schema/index.js';
import type { PoLayoutSettingsPayload, PoTemplateSettingsPayload, PoThemeSettingsPayload } from '../validation/settings.validation.js';

const SETTINGS_ID = 'settings_default';

export interface PoThemeSettings extends PoThemeSettingsPayload {}
export interface PoTemplateSettings extends PoTemplateSettingsPayload {}
export interface PoLayoutSettings extends PoLayoutSettingsPayload {}

export interface SettingsRecord {
  companyName: string;
  procurementEmail: string;
  purchaseOrderPrefix: string;
  grnPrefix: string;
  billPrefix: string;
  paymentPrefix: string;
  fiscalYearStartMonth: number;
  themePreference: string;
  poTheme: PoThemeSettings;
  poTemplate: PoTemplateSettings;
  poLayout: PoLayoutSettings;
}

const defaultThemeSettings: PoThemeSettings = {
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
};

const defaultTemplateSettings: PoTemplateSettings = {
  showVendorDetails: true,
  showBillTo: true,
  showShipTo: true,
  showAmountInWords: true,
  showTermsAndConditions: true,
  showPreparedBy: true,
  showSignatory: true,
  visiblePoDetailFields: ['projectName', 'projectAddress', 'poNumber', 'poDate', 'billingName', 'billingAddress'],
  visibleLineItemColumns: ['index', 'description', 'unit', 'quantity', 'rate', 'amount'],
};

const defaultLayoutSettings: PoLayoutSettings = {
  pageMarginX: 40,
  pageMarginTop: 44,
  pageMarginBottom: 42,
  sectionSpacing: 12,
  headerLeftWidthPercent: 55,
  headerRightWidthPercent: 45,
  sectionColumns: '2',
  lineItemColumnWidths: {
    index: 42,
    description: 239,
    unit: 46,
    quantity: 52,
    rate: 68,
    amount: 68,
  },
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
};

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return { ...fallback, ...JSON.parse(value) } as T;
  } catch {
    return fallback;
  }
};

export class SettingsService {
  private async getRow() {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.id, SETTINGS_ID));
    if (!row) throw new Error('System settings record not found');
    return row;
  }

  async getSettings(): Promise<SettingsRecord> {
    const row = await this.getRow();
    return {
      companyName: row.companyName,
      procurementEmail: row.companyEmail ?? '',
      purchaseOrderPrefix: row.purchaseOrderPrefix,
      grnPrefix: row.grnPrefix,
      billPrefix: row.billPrefix,
      paymentPrefix: row.paymentPrefix,
      fiscalYearStartMonth: row.fiscalYearStartMonth,
      themePreference: 'system',
      poTheme: parseJson(row.poThemeSettings, { ...defaultThemeSettings, companyName: row.companyName, logoUrl: row.logoUrl ?? '', currencyCode: row.defaultCurrency }),
      poTemplate: parseJson(row.poTemplateSettings, defaultTemplateSettings),
      poLayout: parseJson(row.poLayoutSettings, defaultLayoutSettings),
    };
  }

  async updateTheme(input: PoThemeSettingsPayload) {
    await db.update(systemSettings).set({
      companyName: input.companyName,
      logoUrl: input.logoUrl,
      defaultCurrency: input.currencyCode,
      poThemeSettings: JSON.stringify(input),
      updatedAt: new Date(),
    }).where(eq(systemSettings.id, SETTINGS_ID));

    return this.getSettings();
  }

  async updateTemplate(input: PoTemplateSettingsPayload) {
    await db.update(systemSettings).set({
      poTemplateSettings: JSON.stringify(input),
      updatedAt: new Date(),
    }).where(eq(systemSettings.id, SETTINGS_ID));

    return this.getSettings();
  }

  async updateLayout(input: PoLayoutSettingsPayload) {
    await db.update(systemSettings).set({
      poLayoutSettings: JSON.stringify(input),
      updatedAt: new Date(),
    }).where(eq(systemSettings.id, SETTINGS_ID));

    return this.getSettings();
  }
}
