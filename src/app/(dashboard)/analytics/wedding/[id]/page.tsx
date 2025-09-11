import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import WeddingMetricsDashboard from '@/components/analytics/wedding/WeddingMetricsDashboard';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

interface WeddingAnalyticsPageProps {
  params: Promise<{ id: string }>;
}

// Loading component for the dashboard
function WeddingAnalyticsLoading() {
  return (
    <div className="space-y-6 p-8">
      <div className="space-y-2">
        <div className="h-8 bg-muted animate-pulse rounded-lg w-1/3" />
        <div className="h-4 bg-muted animate-pulse rounded-lg w-1/2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded-lg w-2/3" />
              <div className="h-8 bg-muted animate-pulse rounded-lg w-1/2" />
              <div className="h-3 bg-muted animate-pulse rounded-lg w-3/4" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-4">
              <div className="h-6 bg-muted animate-pulse rounded-lg w-1/2" />
              <div className="h-64 bg-muted animate-pulse rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Wedding verification component
async function WeddingVerification({ weddingId }: { weddingId: string }) {
  const supabase = await createClient();

  // Verify wedding exists and user has access
  const { data: wedding, error } = await supabase
    .from('wedding_events')
    .select(
      'id, wedding_name, bride_name, groom_name, wedding_date, planning_status',
    )
    .eq('id', weddingId)
    .single();

  if (error || !wedding) {
    notFound();
  }

  const weddingName =
    wedding.wedding_name ||
    `${wedding.bride_name || 'Bride'} & ${wedding.groom_name || 'Groom'}'s Wedding`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto">
        <WeddingMetricsDashboard
          weddingId={weddingId}
          weddingName={weddingName}
          autoRefresh={true}
          refreshInterval={30}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: WeddingAnalyticsPageProps) {
  const { id: weddingId } = await params;
  const supabase = await createClient();

  const { data: wedding } = await supabase
    .from('wedding_events')
    .select('wedding_name, bride_name, groom_name')
    .eq('id', weddingId)
    .single();

  const weddingName =
    wedding?.wedding_name ||
    `${wedding?.bride_name || 'Bride'} & ${wedding?.groom_name || 'Groom'}'s Wedding`;

  return {
    title: `${weddingName} Analytics | WedSync`,
    description:
      'Real-time wedding planning analytics with budget tracking, vendor performance, and milestone progress',
  };
}

export default async function WeddingAnalyticsPage({
  params,
}: WeddingAnalyticsPageProps) {
  const { id: weddingId } = await params;

  return (
    <Suspense fallback={<WeddingAnalyticsLoading />}>
      <WeddingVerification weddingId={weddingId} />
    </Suspense>
  );
}
