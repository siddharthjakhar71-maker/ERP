import { Bell, ChevronsLeftRight, LogOut, MoonStar, Search, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLogout } from '@/hooks/use-logout';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';

export const Header = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const { toggleSidebar } = useUiStore();
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={toggleSidebar}>
          <ChevronsLeftRight className="h-4 w-4" />
        </Button>
        <div className="relative hidden w-80 lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search vendors, POs, GRNs, bills..." />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
          {resolvedTheme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="hidden rounded-2xl border border-border bg-card px-4 py-2 text-right md:block">
          <p className="text-sm font-semibold">{user?.fullName ?? 'Guest User'}</p>
          <p className="text-xs text-muted-foreground">{user?.role ?? 'Visitor'}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
