'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Award,
  ExternalLink,
} from 'lucide-react';

interface TopCreator {
  id: string;
  title: string;
  revenue: number;
  sales: number;
  creator: string;
}

interface CreatorEarning {
  id: string;
  name: string;
  businessName: string;
  email: string;
  avatarUrl?: string;
  vendorType: string;
  joinedDate: string;
  totalEarnings: number;
  monthlyEarnings: number;
  totalSales: number;
  monthlyGrowth: number;
  commissionTier: string;
  commissionRate: number;
  topTemplate: string;
  templateCount: number;
  averageRating: number;
  lastPayoutDate: string;
  nextPayoutAmount: number;
  status: 'active' | 'pending_payout' | 'suspended';
}

interface Props {
  topCreators: TopCreator[];
  totalEarnings: number;
}

export function CreatorEarningsTable({ topCreators, totalEarnings }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('earnings');
  const [filterBy, setFilterBy] = useState('all');
  const [timeframe, setTimeframe] = useState('current_month');

  // Mock detailed creator data
  const [creatorsData] = useState<CreatorEarning[]>([
    {
      id: '1',
      name: 'Sarah Mitchell',
      businessName: 'Sarah Photography',
      email: 'sarah@sarahphotography.com',
      avatarUrl: '/api/placeholder/32/32',
      vendorType: 'Photography',
      joinedDate: '2024-03-15',
      totalEarnings: 156700,
      monthlyEarnings: 18450,
      totalSales: 127,
      monthlyGrowth: 12.5,
      commissionTier: 'Volume Tier 2',
      commissionRate: 0.25,
      topTemplate: 'Client Onboarding Email Sequence',
      templateCount: 8,
      averageRating: 4.8,
      lastPayoutDate: '2024-12-01',
      nextPayoutAmount: 18450,
      status: 'active',
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      businessName: 'Elite Venues',
      email: 'marcus@elitevenues.co.uk',
      vendorType: 'Venue',
      joinedDate: '2024-05-20',
      totalEarnings: 124500,
      monthlyEarnings: 15200,
      totalSales: 98,
      monthlyGrowth: 8.3,
      commissionTier: 'Volume Tier 1',
      commissionRate: 0.28,
      topTemplate: 'Vendor Coordination Checklist',
      templateCount: 5,
      averageRating: 4.7,
      lastPayoutDate: '2024-12-01',
      nextPayoutAmount: 15200,
      status: 'active',
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      businessName: 'Perfect Day Coordination',
      email: 'emma@perfectday.com',
      vendorType: 'Planning',
      joinedDate: '2024-08-10',
      totalEarnings: 87600,
      monthlyEarnings: 12800,
      totalSales: 76,
      monthlyGrowth: -2.1,
      commissionTier: 'Standard',
      commissionRate: 0.3,
      topTemplate: 'Wedding Day Timeline Builder',
      templateCount: 12,
      averageRating: 4.9,
      lastPayoutDate: '2024-11-01',
      nextPayoutAmount: 12800,
      status: 'pending_payout',
    },
    {
      id: '4',
      name: 'James Chen',
      businessName: 'Wedding Pro Solutions',
      email: 'james@weddingpro.com',
      vendorType: 'Technology',
      joinedDate: '2023-11-30',
      totalEarnings: 248900,
      monthlyEarnings: 24100,
      totalSales: 156,
      monthlyGrowth: 15.7,
      commissionTier: 'Volume Tier 3',
      commissionRate: 0.2,
      topTemplate: 'Budget Tracker Bundle',
      templateCount: 15,
      averageRating: 4.6,
      lastPayoutDate: '2024-12-01',
      nextPayoutAmount: 24100,
      status: 'active',
    },
    {
      id: '5',
      name: 'Lisa Thompson',
      businessName: 'Digital Wedding Tools',
      email: 'lisa@digitalwedding.tools',
      vendorType: 'Technology',
      joinedDate: '2024-06-12',
      totalEarnings: 112000,
      monthlyEarnings: 14500,
      totalSales: 65,
      monthlyGrowth: 6.8,
      commissionTier: 'Volume Tier 1',
      commissionRate: 0.28,
      topTemplate: 'RSVP Management System',
      templateCount: 7,
      averageRating: 4.5,
      lastPayoutDate: '2024-12-01',
      nextPayoutAmount: 14500,
      status: 'active',
    },
  ]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getTierBadgeColor = (tier: string): string => {
    switch (tier) {
      case 'Volume Tier 3':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Volume Tier 2':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Volume Tier 1':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_payout':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAndSortedCreators = creatorsData
    .filter((creator) => {
      if (filterBy === 'all') return true;
      if (filterBy === 'high_earners') return creator.totalEarnings > 100000;
      if (filterBy === 'pending_payout')
        return creator.status === 'pending_payout';
      if (filterBy === 'growth') return creator.monthlyGrowth > 0;
      return true;
    })
    .filter(
      (creator) =>
        creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.vendorType.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'earnings':
          return b.totalEarnings - a.totalEarnings;
        case 'growth':
          return b.monthlyGrowth - a.monthlyGrowth;
        case 'sales':
          return b.totalSales - a.totalSales;
        case 'rating':
          return b.averageRating - a.averageRating;
        case 'joined':
          return (
            new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime()
          );
        default:
          return 0;
      }
    });

  const handleExportData = () => {
    console.log('Exporting creator earnings data...');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Creator Earnings Portal
              </CardTitle>
              <CardDescription>
                Individual creator dashboards, earnings, and payout information
              </CardDescription>
            </div>
            <Button onClick={handleExportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earnings">Total Earnings</SelectItem>
                <SelectItem value="growth">Monthly Growth</SelectItem>
                <SelectItem value="sales">Total Sales</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="joined">Join Date</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                <SelectItem value="high_earners">High Earners</SelectItem>
                <SelectItem value="pending_payout">Pending Payout</SelectItem>
                <SelectItem value="growth">Growing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-blue-600">Total Paid</div>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(
                  filteredAndSortedCreators.reduce(
                    (sum, c) => sum + c.totalEarnings,
                    0,
                  ),
                )}
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div className="text-sm text-green-600">Avg Growth</div>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {(
                  filteredAndSortedCreators.reduce(
                    (sum, c) => sum + c.monthlyGrowth,
                    0,
                  ) / filteredAndSortedCreators.length
                ).toFixed(1)}
                %
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-600" />
                <div className="text-sm text-purple-600">Avg Rating</div>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(
                  filteredAndSortedCreators.reduce(
                    (sum, c) => sum + c.averageRating,
                    0,
                  ) / filteredAndSortedCreators.length
                ).toFixed(1)}
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <div className="text-sm text-orange-600">Pending Payouts</div>
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {
                  filteredAndSortedCreators.filter(
                    (c) => c.status === 'pending_payout',
                  ).length
                }
              </div>
            </div>
          </div>

          {/* Creator Table */}
          <div className="space-y-4">
            {filteredAndSortedCreators.map((creator) => (
              <div
                key={creator.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="grid grid-cols-1 lg:grid-cols-8 gap-4 items-center">
                  {/* Creator Info */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={creator.avatarUrl} />
                        <AvatarFallback>
                          {getInitials(creator.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{creator.name}</div>
                        <div className="text-sm text-gray-600">
                          {creator.businessName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {creator.vendorType}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="text-center">
                    <div className="font-bold text-lg">
                      {formatCurrency(creator.totalEarnings)}
                    </div>
                    <div className="text-sm text-gray-500">Total</div>
                    <div className="text-xs text-gray-400">
                      {formatCurrency(creator.monthlyEarnings)} this month
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {creator.monthlyGrowth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span
                        className={`font-semibold ${creator.monthlyGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatPercentage(creator.monthlyGrowth)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {creator.totalSales} sales
                    </div>
                  </div>

                  {/* Commission Info */}
                  <div className="text-center">
                    <Badge
                      className={getTierBadgeColor(creator.commissionTier)}
                    >
                      {creator.commissionTier}
                    </Badge>
                    <div className="text-sm text-gray-500 mt-1">
                      {(creator.commissionRate * 100).toFixed(1)}% rate
                    </div>
                  </div>

                  {/* Templates */}
                  <div className="text-center">
                    <div className="font-semibold">{creator.templateCount}</div>
                    <div className="text-sm text-gray-500">Templates</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Award className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs">
                        {creator.averageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Next Payout */}
                  <div className="text-center">
                    <div className="font-semibold">
                      {formatCurrency(creator.nextPayoutAmount)}
                    </div>
                    <div className="text-sm text-gray-500">Next Payout</div>
                    <div className="text-xs text-gray-400">
                      {formatDate(creator.lastPayoutDate)}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex flex-col items-center gap-2">
                    <Badge className={getStatusBadgeColor(creator.status)}>
                      {creator.status.replace('_', ' ')}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Top Template */}
                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                  <span className="font-medium">Top Template:</span>{' '}
                  {creator.topTemplate}
                </div>
              </div>
            ))}
          </div>

          {filteredAndSortedCreators.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">
                No creators match your search criteria
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
