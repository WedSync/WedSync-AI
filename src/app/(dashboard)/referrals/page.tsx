'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Trophy,
  QrCode,
  BarChart3,
  Sparkles,
  Target,
  TrendingUp,
  Award,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SupplierReferralStats,
  LeaderboardFilters,
  TimePeriod,
  SupplierCategory,
  SupplierLocation,
} from '@/types/supplier-referrals';
import ReferralCenter from '@/components/referrals/ReferralCenter';
import ReferralStats from '@/components/referrals/ReferralStats';
import LeaderboardView from '@/components/referrals/LeaderboardView';
import QRCodeGenerator from '@/components/referrals/QRCodeGenerator';
import { toast } from '@/lib/toast-helper';

// Mock user data (in real app, get from auth context/API)
const mockCurrentSupplier = {
  id: 'supplier-123',
  name: 'Sarah Photography',
  category: 'photography' as SupplierCategory,
  location: {
    city: 'London',
    region: 'Greater London',
    country: 'UK',
  } as SupplierLocation,
  tier: 'PROFESSIONAL',
};

// Mock stats data (in real app, fetch from API)
const mockStats: SupplierReferralStats = {
  supplier_id: 'supplier-123',
  total_referrals_sent: 47,
  total_clicks: 32,
  total_signups: 28,
  total_trials_started: 25,
  total_conversions: 23,
  total_rewards_earned: 180000, // £1,800 in pence
  click_through_rate: 68.1,
  conversion_rate: 71.9,
  signup_rate: 87.5,
  trial_to_paid_rate: 92.0,
  avg_time_to_conversion_days: 3.2,
  last_referral_sent_at: '2025-01-22T10:30:00Z',
  current_month_stats: {
    month: '2025-01',
    referrals_sent: 12,
    conversions: 8,
    rewards_earned: 79200, // £792
    rank_in_category: 3,
    rank_overall: 12,
  },
  lifetime_stats: {
    total_referrals_sent: 47,
    total_conversions: 23,
    total_rewards_earned: 180000,
    best_month_conversions: 15,
    best_month_rewards: 148500, // £1,485
    current_streak_days: 12,
    longest_streak_days: 28,
  },
};

/**
 * Supplier Referrals Page
 *
 * Main page for the WS-344 Supplier Referral Gamification System.
 * Orchestrates all referral components in a tabbed interface.
 *
 * Features:
 * - Tabbed navigation between different views
 * - Real-time statistics and leaderboards
 * - QR code generation for offline sharing
 * - Mobile-responsive design
 * - Professional wedding industry focus
 * - B2B gamification approach
 */
export default function SupplierReferralsPage() {
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<SupplierReferralStats>(mockStats);
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboardFilters, setLeaderboardFilters] =
    useState<LeaderboardFilters>({
      time_period: 'this_month' as TimePeriod,
    });

  // Refresh statistics
  const refreshStats = async () => {
    try {
      setIsLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In real app: const response = await fetch('/api/supplier-referrals/stats')
      // const data = await response.json()
      // setStats(data.stats)

      toast.success('Statistics refreshed!');
    } catch (error) {
      console.error('Error refreshing stats:', error);
      toast.error('Failed to refresh statistics');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate referral link
  const generateReferralLink = async () => {
    try {
      // In real app: call API to generate unique referral code
      const referralCode = `${mockCurrentSupplier.id}-${Date.now().toString().slice(-6)}`;
      const referralUrl = `https://wedsync.com/join?ref=${referralCode}`;

      return referralUrl;
    } catch (error) {
      console.error('Error generating referral link:', error);
      throw error;
    }
  };

  // Handle QR code generation
  const handleGenerateQR = async (config: any) => {
    try {
      // In real app: call API to generate and store QR code
      console.log('Generating QR code with config:', config);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success('QR code generated successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  // Handle QR code download
  const handleDownloadQR = async (qrCodeId: string) => {
    try {
      // In real app: track download and provide download URL
      console.log('Downloading QR code:', qrCodeId);

      toast.success('QR code download started!');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      throw error;
    }
  };

  // Load initial data
  useEffect(() => {
    // In real app: fetch initial stats, user info, etc.
    console.log('Loading supplier referrals page for:', mockCurrentSupplier.id);
  }, []);

  // Tab configurations
  const tabs = [
    {
      value: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Main referral center',
    },
    {
      value: 'leaderboards',
      label: 'Leaderboards',
      icon: Trophy,
      description: 'Supplier rankings',
    },
    {
      value: 'qr-codes',
      label: 'QR Codes',
      icon: QrCode,
      description: 'Generate QR codes',
    },
    {
      value: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      description: 'Detailed statistics',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
          <Users className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Supplier Referral Network
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Build professional relationships, refer amazing wedding suppliers, and
          earn rewards while growing the community together.
        </p>
      </div>

      {/* Key Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center hover:shadow-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mx-auto mb-3">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-600">Total Referrals</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.total_referrals_sent}
          </p>
          <p className="text-xs text-green-600 mt-1">
            +{stats.current_month_stats.referrals_sent} this month
          </p>
        </Card>

        <Card className="p-4 text-center hover:shadow-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mx-auto mb-3">
            <Target className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-600">Conversions</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.total_conversions}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {stats.conversion_rate.toFixed(1)}% success rate
          </p>
        </Card>

        <Card className="p-4 text-center hover:shadow-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mx-auto mb-3">
            <Award className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm font-medium text-gray-600">Rewards Earned</p>
          <p className="text-2xl font-bold text-gray-900">
            £{(stats.total_rewards_earned / 100).toLocaleString()}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            #{stats.current_month_stats.rank_overall} overall rank
          </p>
        </Card>

        <Card className="p-4 text-center hover:shadow-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full mx-auto mb-3">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-gray-600">Active Streak</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.lifetime_stats.current_streak_days}
          </p>
          <p className="text-xs text-amber-600 mt-1">days of activity</p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-4 sm:w-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 data-[state=active]:bg-primary-600"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <Button
            onClick={refreshStats}
            variant="outline"
            disabled={isLoading}
            className="ml-auto"
          >
            <RefreshCcw
              className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')}
            />
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <ReferralCenter
            supplierId={mockCurrentSupplier.id}
            currentTier={mockCurrentSupplier.tier}
            stats={stats}
            onRefresh={refreshStats}
          />
        </TabsContent>

        {/* Leaderboards Tab */}
        <TabsContent value="leaderboards" className="space-y-6">
          <LeaderboardView
            currentSupplier={{
              id: mockCurrentSupplier.id,
              category: mockCurrentSupplier.category,
              location: mockCurrentSupplier.location,
            }}
            filters={leaderboardFilters}
            onFiltersChange={setLeaderboardFilters}
          />
        </TabsContent>

        {/* QR Codes Tab */}
        <TabsContent value="qr-codes" className="space-y-6">
          <QRCodeGenerator
            referralCode={mockCurrentSupplier.id}
            referralUrl={`https://wedsync.com/join?ref=${mockCurrentSupplier.id}`}
            onGenerate={handleGenerateQR}
            onDownload={handleDownloadQR}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <ReferralStats
            stats={stats}
            onRefresh={refreshStats}
            rankingData={{
              category_rank: stats.current_month_stats.rank_in_category || 0,
              overall_rank: stats.current_month_stats.rank_overall || 0,
              total_in_category: 45, // Mock data
              total_overall: 156, // Mock data
            }}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Footer CTA */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-center">
        <div className="max-w-2xl mx-auto">
          <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            Ready to Grow Your Network?
          </h3>
          <p className="text-purple-800 text-sm mb-4">
            Start referring other amazing wedding suppliers today. Build
            professional relationships, earn rewards, and help couples find the
            perfect vendors for their special day.
          </p>
          <Button
            onClick={() => setActiveTab('dashboard')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Start Referring Now
          </Button>
        </div>
      </Card>
    </div>
  );
}
