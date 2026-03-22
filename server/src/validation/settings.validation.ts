import { z } from 'zod';

const booleanField = z.boolean();
const stringList = z.array(z.string().trim().min(1)).min(1);
const numericField = z.number().finite();

export const poThemeSettingsSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  logoUrl: z.union([z.string().trim().url(), z.literal('')]),
  primaryColor: z.string().trim().regex(/^#([0-9A-Fa-f]{6})$/, 'Use a valid 6-digit hex color'),
  baseFontSize: z.number().int().min(8).max(16),
  headingFontSize: z.number().int().min(12).max(24),
  tableFontSize: z.number().int().min(7).max(14),
  borderStyle: z.enum(['solid', 'dashed', 'double']),
  footerStyle: z.enum(['minimal', 'standard', 'detailed']),
  currencyCode: z.string().trim().min(3).max(10),
  currencyLabel: z.string().trim().min(1).max(24),
  currencyLocale: z.string().trim().min(2).max(24),
});

export const poTemplateSettingsSchema = z.object({
  showVendorDetails: booleanField,
  showBillTo: booleanField,
  showShipTo: booleanField,
  showAmountInWords: booleanField,
  showTermsAndConditions: booleanField,
  showPreparedBy: booleanField,
  showSignatory: booleanField,
  visiblePoDetailFields: stringList,
  visibleLineItemColumns: stringList,
});

export const poLayoutSettingsSchema = z.object({
  pageMarginX: numericField.min(20).max(72),
  pageMarginTop: numericField.min(20).max(90),
  pageMarginBottom: numericField.min(20).max(90),
  sectionSpacing: numericField.min(6).max(32),
  headerLeftWidthPercent: numericField.min(35).max(75),
  headerRightWidthPercent: numericField.min(25).max(65),
  sectionColumns: z.enum(['2', '3']),
  lineItemColumnWidths: z.object({
    index: numericField.min(24).max(80),
    description: numericField.min(120).max(320),
    unit: numericField.min(36).max(90),
    quantity: numericField.min(40).max(90),
    rate: numericField.min(50).max(120),
    amount: numericField.min(50).max(120),
  }),
  totalsBlockWidth: numericField.min(140).max(260),
  layoutDensity: z.enum(['compact', 'standard']),
});

export const updateThemeSettingsSchema = z.object({ body: poThemeSettingsSchema, query: z.object({}).optional(), params: z.object({}).optional() });
export const updateTemplateSettingsSchema = z.object({ body: poTemplateSettingsSchema, query: z.object({}).optional(), params: z.object({}).optional() });
export const updateLayoutSettingsSchema = z.object({ body: poLayoutSettingsSchema, query: z.object({}).optional(), params: z.object({}).optional() });

export type PoThemeSettingsPayload = z.infer<typeof poThemeSettingsSchema>;
export type PoTemplateSettingsPayload = z.infer<typeof poTemplateSettingsSchema>;
export type PoLayoutSettingsPayload = z.infer<typeof poLayoutSettingsSchema>;
