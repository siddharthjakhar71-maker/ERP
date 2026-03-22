import { ShieldCheck, UserCircle2, Palette, FileText, LayoutTemplate } from 'lucide-react';
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
import { useAccount, useChangePassword, useUpdateAccountProfile } from '@/hooks/use-account';
import { useLogout } from '@/hooks/use-logout';
import { useSettings, useUpdatePoLayoutSettings, useUpdatePoTemplateSettings, useUpdateThemeSettings } from '@/hooks/use-settings';
import type { PoLayoutSettings, PoTemplateSettings, PoThemeSettings } from '@/types';

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

const checkboxClass = 'h-4 w-4 rounded border border-input';
const textareaClass = 'min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring';
const tabs = [
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'template', label: 'PO Template', icon: FileText },
  { id: 'layout', label: 'PO Layout', icon: LayoutTemplate },
] as const;

const parseCsvList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const toCsv = (value: string[]) => value.join(', ');

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
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('theme');

  const summaryCards = useMemo(() => [
    { label: 'Company Name', value: settings?.companyName },
    { label: 'Procurement Email', value: settings?.procurementEmail },
    { label: 'PO Prefix', value: settings?.purchaseOrderPrefix },
    { label: 'Fiscal Year Start', value: settings ? `Month ${settings.fiscalYearStartMonth}` : '' },
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
    }
  }, [resetLayout, resetTemplate, resetTheme, settings]);

  useEffect(() => {
    if (!changePassword.isSuccess) return;
    resetPassword();
    void navigate({ to: '/login', replace: true });
  }, [changePassword.isSuccess, navigate, resetPassword]);

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
  } satisfies PoLayoutSettings);

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage account preferences plus configurable purchase order theme, template visibility, and PDF layout behavior." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => <Card key={card.label} className="p-5"><p className="text-sm text-muted-foreground">{card.label}</p><p className="mt-2 text-lg font-semibold">{card.value || '—'}</p></Card>)}
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return <Button key={tab.id} type="button" variant={activeTab === tab.id ? 'default' : 'outline'} onClick={() => setActiveTab(tab.id)}><Icon className="mr-2 h-4 w-4" />{tab.label}</Button>;
          })}
        </div>

        {activeTab === 'theme' ? (
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleThemeSubmit(onSubmitTheme)}>
            <div className="space-y-2"><Label htmlFor="po-companyName">Company name</Label><Input id="po-companyName" {...registerTheme('companyName')} />{themeErrors.companyName ? <p className="text-sm text-destructive">{themeErrors.companyName.message}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="logoUrl">Logo URL</Label><Input id="logoUrl" {...registerTheme('logoUrl')} />{themeErrors.logoUrl ? <p className="text-sm text-destructive">{themeErrors.logoUrl.message}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="primaryColor">Primary color</Label><Input id="primaryColor" {...registerTheme('primaryColor')} />{themeErrors.primaryColor ? <p className="text-sm text-destructive">{themeErrors.primaryColor.message}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="currencyLabel">Currency label</Label><Input id="currencyLabel" {...registerTheme('currencyLabel')} /></div>
            <div className="space-y-2"><Label htmlFor="currencyCode">Currency code</Label><Input id="currencyCode" {...registerTheme('currencyCode')} /></div>
            <div className="space-y-2"><Label htmlFor="currencyLocale">Currency locale</Label><Input id="currencyLocale" {...registerTheme('currencyLocale')} /></div>
            <div className="space-y-2"><Label htmlFor="baseFontSize">Base font size</Label><Input id="baseFontSize" type="number" {...registerTheme('baseFontSize')} /></div>
            <div className="space-y-2"><Label htmlFor="headingFontSize">Heading font size</Label><Input id="headingFontSize" type="number" {...registerTheme('headingFontSize')} /></div>
            <div className="space-y-2"><Label htmlFor="tableFontSize">Table font size</Label><Input id="tableFontSize" type="number" {...registerTheme('tableFontSize')} /></div>
            <div className="space-y-2"><Label htmlFor="borderStyle">Border style</Label><select id="borderStyle" className={textareaClass.replace('min-h-[96px] ', '')} {...registerTheme('borderStyle')}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="double">Double</option></select></div>
            <div className="space-y-2"><Label htmlFor="footerStyle">Footer style</Label><select id="footerStyle" className={textareaClass.replace('min-h-[96px] ', '')} {...registerTheme('footerStyle')}><option value="minimal">Minimal</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select></div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={updateTheme.isPending}>{updateTheme.isPending ? 'Saving...' : 'Save theme settings'}</Button></div>
          </form>
        ) : null}

        {activeTab === 'template' ? (
          <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleTemplateSubmit(onSubmitTemplate)}>
            {[
              ['showVendorDetails', 'Show vendor details'],
              ['showBillTo', 'Show bill to section'],
              ['showShipTo', 'Show ship to section'],
              ['showAmountInWords', 'Show amount in words'],
              ['showTermsAndConditions', 'Show terms and conditions'],
              ['showPreparedBy', 'Show prepared by'],
              ['showSignatory', 'Show signatory'],
            ].map(([field, label]) => <label key={field} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium"><input type="checkbox" className={checkboxClass} {...registerTemplate(field as keyof TemplateFormValues)} />{label}</label>)}
            <div className="space-y-2 md:col-span-2"><Label htmlFor="visiblePoDetailFields">Visible PO detail fields</Label><textarea id="visiblePoDetailFields" className={textareaClass} {...registerTemplate('visiblePoDetailFields')} />{templateErrors.visiblePoDetailFields ? <p className="text-sm text-destructive">Comma-separated field list is required.</p> : <p className="text-xs text-muted-foreground">Example: projectName, projectAddress, poNumber, poDate, billingName, billingAddress</p>}</div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="visibleLineItemColumns">Visible line item columns</Label><textarea id="visibleLineItemColumns" className={textareaClass} {...registerTemplate('visibleLineItemColumns')} />{templateErrors.visibleLineItemColumns ? <p className="text-sm text-destructive">Comma-separated line item columns are required.</p> : <p className="text-xs text-muted-foreground">Allowed: index, description, unit, quantity, rate, amount</p>}</div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={updateTemplate.isPending}>{updateTemplate.isPending ? 'Saving...' : 'Save template settings'}</Button></div>
          </form>
        ) : null}

        {activeTab === 'layout' ? (
          <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleLayoutSubmit(onSubmitLayout)}>
            {[
              ['pageMarginX', 'Page margin X'], ['pageMarginTop', 'Page margin top'], ['pageMarginBottom', 'Page margin bottom'], ['sectionSpacing', 'Section spacing'], ['headerLeftWidthPercent', 'Header left width %'], ['headerRightWidthPercent', 'Header right width %'], ['totalsBlockWidth', 'Totals block width'], ['indexWidth', 'Index col width'], ['descriptionWidth', 'Description col width'], ['unitWidth', 'Unit col width'], ['quantityWidth', 'Quantity col width'], ['rateWidth', 'Rate col width'], ['amountWidth', 'Amount col width'],
            ].map(([field, label]) => <div key={field} className="space-y-2"><Label htmlFor={field}>{label}</Label><Input id={field} type="number" {...registerLayout(field as keyof LayoutFormValues)} />{layoutErrors[field as keyof LayoutFormValues] ? <p className="text-sm text-destructive">{String(layoutErrors[field as keyof LayoutFormValues]?.message ?? '')}</p> : null}</div>)}
            <div className="space-y-2"><Label htmlFor="sectionColumns">Section layout</Label><select id="sectionColumns" className={textareaClass.replace('min-h-[96px] ', '')} {...registerLayout('sectionColumns')}><option value="2">2-column</option><option value="3">3-column</option></select></div>
            <div className="space-y-2"><Label htmlFor="layoutDensity">Layout density</Label><select id="layoutDensity" className={textareaClass.replace('min-h-[96px] ', '')} {...registerLayout('layoutDensity')}><option value="compact">Compact</option><option value="standard">Standard</option></select></div>
            <div className="xl:col-span-3 flex justify-end"><Button type="submit" disabled={updateLayout.isPending}>{updateLayout.isPending ? 'Saving...' : 'Save layout settings'}</Button></div>
          </form>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-start gap-3"><UserCircle2 className="mt-1 h-5 w-5 text-primary" /><div><h3 className="text-lg font-semibold">Account settings</h3><p className="text-sm text-muted-foreground">Update your profile information and keep your JAKHIRA ERP account details accurate.</p></div></div>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleProfileSubmit((values) => updateProfile.mutateAsync(values))}>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" {...registerProfile('fullName')} />{profileErrors.fullName ? <p className="text-sm text-destructive">{profileErrors.fullName.message}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" {...registerProfile('email')} />{profileErrors.email ? <p className="text-sm text-destructive">{profileErrors.email.message}</p> : null}</div>
            <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" {...registerProfile('phone')} />{profileErrors.phone ? <p className="text-sm text-destructive">{profileErrors.phone.message}</p> : null}</div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="avatarUrl">Avatar URL</Label><Input id="avatarUrl" placeholder="https://..." {...registerProfile('avatarUrl')} />{profileErrors.avatarUrl ? <p className="text-sm text-destructive">{profileErrors.avatarUrl.message}</p> : null}</div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving...' : 'Save profile changes'}</Button></div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-primary" /><div><h3 className="text-lg font-semibold">Session & security</h3><p className="text-sm text-muted-foreground">Password updates force a fresh sign-in for safer session handling.</p></div></div>
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
        </Card>
      </div>
    </div>
  );
};
