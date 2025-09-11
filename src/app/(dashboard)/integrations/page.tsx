import { Metadata } from 'next';
import { Suspense } from 'react';

// Components
import { CRMIntegrationDashboard } from '@/components/integrations/CRMIntegrationDashboard';
import { DashboardShell } from '@/components/ui/dashboard-shell';
import { DashboardHeader } from '@/components/ui/dashboard-header';

// Utils
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'CRM Integrations | WedSync',
  description:
    'Connect and manage your CRM integrations to sync client data automatically',
};

export default async function IntegrationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="CRM Integrations"
        text="Connect your existing CRM systems to import clients and sync data automatically"
      />

      <Suspense fallback={<IntegrationsDashboardSkeleton />}>
        <CRMIntegrationDashboard
          organizationId={user.organization_id}
          className="max-w-7xl mx-auto"
        />
      </Suspense>
    </DashboardShell>
  );
}

// Loading skeleton component
function IntegrationsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
