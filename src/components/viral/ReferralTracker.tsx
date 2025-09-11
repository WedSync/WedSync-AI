'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Users,
  TrendingUp,
  DollarSign,
  Network,
  Award,
  Calendar,
  ChevronRight,
} from 'lucide-react';

interface ReferralChain {
  depth: number;
  nodes: Array<{
    id: string;
    name: string;
    email: string;
    joinedAt: string;
    referredBy: string | null;
    referralCount: number;
    revenue: number;
    status: 'active' | 'pending' | 'churned';
  }>;
}

interface AttributionMetrics {
  totalReferredRevenue: number;
  totalReferrals: number;
  averageLifetimeValue: number;
  topReferralSource: {
    name: string;
    count: number;
  };
  viralChains: ReferralChain[];
  monthlyGrowth: number;
}

export function ReferralTracker() {
  const [metrics, setMetrics] = useState<AttributionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<ReferralChain | null>(
    null,
  );

  useEffect(() => {
    loadAttributionData();
  }, []);

  const loadAttributionData = async () => {
    try {
      const response = await fetch('/api/viral/attribution');
      if (!response.ok) throw new Error('Failed to load attribution data');
      const data = await response.json();
      setMetrics(data);
      if (data.viralChains.length > 0) {
        setSelectedChain(data.viralChains[0]);
      }
    } catch (error) {
      console.error('Error loading attribution data:', error);
    } finally {
      setLoading(false);
    }
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
        <p className="text-muted-foreground">No attribution data available</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'churned':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Referral Attribution Tracker
        </h2>
        <p className="text-muted-foreground">
          Track viral growth chains and revenue attribution
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Referred Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.totalReferredRevenue)}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />+{metrics.monthlyGrowth}%
              this month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Referrals
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Avg LTV: {formatCurrency(metrics.averageLifetimeValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top Referral Source
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {metrics.topReferralSource.name}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.topReferralSource.count} referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viral Chains</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.viralChains.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Max depth: {Math.max(...metrics.viralChains.map((c) => c.depth))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Viral Chain Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Viral Chain Visualization</CardTitle>
          <CardDescription>
            Track how referrals spread through your network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Chain Selector */}
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
            {metrics.viralChains.map((chain, index) => (
              <Button
                key={index}
                variant={selectedChain === chain ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChain(chain)}
              >
                Chain {index + 1} (Depth: {chain.depth})
              </Button>
            ))}
          </div>

          {/* Chain Display */}
          {selectedChain && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Chain Depth</span>
                <Badge data-testid="viral-chain-depth">
                  {selectedChain.depth}
                </Badge>
              </div>

              {/* Node Tree */}
              <div className="space-y-2">
                {selectedChain.nodes.map((node, index) => (
                  <div
                    key={node.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border bg-card"
                    style={{ marginLeft: `${index * 20}px` }}
                  >
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{node.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {node.email}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              node.status === 'active' ? 'default' : 'secondary'
                            }
                          >
                            {node.status}
                          </Badge>
                          {node.referralCount > 0 && (
                            <Badge variant="outline">
                              <Users className="mr-1 h-3 w-3" />
                              {node.referralCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(node.joinedAt).toLocaleDateString()}
                        </div>
                        {node.revenue > 0 && (
                          <div className="flex items-center">
                            <DollarSign className="mr-1 h-3 w-3" />
                            {formatCurrency(node.revenue)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attribution Report Link */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Attribution Report</CardTitle>
          <CardDescription>
            View comprehensive analytics and export data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Generated from {metrics.totalReferrals} referrals across{' '}
                {metrics.viralChains.length} chains
              </p>
            </div>
            <Button variant="outline">
              View Full Report
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
