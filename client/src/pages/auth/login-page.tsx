import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().default(false),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'anika@jakhira.com',
      password: 'password123',
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginForm) => {
    const response = await api<{ token: string; user: { id: string; fullName: string; role: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    login(response);
    await navigate({ to: '/' });
  };

  return (
    <div className="grid min-h-screen bg-hero-grid lg:grid-cols-[1.2fr_0.8fr]">
      <div className="hidden flex-col justify-between p-10 lg:flex">
        <div>
          <div className="inline-flex items-center rounded-full border border-border bg-background/80 px-4 py-2 text-xs uppercase tracking-[0.28em] text-muted-foreground backdrop-blur">
            JAKHIRA ERP
          </div>
          <div className="mt-12 max-w-2xl">
            <h1 className="text-5xl font-semibold tracking-tight">Procurement control for modern construction teams.</h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Manage vendors, material procurement, GRNs, payables, and stock with a premium workflow built for real estate operations.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            'Multi-site procurement visibility',
            'Fast approvals and GRN traceability',
            'Vendor balance and payment intelligence',
            'Dark and light enterprise workspace',
          ].map((item) => (
            <Card key={item} className="p-5">
              <p className="text-sm text-muted-foreground">{item}</p>
            </Card>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-10">
        <Card className="w-full max-w-md p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Welcome back</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to JAKHIRA</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use your procurement workspace credentials to continue.</p>
          </div>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register('email')} />
              {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="rounded border-border" {...register('rememberMe')} />
                Remember me
              </label>
              <Link to="/forgot-password" className="font-medium text-primary">
                Forgot password?
              </Link>
            </div>
            <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
