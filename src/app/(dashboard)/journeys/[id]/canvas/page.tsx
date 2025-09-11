import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/server';
import { JourneyCanvas } from '@/components/journey/JourneyCanvas';
import LoadingSpinner from '@/components/ui/loading-spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Play, Pause, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface JourneyCanvasPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getJourney(id: string) {
  const supabase = await createClient();

  const { data: journey, error } = await supabase
    .from('journeys')
    .select(
      `
      *,
      organization:organizations(*)
    `,
    )
    .eq('id', id)
    .single();

  if (error || !journey) {
    return null;
  }

  return journey;
}

async function getJourneyStats(id: string) {
  const supabase = await createClient();

  const { data: executions } = await supabase
    .from('journey_executions')
    .select('status')
    .eq('journey_id', id);

  const stats = {
    total: executions?.length || 0,
    active: executions?.filter((e) => e.status === 'active').length || 0,
    completed: executions?.filter((e) => e.status === 'completed').length || 0,
    paused: executions?.filter((e) => e.status === 'paused').length || 0,
    failed: executions?.filter((e) => e.status === 'failed').length || 0,
  };

  return stats;
}

function JourneyCanvasHeader({ journey, stats }: { journey: any; stats: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'draft':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'archived':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTierLevel = (organization: any): 'basic' | 'pro' | 'enterprise' => {
    // TODO: Get actual tier from organization data
    return 'pro'; // Default for now
  };

  return (
    <div className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/journeys/${journey.id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Journey
          </Link>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {journey.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Visual Journey Canvas
            </p>
          </div>
          <div
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(
              journey.status,
            )}`}
          >
            {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Journey Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Active: {stats.active}</span>
            <span>Completed: {stats.completed}</span>
            <span>Total: {stats.total}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link href={`/journeys/${journey.id}/analytics`}>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>

            <Link href={`/journeys/${journey.id}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>

            {journey.status === 'active' ? (
              <Button variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button size="sm">
                <Play className="h-4 w-4 mr-2" />
                Activate
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner className="h-8 w-8 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          Loading journey canvas...
        </p>
      </div>
    </div>
  );
}

function CanvasErrorFallback({ error }: { error: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-destructive">
            Canvas Error
          </CardTitle>
          <CardDescription className="text-center">
            Failed to load the journey canvas
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link href="/journeys">
            <Button>Return to Journeys</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function JourneyCanvasPage({
  params,
}: JourneyCanvasPageProps) {
  const { id } = await params;
  const user = await getUser();

  if (!user) {
    notFound();
  }

  const [journey, stats] = await Promise.all([
    getJourney(id),
    getJourneyStats(id),
  ]);

  if (!journey) {
    notFound();
  }

  // Get tier level from organization
  const getTierLevel = (): 'basic' | 'pro' | 'enterprise' => {
    // TODO: Implement actual tier detection from organization data
    return 'pro'; // Default for now
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <JourneyCanvasHeader journey={journey} stats={stats} />

      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<CanvasLoadingFallback />}>
          <JourneyCanvas
            canvasId={journey.id}
            readOnly={journey.status === 'archived'}
            enableGrid={true}
            enableSnapToGrid={true}
            tierLevel={getTierLevel()}
            className="h-full"
          />
        </Suspense>
      </div>
    </div>
  );
}

// Metadata for the page
export async function generateMetadata({ params }: JourneyCanvasPageProps) {
  const { id } = await params;
  const journey = await getJourney(id);

  if (!journey) {
    return {
      title: 'Journey Not Found | WedSync',
    };
  }

  return {
    title: `${journey.name} - Canvas | WedSync`,
    description: `Visual canvas for editing the ${journey.name} journey workflow`,
  };
}
