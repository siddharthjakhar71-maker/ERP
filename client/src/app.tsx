import { Outlet, RouterProvider, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { LoginPage } from '@/pages/auth/login-page';
import { SettingsPage } from '@/pages/settings/settings-page';
import { VendorsPage } from '@/pages/vendors/vendors-page';
import { useAuthStore } from '@/store/auth-store';

const queryClient = new QueryClient();

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const dashboardRoute = createRoute({ getParentRoute: () => appRoute, path: '/', component: DashboardPage });
const vendorsRoute = createRoute({ getParentRoute: () => appRoute, path: '/vendors', component: VendorsPage });
const settingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/settings', component: SettingsPage });

const stubPage = (title: string, description: string) => () => (
  <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
    <h1 className="text-2xl font-semibold">{title}</h1>
    <p className="mt-3 text-sm text-muted-foreground">{description}</p>
  </div>
);

const materialsRoute = createRoute({ getParentRoute: () => appRoute, path: '/materials', component: stubPage('Materials', 'Phase 2 module scaffold for categories, units, and procurement specifications.') });
const sitesRoute = createRoute({ getParentRoute: () => appRoute, path: '/sites', component: stubPage('Sites', 'Phase 2 module scaffold for project addresses, site teams, and location controls.') });
const purchaseRoute = createRoute({ getParentRoute: () => appRoute, path: '/purchase-orders', component: stubPage('Purchase Orders', 'Phase 3 module scaffold for multi-line PO creation and approval tracking.') });
const grnRoute = createRoute({ getParentRoute: () => appRoute, path: '/grn', component: stubPage('GRN', 'Phase 4 module scaffold for receipt posting, QC disposition, and inward stock updates.') });
const billsRoute = createRoute({ getParentRoute: () => appRoute, path: '/bills', component: stubPage('Bills', 'Phase 5 module scaffold for AP invoice matching and due management.') });
const paymentsRoute = createRoute({ getParentRoute: () => appRoute, path: '/payments', component: stubPage('Payments', 'Phase 5 module scaffold for vendor settlement and reference tracking.') });
const stockRoute = createRoute({ getParentRoute: () => appRoute, path: '/stock', component: stubPage('Stock', 'Phase 6 module scaffold for site-wise inventory visibility and low-stock controls.') });
const reportsRoute = createRoute({ getParentRoute: () => appRoute, path: '/reports', component: stubPage('Reports', 'Phase 6 module scaffold for procurement analytics, ledgers, and ageing summaries.') });

const routeTree = rootRoute.addChildren([authRoute, appRoute.addChildren([dashboardRoute, vendorsRoute, settingsRoute, materialsRoute, sitesRoute, purchaseRoute, grnRoute, billsRoute, paymentsRoute, stockRoute, reportsRoute])]);
const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </ThemeProvider>
);
