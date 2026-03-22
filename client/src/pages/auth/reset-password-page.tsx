import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage = ({ token }: { token: string }) => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordForm) => {
    await api<null>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: values.newPassword, confirmPassword: values.confirmPassword }),
    });
    toast.success('Password reset successful. Please sign in with your new password.');
    await navigate({ to: '/login' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-grid p-6 lg:p-10">
      <Card className="w-full max-w-md p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Reset password</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">This link works once and expires after 30 minutes.</p>
        </div>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" {...register('newPassword')} />
            {errors.newPassword ? <p className="text-sm text-destructive">{errors.newPassword.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword ? <p className="text-sm text-destructive">{errors.confirmPassword.message}</p> : null}
          </div>
          <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
