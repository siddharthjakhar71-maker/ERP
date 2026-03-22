import { ShieldCheck, UserCircle2 } from 'lucide-react';
import { useEffect } from 'react';
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
import { useSettings } from '@/hooks/use-settings';

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
  if (value.newPassword !== value.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
  }
  if (value.currentPassword === value.newPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'New password must be different from current password', path: ['newPassword'] });
  }
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { data: account } = useAccount();
  const updateProfile = useUpdateAccountProfile();
  const changePassword = useChangePassword();
  const logout = useLogout();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { fullName: '', email: '', phone: '', avatarUrl: '' } });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  useEffect(() => {
    if (account) {
      resetProfile({ fullName: account.fullName, email: account.email, phone: account.phone ?? '', avatarUrl: account.avatarUrl ?? '' });
    }
  }, [account, resetProfile]);

  useEffect(() => {
    if (!changePassword.isSuccess) return;
    resetPassword();
    void navigate({ to: '/login', replace: true });
  }, [changePassword.isSuccess, navigate, resetPassword]);

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Company identity, numbering controls, workspace preferences, and secure self-service account management." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Company profile</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Company Name</dt><dd>{settings?.companyName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Procurement Email</dt><dd>{settings?.procurementEmail}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Fiscal Year Start</dt><dd>Month {settings?.fiscalYearStartMonth}</dd></div>
          </dl>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Numbering configuration</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">PO Prefix</dt><dd>{settings?.purchaseOrderPrefix}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">GRN Prefix</dt><dd>{settings?.grnPrefix}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Bill Prefix</dt><dd>{settings?.billPrefix}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Payment Prefix</dt><dd>{settings?.paymentPrefix}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <UserCircle2 className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Account settings</h3>
              <p className="text-sm text-muted-foreground">Update your profile information and keep your JAKHIRA ERP account details accurate.</p>
            </div>
          </div>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleProfileSubmit((values) => updateProfile.mutateAsync(values))}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" {...registerProfile('fullName')} />
              {profileErrors.fullName ? <p className="text-sm text-destructive">{profileErrors.fullName.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...registerProfile('email')} />
              {profileErrors.email ? <p className="text-sm text-destructive">{profileErrors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...registerProfile('phone')} />
              {profileErrors.phone ? <p className="text-sm text-destructive">{profileErrors.phone.message}</p> : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input id="avatarUrl" placeholder="https://..." {...registerProfile('avatarUrl')} />
              {profileErrors.avatarUrl ? <p className="text-sm text-destructive">{profileErrors.avatarUrl.message}</p> : null}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving...' : 'Save profile changes'}</Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Session & security</h3>
              <p className="text-sm text-muted-foreground">Password updates force a fresh sign-in for safer session handling.</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Account</dt><dd>{account?.fullName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Role</dt><dd className="capitalize">{account?.role?.replace(/_/g, ' ')}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{account?.status}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd>{account?.email}</dd></div>
          </dl>
          <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit((values) => changePassword.mutateAsync(values))}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" type="password" {...registerPassword('currentPassword')} />
              {passwordErrors.currentPassword ? <p className="text-sm text-destructive">{passwordErrors.currentPassword.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" {...registerPassword('newPassword')} />
              {passwordErrors.newPassword ? <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" {...registerPassword('confirmPassword')} />
              {passwordErrors.confirmPassword ? <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p> : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={() => void logout()}>Logout</Button>
              <Button type="submit" disabled={changePassword.isPending}>{changePassword.isPending ? 'Updating...' : 'Change password'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
