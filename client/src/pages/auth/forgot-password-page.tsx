import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: 'anika@jakhira.com' },
  });

  const onSubmit = async (values: ForgotPasswordForm) => {
    await api<null>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    toast.success('If an account exists, a reset link has been generated.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-grid p-6 lg:p-10">
      <Card className="w-full max-w-md p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Password recovery</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Forgot your password?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your account email and check the server console for the debug reset link.</p>
        </div>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>
          <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Remembered it? <Link to="/login" className="font-medium text-primary">Back to login</Link>
          </div>
        </form>
      </Card>
    </div>
  );
};
