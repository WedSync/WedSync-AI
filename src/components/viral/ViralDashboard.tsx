'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  TrendingUp,
  Users,
  Target,
  Award,
  Activity,
  Share2,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ViralMetrics {
  viralCoefficient: number;
  totalInvitationsSent: number;
  totalInvitationsAccepted: number;
  conversionRate: number;
  superConnectorStatus: {
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    score: number;
    nextTierProgress: number;
  };
  realtimeActivity: {
    lastHourInvites: number;
    lastHourAcceptances: number;
    activeUsers: number;
  };
  topReferrers: Array<{
    id: string;
    name: string;
    referralCount: number;
    conversionRate: number;
  }>;
}

export function ViralDashboard() {
  const [metrics, setMetrics] = useState<ViralMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadMetrics();
    setupRealtimeSubscription();
  }, []);

  const loadMetrics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/viral/analytics');
      if (!response.ok) throw new Error('Failed to load metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading viral metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load viral metrics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel('viral-metrics');

    channel
      .on('broadcast', { event: 'viral-update' }, (payload) => {
        // Update metrics in real-time
        setMetrics((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            viralCoefficient:
              payload.payload.coefficientChange || prev.viralCoefficient,
            realtimeActivity: {
              ...prev.realtimeActivity,
              lastHourInvites: payload.payload.newInvitation
                ? prev.realtimeActivity.lastHourInvites + 1
                : prev.realtimeActivity.lastHourInvites,
              lastHourAcceptances: payload.payload.conversion
                ? prev.realtimeActivity.lastHourAcceptances + 1
                : prev.realtimeActivity.lastHourAcceptances,
            },
          };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No viral metrics available</p>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-purple-500';
      case 'gold':
        return 'bg-yellow-500';
      case 'silver':
        return 'bg-gray-400';
      default:
        return 'bg-orange-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Viral Optimization Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time viral growth metrics and super-connector status
          </p>
        </div>
        <Button onClick={loadMetrics} disabled={refreshing}>
          <Activity className="mr-2 h-4 w-4" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Viral Coefficient
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="viral-coefficient">
              {metrics.viralCoefficient.toFixed(2)}
            </div>
            <div className="flex items-center space-x-2">
              <Progress
                value={(metrics.viralCoefficient / 1.5) * 100}
                className="h-2"
              />
              <span className="text-xs text-muted-foreground">Target: 1.2</span>
            </div>
            {metrics.viralCoefficient >= 1.2 && (
              <Badge className="mt-2 bg-green-500">Target Achieved!</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.conversionRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalInvitationsAccepted} /{' '}
              {metrics.totalInvitationsSent} invitations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Super-Connector Status
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge
                className={getTierColor(metrics.superConnectorStatus.tier)}
              >
                {metrics.superConnectorStatus.tier.charAt(0).toUpperCase() +
                  metrics.superConnectorStatus.tier.slice(1)}{' '}
                Tier
              </Badge>
            </div>
            <div className="mt-2">
              <Progress
                value={metrics.superConnectorStatus.nextTierProgress}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Score: {metrics.superConnectorStatus.score}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Real-time Activity
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.realtimeActivity.activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.realtimeActivity.lastHourInvites} invites sent (last
              hour)
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.realtimeActivity.lastHourAcceptances} accepted (last
              hour)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Super-Connectors</CardTitle>
          <CardDescription>
            Your most successful referrers driving viral growth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.topReferrers.map((referrer) => (
              <div
                key={referrer.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{referrer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {referrer.referralCount} referrals
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {(referrer.conversionRate * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">conversion</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
