'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Users,
  Mail,
  Link2,
  Copy,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Heart,
  Sparkles,
  Gift,
  Target,
  TrendingUp,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ReferralCenterProps,
  SupplierCategory,
  ReferralStatus,
} from '@/types/supplier-referrals';
import ReferralStats from './ReferralStats';
import { toast } from '@/lib/toast-helper';
import { ShimmerButton } from '@/components/magicui/shimmer-button';

// Mock recent activity data
const mockRecentActivity = [
  {
    id: '1',
    referee_email: 'emma@perfectdayplanning.co.uk',
    referee_name: 'Emma Davies - Perfect Day Planning',
    category: 'planning' as SupplierCategory,
    status: 'converted' as ReferralStatus,
    created_at: '2025-01-20T10:30:00Z',
    converted_at: '2025-01-22T14:20:00Z',
    reward_earned: 9900, // £99 in pence
    time_to_convert_days: 2,
  },
  {
    id: '2',
    referee_email: 'james@harmonioussounds.com',
    referee_name: 'James Mitchell - Harmonious Sounds',
    category: 'music' as SupplierCategory,
    status: 'trial_started' as ReferralStatus,
    created_at: '2025-01-21T15:45:00Z',
    trial_started_at: '2025-01-22T09:15:00Z',
    time_to_convert_days: 1,
  },
  {
    id: '3',
    referee_email: 'sophia@elitevenues.london',
    referee_name: 'Sophia Chen - Elite Venues London',
    category: 'venue' as SupplierCategory,
    status: 'signed_up' as ReferralStatus,
    created_at: '2025-01-19T11:20:00Z',
    signed_up_at: '2025-01-21T16:30:00Z',
    time_to_convert_days: 2,
  },
  {
    id: '4',
    referee_email: 'michael@bloomandblossom.co.uk',
    referee_name: 'Michael Thompson - Bloom & Blossom',
    category: 'florist' as SupplierCategory,
    status: 'clicked' as ReferralStatus,
    created_at: '2025-01-20T09:10:00Z',
    clicked_at: '2025-01-22T08:45:00Z',
    time_to_convert_days: 2,
  },
  {
    id: '5',
    referee_email: 'olivia@dreamdayfilms.com',
    referee_name: 'Olivia Wilson - Dream Day Films',
    category: 'videography' as SupplierCategory,
    status: 'sent' as ReferralStatus,
    created_at: '2025-01-22T13:25:00Z',
    time_to_convert_days: 0,
  },
];

/**
 * ReferralCenter Component
 *
 * Main dashboard for supplier referral system. Orchestrates referral creation,
 * statistics display, and recent activity tracking.
 *
 * Features:
 * - Create new referrals with email and category
 * - Generate and share referral links
 * - Display referral statistics pipeline
 * - Show recent referral activity
 * - Quick actions for common tasks
 * - Milestone progress tracking
 * - Professional wedding industry focus
 * - Mobile-responsive design
 * - Accessibility compliant
 */
export const ReferralCenter: React.FC<ReferralCenterProps> = ({
  supplierId,
  currentTier,
  stats,
  onRefresh,
  className,
}) => {
  // Form state for new referrals
  const [newReferralForm, setNewReferralForm] = useState({
    email: '',
    category: '' as SupplierCategory | '',
    personalMessage: '',
  });
  const [isCreatingReferral, setIsCreatingReferral] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [recentActivity] = useState(mockRecentActivity);

  // Category options
  const categoryOptions = [
    { value: 'photography', label: 'Photography', icon: '📸' },
    { value: 'videography', label: 'Videography', icon: '🎥' },
    { value: 'venue', label: 'Venues', icon: '🏰' },
    { value: 'catering', label: 'Catering', icon: '🍽️' },
    { value: 'florist', label: 'Florists', icon: '🌸' },
    { value: 'music', label: 'Music & Entertainment', icon: '🎵' },
    { value: 'planning', label: 'Wedding Planning', icon: '📋' },
    { value: 'transport', label: 'Transport', icon: '🚗' },
    { value: 'stationery', label: 'Stationery', icon: '💌' },
    { value: 'beauty', label: 'Beauty & Hair', icon: '💄' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
    { value: 'other', label: 'Other Services', icon: '✨' },
  ];

  // Status configurations
  const statusConfigs = {
    sent: {
      label: 'Sent',
      color: 'bg-gray-100 text-gray-700',
      icon: Mail,
      description: 'Waiting for them to click',
    },
    clicked: {
      label: 'Clicked',
      color: 'bg-blue-100 text-blue-700',
      icon: ExternalLink,
      description: 'They visited your link!',
    },
    signed_up: {
      label: 'Signed Up',
      color: 'bg-purple-100 text-purple-700',
      icon: UserPlus,
      description: 'Account created',
    },
    trial_started: {
      label: 'Started Trial',
      color: 'bg-amber-100 text-amber-700',
      icon: Clock,
      description: 'Free trial active',
    },
    converted: {
      label: 'Converted',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle2,
      description: 'Became paid subscriber!',
    },
    expired: {
      label: 'Expired',
      color: 'bg-red-100 text-red-700',
      icon: AlertCircle,
      description: 'Referral link expired',
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-100 text-red-700',
      icon: AlertCircle,
      description: 'Referral was invalid',
    },
  };

  // Handle form submission
  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newReferralForm.email || !newReferralForm.category) {
      toast.error('Please fill in email and category');
      return;
    }

    setIsCreatingReferral(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In real app, call actual API
      const referralCode = `REF-${Date.now().toString().slice(-6)}`;
      const referralUrl = `https://wedsync.com/join?ref=${referralCode}`;

      toast.success(`Referral sent to ${newReferralForm.email}!`);

      // Reset form
      setNewReferralForm({
        email: '',
        category: '' as SupplierCategory | '',
        personalMessage: '',
      });
      setShowCreateForm(false);

      // Refresh stats
      await onRefresh();
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error('Failed to create referral');
    } finally {
      setIsCreatingReferral(false);
    }
  };

  // Copy referral link to clipboard
  const copyReferralLink = async () => {
    const referralUrl = `https://wedsync.com/join?ref=${supplierId}`;
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success('Referral link copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Referral Center
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Grow the wedding community by referring other amazing suppliers. Earn
          rewards while building professional relationships that last.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Refer a Supplier</h3>
              <p className="text-sm text-gray-600">
                Send them your referral link
              </p>
            </div>
          </div>
          <ShimmerButton
            onClick={() => setShowCreateForm(true)}
            className="w-full mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Referral
          </ShimmerButton>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Link2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Share Your Link</h3>
              <p className="text-sm text-gray-600">Copy your referral URL</p>
            </div>
          </div>
          <Button
            onClick={copyReferralLink}
            variant="outline"
            className="w-full mt-4"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Gift className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Your Rewards</h3>
              <p className="text-sm text-gray-600">
                {formatCurrency(stats.total_rewards_earned)} earned
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4" disabled>
            <Award className="h-4 w-4 mr-2" />
            View Rewards
          </Button>
        </Card>
      </div>

      {/* Create Referral Form */}
      {showCreateForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Refer a Wedding Supplier
            </h3>
            <Button
              variant="ghost"
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500"
            >
              ✕
            </Button>
          </div>

          <form onSubmit={handleCreateReferral} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div>
                <Label htmlFor="referee-email" className="block mb-2">
                  Supplier Email Address *
                </Label>
                <Input
                  id="referee-email"
                  type="email"
                  value={newReferralForm.email}
                  onChange={(e) =>
                    setNewReferralForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="supplier@example.com"
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll send them an invitation to join WedSync
                </p>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="referee-category" className="block mb-2">
                  Their Service Category *
                </Label>
                <select
                  id="referee-category"
                  value={newReferralForm.category}
                  onChange={(e) =>
                    setNewReferralForm((prev) => ({
                      ...prev,
                      category: e.target.value as SupplierCategory,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select category...</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Personal Message */}
            <div>
              <Label htmlFor="personal-message" className="block mb-2">
                Personal Message (Optional)
              </Label>
              <Textarea
                id="personal-message"
                value={newReferralForm.personalMessage}
                onChange={(e) =>
                  setNewReferralForm((prev) => ({
                    ...prev,
                    personalMessage: e.target.value,
                  }))
                }
                placeholder="Hi [Name], I'd love to recommend WedSync - it's been amazing for managing my wedding clients..."
                rows={4}
                maxLength={500}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                {newReferralForm.personalMessage.length}/500 characters
              </p>
            </div>

            {/* Submit */}
            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={isCreatingReferral}
                className="flex-1"
              >
                {isCreatingReferral ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Referral...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Referral
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                disabled={isCreatingReferral}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Statistics Display */}
      <ReferralStats
        stats={stats}
        onRefresh={onRefresh}
        rankingData={{
          category_rank: 3,
          overall_rank: 12,
          total_in_category: 45,
          total_overall: 156,
        }}
      />

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Recent Referral Activity
          </h3>
          <Badge variant="secondary" className="text-xs">
            Live Updates
          </Badge>
        </div>

        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">
                No Referrals Yet
              </h4>
              <p className="text-gray-600 mb-6">
                Start referring other wedding suppliers to see your activity
                here
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Send Your First Referral
              </Button>
            </div>
          ) : (
            recentActivity.map((activity) => {
              const statusConfig = statusConfigs[activity.status];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        statusConfig.color,
                      )}
                    >
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">
                        {activity.referee_name || activity.referee_email}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {statusConfig.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs mb-1', statusConfig.color)}
                    >
                      {statusConfig.label}
                    </Badge>
                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(activity.created_at)}
                    </p>
                    {activity.reward_earned && (
                      <p className="text-xs font-medium text-green-600">
                        {formatCurrency(activity.reward_earned)} earned
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {recentActivity.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="sm">
              View All Activity
            </Button>
          </div>
        )}
      </Card>

      {/* Milestone Progress */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Next Milestone
          </h3>
          <Sparkles className="h-6 w-6 text-purple-600" />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-purple-800">
              Refer 5 more suppliers to earn 2 free months
            </span>
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-800"
            >
              {stats.total_conversions}/10
            </Badge>
          </div>

          <div className="w-full bg-purple-200 rounded-full h-3">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(stats.total_conversions / 10) * 100}%` }}
            ></div>
          </div>

          <p className="text-xs text-purple-700">
            You're doing amazing! Keep building those professional
            relationships. 💜
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ReferralCenter;
