import { ShieldCheck, UserCircle2, Palette, FileText, LayoutTemplate, Building2, MonitorCog, Hash, FileBadge2, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsSectionNav, SettingsSubSectionNav } from '@/components/settings/settings-navigation';
import { useAccount, useChangePassword, useUpdateAccountProfile } from '@/hooks/use-account';
import { useLogout } from '@/hooks/use-logout';
import { useSettings, useUpdatePoLayoutSettings, useUpdatePoTemplateSettings, useUpdateThemeSettings } from '@/hooks/use-settings';
import { PO_PDF_BLOCK_KEYS, createDefaultPoPdfLayoutRows } from '@/features/purchase-orders/purchase-order-pdf';
import type { PoLayoutSettings, PoPdfBlockKey, PoPdfLayoutRow, PoTemplateSettings, PoThemeSettings, PurchaseOrderPdfBlockConfig } from '@/types';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120, 'Full name is too long'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(30, 'Phone number is too long').optional(),
  avatarUrl: z.union([z.string().trim().url('Enter a valid avatar URL'), z.literal('')]).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128, 'New password is too long'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).superRefine((value, ctx) => {
  if (value.newPassword !== value.confirmPassword) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
  if (value.currentPassword === value.newPassword) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'New password must be different from current password', path: ['newPassword'] });
});

const themeSchema = z.object({
  companyName: z.string().trim().min(2),
  logoUrl: z.union([z.string().trim().url(), z.literal('')]),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
  baseFontSize: z.coerce.number().int().min(8).max(16),
  headingFontSize: z.coerce.number().int().min(12).max(24),
  tableFontSize: z.coerce.number().int().min(7).max(14),
  borderStyle: z.enum(['solid', 'dashed', 'double']),
  footerStyle: z.enum(['minimal', 'standard', 'detailed']),
  currencyCode: z.string().trim().min(3).max(10),
  currencyLabel: z.string().trim().min(1).max(24),
  currencyLocale: z.string().trim().min(2).max(24),
});

const templateSchema = z.object({
  showVendorDetails: z.boolean(),
  showBillTo: z.boolean(),
  showShipTo: z.boolean(),
  showAmountInWords: z.boolean(),
  showTermsAndConditions: z.boolean(),
  showPreparedBy: z.boolean(),
  showSignatory: z.boolean(),
  visiblePoDetailFields: z.string().min(1),
  visibleLineItemColumns: z.string().min(1),
});

const layoutSchema = z.object({
  pageMarginX: z.coerce.number().min(20).max(72),
  pageMarginTop: z.coerce.number().min(20).max(90),
  pageMarginBottom: z.coerce.number().min(20).max(90),
  sectionSpacing: z.coerce.number().min(6).max(32),
  headerLeftWidthPercent: z.coerce.number().min(35).max(75),
  headerRightWidthPercent: z.coerce.number().min(25).max(65),
  sectionColumns: z.enum(['2', '3']),
  totalsBlockWidth: z.coerce.number().min(140).max(260),
  layoutDensity: z.enum(['compact', 'standard']),
  indexWidth: z.coerce.number().min(24).max(80),
  descriptionWidth: z.coerce.number().min(120).max(320),
  unitWidth: z.coerce.number().min(36).max(90),
  quantityWidth: z.coerce.number().min(40).max(90),
  rateWidth: z.coerce.number().min(50).max(120),
  amountWidth: z.coerce.number().min(50).max(120),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type ThemeFormValues = z.infer<typeof themeSchema>;
type TemplateFormValues = z.infer<typeof templateSchema>;
type LayoutFormValues = z.infer<typeof layoutSchema>;

type SettingsSectionId = 'general' | 'appearance' | 'purchase-order' | 'account' | 'system';
type PurchaseOrderSubSectionId = 'template' | 'layout' | 'theme' | 'numbering' | 'terms';

const blockLabelMap: Record<PoPdfBlockKey, string> = {
  header: 'Header',
  poDetails: 'PO details',
  vendorDetails: 'Vendor details',
  billTo: 'Bill to',
  shipTo: 'Ship to',
  lineItems: 'Line items',
  totals: 'Totals',
  amountInWords: 'Amount in words',
  terms: 'Terms',
  footer: 'Footer',
};
const checkboxClass = 'h-4 w-4 rounded border border-input';
const selectClass = 'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';
const textareaClass = 'min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring';

const settingsSections = [
  { id: 'general', label: 'General', description: 'ERP identity and business defaults', icon: Building2 },
  { id: 'appearance', label: 'Appearance', description: 'Brand styling for purchase documents', icon: Palette },
  { id: 'purchase-order', label: 'Purchase Order', description: 'Template, layout, numbering, and document behavior', icon: FileText },
  { id: 'account', label: 'Account', description: 'Profile, password, and session preferences', icon: UserCircle2 },
  { id: 'system', label: 'System', description: 'Operational defaults and environment overview', icon: MonitorCog },
] as const;

const purchaseOrderSubSections = [
  { id: 'template', label: 'Template', description: 'Visibility of sections and fields', icon: FileText },
  { id: 'layout', label: 'Layout', description: 'Spacing, widths, and PDF density', icon: LayoutTemplate },
  { id: 'theme', label: 'Theme', description: 'Brand and typography for PO exports', icon: Palette },
  { id: 'numbering', label: 'Numbering', description: 'Prefixes and fiscal cycle references', icon: Hash },
  { id: 'terms', label: 'Terms & Conditions', description: 'Footer and approval content behavior', icon: FileBadge2 },
] as const;

const parseCsvList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const toCsv = (value: string[]) => value.join(', ');

const SectionIntro = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <div className="space-y-2 border-b border-border pb-5">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const SectionCard = ({ title, description, children, action }: { title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Card className="p-6">
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
    <div className="mt-6">{children}</div>
  </Card>
);

const InfoGrid = ({ items }: { items: Array<{ label: string; value?: string | number | null }> }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <Card key={item.label} className="p-5">
        <p className="text-sm text-muted-foreground">{item.label}</p>
        <p className="mt-2 text-lg font-semibold">{item.value || '—'}</p>
      </Card>
    ))}
  </div>
);

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { data: account } = useAccount();
  const updateProfile = useUpdateAccountProfile();
  const changePassword = useChangePassword();
  const updateTheme = useUpdateThemeSettings();
  const updateTemplate = useUpdatePoTemplateSettings();
  const updateLayout = useUpdatePoLayoutSettings();
  const logout = useLogout();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');
  const [activePurchaseOrderSection, setActivePurchaseOrderSection] = useState<PurchaseOrderSubSectionId>('template');
  const [blockRows, setBlockRows] = useState<PoPdfLayoutRow[]>(createDefaultPoPdfLayoutRows());

  const summaryCards = useMemo(() => [
    { label: 'Company Name', value: settings?.companyName },
    { label: 'Procurement Email', value: settings?.procurementEmail },
    { label: 'PO Prefix', value: settings?.purchaseOrderPrefix },
    { label: 'Fiscal Year Start', value: settings ? `Month ${settings.fiscalYearStartMonth}` : '' },
  ], [settings]);

  const generalOverview = useMemo(() => [
    { label: 'Company Name', value: settings?.companyName },
    { label: 'Procurement Email', value: settings?.procurementEmail },
    { label: 'Theme Preference', value: settings?.themePreference },
    { label: 'Fiscal Year Start', value: settings?.fiscalYearStartMonth ? `Month ${settings.fiscalYearStartMonth}` : '' },
  ], [settings]);

  const numberingOverview = useMemo(() => [
    { label: 'Purchase Order Prefix', value: settings?.purchaseOrderPrefix },
    { label: 'GRN Prefix', value: settings?.grnPrefix },
    { label: 'Bill Prefix', value: settings?.billPrefix },
    { label: 'Payment Prefix', value: settings?.paymentPrefix },
  ], [settings]);

  const systemOverview = useMemo(() => [
    { label: 'Currency Code', value: settings?.poTheme.currencyCode },
    { label: 'Currency Locale', value: settings?.poTheme.currencyLocale },
    { label: 'Layout Density', value: settings?.poLayout.layoutDensity },
    { label: 'Section Columns', value: settings?.poLayout.sectionColumns ? `${settings.poLayout.sectionColumns} columns` : '' },
  ], [settings]);

  const { register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile, formState: { errors: profileErrors } } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { fullName: '', email: '', phone: '', avatarUrl: '' } });
  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword, formState: { errors: passwordErrors } } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const { register: registerTheme, handleSubmit: handleThemeSubmit, reset: resetTheme, formState: { errors: themeErrors } } = useForm<ThemeFormValues>({ resolver: zodResolver(themeSchema) });
  const { register: registerTemplate, handleSubmit: handleTemplateSubmit, reset: resetTemplate, formState: { errors: templateErrors } } = useForm<TemplateFormValues>({ resolver: zodResolver(templateSchema) });
  const { register: registerLayout, handleSubmit: handleLayoutSubmit, reset: resetLayout, formState: { errors: layoutErrors } } = useForm<LayoutFormValues>({ resolver: zodResolver(layoutSchema) });

  useEffect(() => {
    if (account) resetProfile({ fullName: account.fullName, email: account.email, phone: account.phone ?? '', avatarUrl: account.avatarUrl ?? '' });
  }, [account, resetProfile]);

  useEffect(() => {
    if (settings) {
      resetTheme(settings.poTheme);
      resetTemplate({
        ...settings.poTemplate,
        visiblePoDetailFields: toCsv(settings.poTemplate.visiblePoDetailFields),
        visibleLineItemColumns: toCsv(settings.poTemplate.visibleLineItemColumns),
      });
      resetLayout({
        ...settings.poLayout,
        indexWidth: settings.poLayout.lineItemColumnWidths.index,
        descriptionWidth: settings.poLayout.lineItemColumnWidths.description,
        unitWidth: settings.poLayout.lineItemColumnWidths.unit,
        quantityWidth: settings.poLayout.lineItemColumnWidths.quantity,
        rateWidth: settings.poLayout.lineItemColumnWidths.rate,
        amountWidth: settings.poLayout.lineItemColumnWidths.amount,
      });
      setBlockRows(settings.poLayout.blockRows?.length ? settings.poLayout.blockRows : createDefaultPoPdfLayoutRows());
    }
  }, [resetLayout, resetTemplate, resetTheme, settings]);

  useEffect(() => {
    if (!changePassword.isSuccess) return;
    resetPassword();
    void navigate({ to: '/login', replace: true });
  }, [changePassword.isSuccess, navigate, resetPassword]);

  const updateBlockRow = (rowId: string, updater: (row: PoPdfLayoutRow) => PoPdfLayoutRow) => setBlockRows((current) => current.map((row) => row.id === rowId ? updater(row) : row));
  const moveBlock = (rowId: string, blockId: string, direction: -1 | 1) => setBlockRows((current) => current.map((row) => {
    if (row.id !== rowId) return row;
    const index = row.blocks.findIndex((block) => block.id === blockId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= row.blocks.length) return row;
    const blocks = [...row.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    return { ...row, blocks };
  }));
  const moveBlockToRow = (blockId: string, targetRowId: string) => setBlockRows((current) => {
    let movedBlock: PurchaseOrderPdfBlockConfig | null = null;
    const withoutBlock = current.map((row) => ({ ...row, blocks: row.blocks.filter((block) => {
      const shouldKeep = block.id !== blockId;
      if (!shouldKeep) movedBlock = block;
      return shouldKeep;
    }) })).filter((row) => row.blocks.length > 0);
    if (!movedBlock) return current;
    return withoutBlock.map((row) => row.id === targetRowId ? { ...row, blocks: [...row.blocks, movedBlock!] } : row);
  });
  const normalizedEditableRows = useMemo(() => {
    const rows = blockRows.length ? blockRows : createDefaultPoPdfLayoutRows();
    const seen = new Set<PoPdfBlockKey>();
    const normalized = rows.map((row, rowIndex) => ({
      ...row,
      id: row.id || `row-${rowIndex + 1}`,
      blocks: row.blocks.map((block, blockIndex) => {
        seen.add(block.key);
        return { ...block, id: block.id || `${block.key}-${rowIndex + 1}-${blockIndex + 1}`, span: Math.max(1, Math.min(block.span, row.columns)) };
      }),
    }));
    PO_PDF_BLOCK_KEYS.forEach((key) => {
      if (!seen.has(key)) normalized.push({ id: `row-extra-${key}`, columns: 1, blocks: [{ id: `${key}-extra`, key, span: 1, visible: true }] });
    });
    return normalized;
  }, [blockRows]);
  const onSubmitTheme = (values: ThemeFormValues) => updateTheme.mutateAsync(values satisfies PoThemeSettings);
  const onSubmitTemplate = (values: TemplateFormValues) => updateTemplate.mutateAsync({
    showVendorDetails: values.showVendorDetails,
    showBillTo: values.showBillTo,
    showShipTo: values.showShipTo,
    showAmountInWords: values.showAmountInWords,
    showTermsAndConditions: values.showTermsAndConditions,
    showPreparedBy: values.showPreparedBy,
    showSignatory: values.showSignatory,
    visiblePoDetailFields: parseCsvList(values.visiblePoDetailFields),
    visibleLineItemColumns: parseCsvList(values.visibleLineItemColumns) as PoTemplateSettings['visibleLineItemColumns'],
  });
  const onSubmitLayout = (values: LayoutFormValues) => updateLayout.mutateAsync({
    pageMarginX: values.pageMarginX,
    pageMarginTop: values.pageMarginTop,
    pageMarginBottom: values.pageMarginBottom,
    sectionSpacing: values.sectionSpacing,
    headerLeftWidthPercent: values.headerLeftWidthPercent,
    headerRightWidthPercent: values.headerRightWidthPercent,
    sectionColumns: values.sectionColumns,
    totalsBlockWidth: values.totalsBlockWidth,
    layoutDensity: values.layoutDensity,
    lineItemColumnWidths: {
      index: values.indexWidth,
      description: values.descriptionWidth,
      unit: values.unitWidth,
      quantity: values.quantityWidth,
      rate: values.rateWidth,
      amount: values.amountWidth,
    },
    blockRows: normalizedEditableRows.filter((row) => row.blocks.length > 0),
  } satisfies PoLayoutSettings);

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Organize JAKHIRA ERP preferences into focused sections for cleaner navigation and faster updates." />

      <InfoGrid items={summaryCards} />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <SettingsSectionNav items={settingsSections} activeId={activeSection} onChange={(id) => setActiveSection(id as SettingsSectionId)} />
        </aside>

        <div className="space-y-6">
          {activeSection === 'general' ? (
            <div className="space-y-6">
              <SectionIntro eyebrow="Section 01" title="General settings" description="Core ERP identity and purchasing defaults are grouped here so teams can quickly confirm the business baseline." />
              <InfoGrid items={generalOverview} />
              <SectionCard title="Business defaults" description="Reference values currently powering procurement flows and document metadata.">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: 'Purchase Order Prefix', value: settings?.purchaseOrderPrefix },
                    { label: 'GRN Prefix', value: settings?.grnPrefix },
                    { label: 'Bill Prefix', value: settings?.billPrefix },
                    { label: 'Payment Prefix', value: settings?.paymentPrefix },
                    { label: 'Default Currency', value: `${settings?.poTheme.currencyCode ?? '—'} · ${settings?.poTheme.currencyLabel ?? '—'}` },
                    { label: 'Currency Locale', value: settings?.poTheme.currencyLocale },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border bg-background/50 p-4">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-2 font-medium">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === 'appearance' ? (
            <div className="space-y-6">
              <SectionIntro eyebrow="Section 02" title="Appearance" description="Adjust how your purchase order documents look without touching the underlying generation logic." />
              <SectionCard title="Brand and typography" description="Update logo, colors, fonts, borders, and currency presentation for exported purchase orders.">
                <form className="grid gap-6" onSubmit={handleThemeSubmit(onSubmitTheme)}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="po-companyName">Company name</Label><Input id="po-companyName" {...registerTheme('companyName')} />{themeErrors.companyName ? <p className="text-sm text-destructive">{themeErrors.companyName.message}</p> : null}</div>
                    <div className="space-y-2"><Label htmlFor="logoUrl">Logo URL</Label><Input id="logoUrl" {...registerTheme('logoUrl')} />{themeErrors.logoUrl ? <p className="text-sm text-destructive">{themeErrors.logoUrl.message}</p> : null}</div>
                    <div className="space-y-2"><Label htmlFor="primaryColor">Primary color</Label><Input id="primaryColor" {...registerTheme('primaryColor')} />{themeErrors.primaryColor ? <p className="text-sm text-destructive">{themeErrors.primaryColor.message}</p> : null}</div>
                    <div className="space-y-2"><Label htmlFor="currencyLabel">Currency label</Label><Input id="currencyLabel" {...registerTheme('currencyLabel')} /></div>
                    <div className="space-y-2"><Label htmlFor="currencyCode">Currency code</Label><Input id="currencyCode" {...registerTheme('currencyCode')} /></div>
                    <div className="space-y-2"><Label htmlFor="currencyLocale">Currency locale</Label><Input id="currencyLocale" {...registerTheme('currencyLocale')} /></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2"><Label htmlFor="baseFontSize">Base font size</Label><Input id="baseFontSize" type="number" {...registerTheme('baseFontSize')} /></div>
                    <div className="space-y-2"><Label htmlFor="headingFontSize">Heading font size</Label><Input id="headingFontSize" type="number" {...registerTheme('headingFontSize')} /></div>
                    <div className="space-y-2"><Label htmlFor="tableFontSize">Table font size</Label><Input id="tableFontSize" type="number" {...registerTheme('tableFontSize')} /></div>
                    <div className="space-y-2"><Label htmlFor="borderStyle">Border style</Label><select id="borderStyle" className={selectClass} {...registerTheme('borderStyle')}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="double">Double</option></select></div>
                    <div className="space-y-2"><Label htmlFor="footerStyle">Footer style</Label><select id="footerStyle" className={selectClass} {...registerTheme('footerStyle')}><option value="minimal">Minimal</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select></div>
                  </div>
                  <div className="flex justify-end"><Button type="submit" disabled={updateTheme.isPending}>{updateTheme.isPending ? 'Saving...' : 'Save appearance settings'}</Button></div>
                </form>
              </SectionCard>
            </div>
          ) : null}

          {activeSection === 'purchase-order' ? (
            <div className="space-y-6">
              <SectionIntro eyebrow="Section 03" title="Purchase Order settings" description="All purchase order controls are grouped here with dedicated sub-sections for template, layout, theme, numbering, and terms." />
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                <SettingsSubSectionNav items={purchaseOrderSubSections} activeId={activePurchaseOrderSection} onChange={(id) => setActivePurchaseOrderSection(id as PurchaseOrderSubSectionId)} />

                <div className="space-y-6">
                  {activePurchaseOrderSection === 'template' ? (
                    <SectionCard title="Template" description="Control which purchase order sections and columns are visible in the generated document.">
                      <form className="grid gap-5 md:grid-cols-2" onSubmit={handleTemplateSubmit(onSubmitTemplate)}>
                        {[
                          ['showVendorDetails', 'Show vendor details'],
                          ['showBillTo', 'Show bill to section'],
                          ['showShipTo', 'Show ship to section'],
                          ['showAmountInWords', 'Show amount in words'],
                          ['showTermsAndConditions', 'Show terms and conditions'],
                          ['showPreparedBy', 'Show prepared by'],
                          ['showSignatory', 'Show signatory'],
                        ].map(([field, label]) => <label key={field} className="flex items-center gap-3 rounded-2xl border border-border p-4 text-sm font-medium"><input type="checkbox" className={checkboxClass} {...registerTemplate(field as keyof TemplateFormValues)} />{label}</label>)}
                        <div className="space-y-2 md:col-span-2"><Label htmlFor="visiblePoDetailFields">Visible PO detail fields</Label><textarea id="visiblePoDetailFields" className={textareaClass} {...registerTemplate('visiblePoDetailFields')} />{templateErrors.visiblePoDetailFields ? <p className="text-sm text-destructive">Comma-separated field list is required.</p> : <p className="text-xs text-muted-foreground">Example: projectName, projectAddress, poNumber, poDate, billingName, billingAddress</p>}</div>
                        <div className="space-y-2 md:col-span-2"><Label htmlFor="visibleLineItemColumns">Visible line item columns</Label><textarea id="visibleLineItemColumns" className={textareaClass} {...registerTemplate('visibleLineItemColumns')} />{templateErrors.visibleLineItemColumns ? <p className="text-sm text-destructive">Comma-separated line item columns are required.</p> : <p className="text-xs text-muted-foreground">Allowed: index, description, unit, quantity, rate, amount</p>}</div>
                        <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={updateTemplate.isPending}>{updateTemplate.isPending ? 'Saving...' : 'Save template settings'}</Button></div>
                      </form>
                    </SectionCard>
                  ) : null}

                  {activePurchaseOrderSection === 'layout' ? (
                    <SectionCard title="Layout" description="Refine spacing, block widths, line-item proportions, and row-based block placement for the purchase order PDF.">
                      <form className="grid gap-6" onSubmit={handleLayoutSubmit(onSubmitLayout)}>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {[
                            ['pageMarginX', 'Page margin X'], ['pageMarginTop', 'Page margin top'], ['pageMarginBottom', 'Page margin bottom'], ['sectionSpacing', 'Section spacing'], ['headerLeftWidthPercent', 'Header left width %'], ['headerRightWidthPercent', 'Header right width %'], ['totalsBlockWidth', 'Totals block width'], ['indexWidth', 'Index col width'], ['descriptionWidth', 'Description col width'], ['unitWidth', 'Unit col width'], ['quantityWidth', 'Quantity col width'], ['rateWidth', 'Rate col width'], ['amountWidth', 'Amount col width'],
                          ].map(([field, label]) => <div key={field} className="space-y-2"><Label htmlFor={field}>{label}</Label><Input id={field} type="number" {...registerLayout(field as keyof LayoutFormValues)} />{layoutErrors[field as keyof LayoutFormValues] ? <p className="text-sm text-destructive">{String(layoutErrors[field as keyof LayoutFormValues]?.message ?? '')}</p> : null}</div>)}
                          <div className="space-y-2"><Label htmlFor="sectionColumns">Section layout</Label><select id="sectionColumns" className={selectClass} {...registerLayout('sectionColumns')}><option value="2">2-column</option><option value="3">3-column</option></select></div>
                          <div className="space-y-2"><Label htmlFor="layoutDensity">Layout density</Label><select id="layoutDensity" className={selectClass} {...registerLayout('layoutDensity')}><option value="compact">Compact</option><option value="standard">Standard</option></select></div>
                        </div>
                        <div className="space-y-4 rounded-2xl border border-border p-5">
                          <div>
                            <h4 className="text-base font-semibold">PO block layout</h4>
                            <p className="text-sm text-muted-foreground">Reorder blocks, hide sections, choose spans, and move blocks between 1, 2, or 3 column rows.</p>
                          </div>
                          <div className="space-y-4">
                            {normalizedEditableRows.map((row) => (
                              <div key={row.id} className="space-y-4 rounded-2xl border border-border/70 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="font-medium">{row.id}</p>
                                    <p className="text-xs text-muted-foreground">Blocks in this row share the tallest rendered height.</p>
                                  </div>
                                  <div className="w-full md:w-48">
                                    <Label htmlFor={`${row.id}-columns`}>Columns</Label>
                                    <select id={`${row.id}-columns`} className={selectClass} value={row.columns} onChange={(event) => updateBlockRow(row.id, (currentRow) => ({ ...currentRow, columns: Number(event.target.value) as 1 | 2 | 3, blocks: currentRow.blocks.map((block) => ({ ...block, span: Math.min(block.span, Number(event.target.value)) })) }))}>
                                      <option value={1}>1 column</option>
                                      <option value={2}>2 columns</option>
                                      <option value={3}>3 columns</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {row.blocks.map((block, blockIndex) => (
                                    <div key={block.id} className="grid gap-3 rounded-xl border border-border/60 p-4 md:grid-cols-[minmax(0,1.3fr)_150px_140px_120px_auto] md:items-end">
                                      <div className="space-y-2">
                                        <Label>Block</Label>
                                        <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-medium">{blockLabelMap[block.key]}</div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor={`${block.id}-row`}>Row</Label>
                                        <select id={`${block.id}-row`} className={selectClass} value={row.id} onChange={(event) => moveBlockToRow(block.id, event.target.value)}>
                                          {normalizedEditableRows.map((candidateRow) => <option key={candidateRow.id} value={candidateRow.id}>{candidateRow.id}</option>)}
                                        </select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor={`${block.id}-span`}>Span</Label>
                                        <select id={`${block.id}-span`} className={selectClass} value={Math.min(block.span, row.columns)} onChange={(event) => updateBlockRow(row.id, (currentRow) => ({ ...currentRow, blocks: currentRow.blocks.map((item) => item.id === block.id ? { ...item, span: Number(event.target.value) } : item) }))}>
                                          {Array.from({ length: row.columns }, (_, index) => index + 1).map((value) => <option key={value} value={value}>Span {value}</option>)}
                                        </select>
                                      </div>
                                      <label className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-sm font-medium">
                                        <input type="checkbox" className={checkboxClass} checked={block.visible} onChange={(event) => updateBlockRow(row.id, (currentRow) => ({ ...currentRow, blocks: currentRow.blocks.map((item) => item.id === block.id ? { ...item, visible: event.target.checked } : item) }))} />
                                        Visible
                                      </label>
                                      <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" disabled={blockIndex === 0} onClick={() => moveBlock(row.id, block.id, -1)}>Up</Button>
                                        <Button type="button" variant="outline" size="sm" disabled={blockIndex === row.blocks.length - 1} onClick={() => moveBlock(row.id, block.id, 1)}>Down</Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end"><Button type="submit" disabled={updateLayout.isPending}>{updateLayout.isPending ? 'Saving...' : 'Save layout settings'}</Button></div>
                      </form>
                    </SectionCard>
                  ) : null}

                  {activePurchaseOrderSection === 'theme' ? (
                    <SectionCard title="PO Theme" description="This sub-section mirrors the appearance controls so procurement teams can manage all purchase-order-specific styling from one grouped area." action={<Button type="button" variant="outline" onClick={() => setActiveSection('appearance')}>Open appearance <ChevronRight className="ml-2 h-4 w-4" /></Button>}>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[
                          { label: 'Company name', value: settings?.poTheme.companyName },
                          { label: 'Primary color', value: settings?.poTheme.primaryColor },
                          { label: 'Border style', value: settings?.poTheme.borderStyle },
                          { label: 'Footer style', value: settings?.poTheme.footerStyle },
                          { label: 'Base font size', value: settings?.poTheme.baseFontSize },
                          { label: 'Table font size', value: settings?.poTheme.tableFontSize },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-border bg-background/50 p-4">
                            <p className="text-sm text-muted-foreground">{item.label}</p>
                            <p className="mt-2 font-medium">{item.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}

                  {activePurchaseOrderSection === 'numbering' ? (
                    <div className="space-y-6">
                      <InfoGrid items={numberingOverview} />
                      <SectionCard title="Numbering and fiscal cycle" description="Current numbering references remain intact and are surfaced here for quick verification by procurement and finance teams.">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-border p-4">
                            <p className="text-sm text-muted-foreground">Fiscal year start</p>
                            <p className="mt-2 font-medium">{settings?.fiscalYearStartMonth ? `Month ${settings.fiscalYearStartMonth}` : '—'}</p>
                          </div>
                          <div className="rounded-2xl border border-border p-4">
                            <p className="text-sm text-muted-foreground">Purchase document pattern</p>
                            <p className="mt-2 font-medium">{settings?.purchaseOrderPrefix ? `${settings.purchaseOrderPrefix} / FY / ####` : '—'}</p>
                          </div>
                        </div>
                      </SectionCard>
                    </div>
                  ) : null}

                  {activePurchaseOrderSection === 'terms' ? (
                    <SectionCard title="Terms & conditions" description="Collect all footer- and approval-related PO behaviors in one place so teams can understand how closing sections are rendered.">
                      <div className="grid gap-4 md:grid-cols-2">
                        {[
                          { label: 'Terms section enabled', value: settings?.poTemplate.showTermsAndConditions ? 'Yes' : 'No' },
                          { label: 'Prepared by block', value: settings?.poTemplate.showPreparedBy ? 'Shown' : 'Hidden' },
                          { label: 'Signatory block', value: settings?.poTemplate.showSignatory ? 'Shown' : 'Hidden' },
                          { label: 'Footer style', value: settings?.poTheme.footerStyle },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-border p-4">
                            <p className="text-sm text-muted-foreground">{item.label}</p>
                            <p className="mt-2 font-medium">{item.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {activeSection === 'account' ? (
            <div className="space-y-6">
              <SectionIntro eyebrow="Section 04" title="Account" description="Personal details and security settings are separated into their own workspace to avoid clutter on operational settings." />
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionCard title="Profile" description="Update your profile information and keep your JAKHIRA ERP account details accurate.">
                  <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProfileSubmit((values) => updateProfile.mutateAsync(values))}>
                    <div className="space-y-2 md:col-span-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" {...registerProfile('fullName')} />{profileErrors.fullName ? <p className="text-sm text-destructive">{profileErrors.fullName.message}</p> : null}</div>
                    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" {...registerProfile('email')} />{profileErrors.email ? <p className="text-sm text-destructive">{profileErrors.email.message}</p> : null}</div>
                    <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" {...registerProfile('phone')} />{profileErrors.phone ? <p className="text-sm text-destructive">{profileErrors.phone.message}</p> : null}</div>
                    <div className="space-y-2 md:col-span-2"><Label htmlFor="avatarUrl">Avatar URL</Label><Input id="avatarUrl" placeholder="https://..." {...registerProfile('avatarUrl')} />{profileErrors.avatarUrl ? <p className="text-sm text-destructive">{profileErrors.avatarUrl.message}</p> : null}</div>
                    <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving...' : 'Save profile changes'}</Button></div>
                  </form>
                </SectionCard>

                <SectionCard title="Session & security" description="Password updates force a fresh sign-in for safer session handling.">
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-background/50 p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Current account overview</p>
                      <p className="text-sm text-muted-foreground">Review role and status before changing credentials.</p>
                    </div>
                  </div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Account</dt><dd>{account?.fullName}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Role</dt><dd className="capitalize">{account?.role?.replace(/_/g, ' ')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{account?.status}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd>{account?.email}</dd></div>
                  </dl>
                  <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit((values) => changePassword.mutateAsync(values))}>
                    <div className="space-y-2"><Label htmlFor="currentPassword">Current password</Label><Input id="currentPassword" type="password" {...registerPassword('currentPassword')} />{passwordErrors.currentPassword ? <p className="text-sm text-destructive">{passwordErrors.currentPassword.message}</p> : null}</div>
                    <div className="space-y-2"><Label htmlFor="newPassword">New password</Label><Input id="newPassword" type="password" {...registerPassword('newPassword')} />{passwordErrors.newPassword ? <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p> : null}</div>
                    <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm new password</Label><Input id="confirmPassword" type="password" {...registerPassword('confirmPassword')} />{passwordErrors.confirmPassword ? <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p> : null}</div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="outline" onClick={() => void logout()}>Logout</Button><Button type="submit" disabled={changePassword.isPending}>{changePassword.isPending ? 'Updating...' : 'Change password'}</Button></div>
                  </form>
                </SectionCard>
              </div>
            </div>
          ) : null}

          {activeSection === 'system' ? (
            <div className="space-y-6">
              <SectionIntro eyebrow="Section 05" title="System" description="A lightweight operational overview for admins who want to verify active purchase-order-related defaults at a glance." />
              <InfoGrid items={systemOverview} />
              <SectionCard title="Document engine snapshot" description="This optional system area summarizes active document-generation settings without altering the existing backend behavior.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: 'Header split', value: settings ? `${settings.poLayout.headerLeftWidthPercent}% / ${settings.poLayout.headerRightWidthPercent}%` : '' },
                    { label: 'Margins', value: settings ? `${settings.poLayout.pageMarginX} / ${settings.poLayout.pageMarginTop} / ${settings.poLayout.pageMarginBottom}` : '' },
                    { label: 'Section spacing', value: settings?.poLayout.sectionSpacing },
                    { label: 'Totals block width', value: settings?.poLayout.totalsBlockWidth },
                    { label: 'Visible detail fields', value: settings?.poTemplate.visiblePoDetailFields.length },
                    { label: 'Visible item columns', value: settings?.poTemplate.visibleLineItemColumns.length },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border p-4">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-2 font-medium">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
