import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

// Components
import { FieldMappingInterface } from '@/components/integrations/FieldMappingInterface';
import { DashboardShell } from '@/components/ui/dashboard-shell';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Utils and Types
import { getCurrentUser } from '@/lib/auth';
import {
  getCRMIntegration,
  getCRMFields,
  getWedSyncFields,
  getFieldMappings,
} from '@/lib/api/crm-integrations';
import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    integrationId: string;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const integration = await getCRMIntegration(params.integrationId);

  return {
    title: `Field Mapping - ${integration?.connection_name || 'Integration'} | WedSync`,
    description: `Configure field mapping for your ${integration?.crm_provider} CRM integration`,
  };
}

export default async function FieldMappingPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const integration = await getCRMIntegration(params.integrationId);

  if (!integration || integration.organization_id !== user.organization_id) {
    notFound();
  }

  // Fetch required data for field mapping
  const [crmFields, wedSyncFields, existingMappings] = await Promise.all([
    getCRMFields(integration.crm_provider, integration.id),
    getWedSyncFields(),
    getFieldMappings(integration.id),
  ]);

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Field Mapping"
        text={`Configure how ${integration.crm_provider} fields map to WedSync fields`}
      >
        <Link href={`/integrations/${params.integrationId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Integration
          </Button>
        </Link>
      </DashboardHeader>

      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<FieldMappingSkeleton />}>
          <FieldMappingInterface
            crmFields={crmFields}
            wedSyncFields={wedSyncFields}
            existingMappings={existingMappings}
            onMappingChange={(mappings) => {
              // Handle mapping changes (this would be a client-side operation)
              console.log('Mapping changed:', mappings);
            }}
            onSave={async (mappings) => {
              'use server';
              // Save mappings to database
              console.log('Saving mappings:', mappings);
            }}
            onCancel={() => {
              // Navigate back or show confirmation
            }}
          />
        </Suspense>
      </div>
    </DashboardShell>
  );
}

// Loading skeleton
function FieldMappingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-muted p-4 rounded">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-40 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
          <div className="h-2 w-full bg-muted-foreground/20 rounded animate-pulse" />
        </div>
      </div>

      {/* Mapping interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CRM Fields */}
        <div className="space-y-2">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Mappings */}
        <div className="space-y-2">
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* WedSync Fields */}
        <div className="space-y-2">
          <div className="h-6 w-36 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="flex gap-3">
          <div className="h-10 w-20 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
