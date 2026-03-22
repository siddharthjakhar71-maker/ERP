import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, CartesianGrid } from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card } from '@/components/ui/card';
import { useDashboard } from '@/hooks/use-dashboard';

const colors = ['hsl(var(--primary))', 'hsl(var(--foreground) / 0.72)', 'hsl(var(--foreground) / 0.55)', 'hsl(var(--foreground) / 0.38)'];

export const DashboardPage = () => {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Procurement command center"
        description="Live overview of purchase commitments, receiving operations, payables, and stock movements across active sites."
      />
      <section className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
        {data.summary.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Monthly purchase trend</h3>
              <p className="text-sm text-muted-foreground">Track spend momentum and planning discipline.</p>
            </div>
          </div>
          <div className="mt-6 h-80">
            <ResponsiveContainer>
              <AreaChart data={data.monthlyPurchases}>
                <defs>
                  <linearGradient id="purchaseTrend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#purchaseTrend)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Vendor share</h3>
          <p className="text-sm text-muted-foreground">Top supplier contribution to the current month purchase value.</p>
          <div className="mt-6 h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.vendorBreakdown} dataKey="value" innerRadius={74} outerRadius={108} paddingAngle={3}>
                  {data.vendorBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {data.vendorBreakdown.map((vendor, index) => (
              <div key={vendor.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                  <span>{vendor.name}</span>
                </div>
                <span className="text-muted-foreground">{vendor.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Recent activity</h3>
        <div className="mt-6 space-y-4">
          {data.activities.map((activity) => (
            <div key={activity.id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{activity.title}</p>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
