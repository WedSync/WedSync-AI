'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Camera,
  Utensils,
  MapPin,
  Flower,
  Music,
  Users,
  Clock,
  Mail,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  email: string;
  category: 'photography' | 'catering' | 'venue' | 'floral' | 'music' | 'other';
  healthScore: number;
  previousScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActivity: string;
  clientCount: number;
  averageRating: number;
  responseTime: number; // in hours
  completedWeddings: number;
  joinedDate: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'suspended';
  trends: {
    engagement: 'up' | 'down' | 'stable';
    satisfaction: 'up' | 'down' | 'stable';
    bookings: 'up' | 'down' | 'stable';
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface SupplierHealthMonitorProps {
  suppliers: Supplier[];
  loading?: boolean;
}

/**
 * Supplier Health Monitor Component
 *
 * Displays real-time supplier health monitoring:
 * - Individual supplier health scores
 * - Category-based filtering and sorting
 * - Risk level indicators
 * - Trend analysis
 * - Quick action buttons
 */
export default function SupplierHealthMonitor({
  suppliers,
  loading,
}: SupplierHealthMonitorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('healthScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Filter and sort suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    if (!suppliers) return [];

    let filtered = suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || supplier.category === selectedCategory;
      const matchesRisk =
        selectedRiskLevel === 'all' || supplier.riskLevel === selectedRiskLevel;

      return matchesSearch && matchesCategory && matchesRisk;
    });

    // Sort suppliers
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'healthScore':
          aValue = a.healthScore;
          bValue = b.healthScore;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'lastActivity':
          aValue = new Date(a.lastActivity).getTime();
          bValue = new Date(b.lastActivity).getTime();
          break;
        case 'clientCount':
          aValue = a.clientCount;
          bValue = b.clientCount;
          break;
        case 'responseTime':
          aValue = a.responseTime;
          bValue = b.responseTime;
          break;
        default:
          aValue = a.healthScore;
          bValue = b.healthScore;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [
    suppliers,
    searchTerm,
    selectedCategory,
    selectedRiskLevel,
    sortBy,
    sortOrder,
  ]);

  if (loading) {
    return <SupplierHealthMonitorSkeleton />;
  }

  if (!suppliers || suppliers.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No suppliers found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Supplier Health Monitor
              <Badge variant="secondary">
                {filteredAndSortedSuppliers.length} suppliers
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="photography">Photography</SelectItem>
                <SelectItem value="catering">Catering</SelectItem>
                <SelectItem value="venue">Venue</SelectItem>
                <SelectItem value="floral">Floral</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Risk Level Filter */}
            <Select
              value={selectedRiskLevel}
              onValueChange={setSelectedRiskLevel}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Risk Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="critical">Critical Risk</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="healthScore-desc">
                  Health Score (High to Low)
                </SelectItem>
                <SelectItem value="healthScore-asc">
                  Health Score (Low to High)
                </SelectItem>
                <SelectItem value="name-asc">Name (A to Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z to A)</SelectItem>
                <SelectItem value="lastActivity-desc">
                  Last Activity (Recent)
                </SelectItem>
                <SelectItem value="lastActivity-asc">
                  Last Activity (Oldest)
                </SelectItem>
                <SelectItem value="clientCount-desc">Most Clients</SelectItem>
                <SelectItem value="responseTime-asc">
                  Fastest Response
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Display */}
      {viewMode === 'list' ? (
        <SuppliersList suppliers={filteredAndSortedSuppliers} />
      ) : (
        <SuppliersGrid suppliers={filteredAndSortedSuppliers} />
      )}
    </div>
  );
}

function SuppliersList({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {suppliers.map((supplier) => (
            <SupplierListItem key={supplier.id} supplier={supplier} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SuppliersGrid({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {suppliers.map((supplier) => (
        <SupplierGridItem key={supplier.id} supplier={supplier} />
      ))}
    </div>
  );
}

function SupplierListItem({ supplier }: { supplier: Supplier }) {
  const CategoryIcon = getCategoryIcon(supplier.category);
  const change = supplier.healthScore - supplier.previousScore;
  const TrendIcon =
    change > 0 ? TrendingUp : change < 0 ? TrendingDown : undefined;

  return (
    <div className="p-6 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={supplier.avatar} alt={supplier.name} />
            <AvatarFallback>
              {supplier.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{supplier.name}</h4>
              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
              <Badge variant={getStatusVariant(supplier.status)}>
                {supplier.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {supplier.email}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatLastActivity(supplier.lastActivity)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Health Score */}
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold">
                {supplier.healthScore}%
              </span>
              {TrendIcon && (
                <TrendIcon
                  className={cn(
                    'h-4 w-4',
                    change > 0 ? 'text-green-600' : 'text-red-600',
                  )}
                />
              )}
            </div>
            <Progress value={supplier.healthScore} className="w-24 h-2" />
            <Badge
              variant={getRiskVariant(supplier.riskLevel)}
              className="text-xs mt-1"
            >
              {supplier.riskLevel} risk
            </Badge>
          </div>

          {/* Stats */}
          <div className="text-right space-y-1">
            <div className="text-sm">
              <span className="font-medium">{supplier.clientCount}</span>{' '}
              clients
            </div>
            <div className="text-sm">
              <span className="font-medium">{supplier.completedWeddings}</span>{' '}
              weddings
            </div>
            <div className="text-xs text-muted-foreground">
              {supplier.responseTime}h avg response
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              View Details
            </Button>
            {supplier.riskLevel === 'critical' ||
            supplier.riskLevel === 'high' ? (
              <Button variant="destructive" size="sm">
                Create Intervention
              </Button>
            ) : (
              <Button variant="ghost" size="sm">
                <Mail className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SupplierGridItem({ supplier }: { supplier: Supplier }) {
  const CategoryIcon = getCategoryIcon(supplier.category);
  const change = supplier.healthScore - supplier.previousScore;
  const TrendIcon =
    change > 0 ? TrendingUp : change < 0 ? TrendingDown : undefined;

  return (
    <Card
      className={cn(
        'hover:shadow-lg transition-shadow',
        supplier.riskLevel === 'critical' && 'border-red-200',
        supplier.riskLevel === 'high' && 'border-orange-200',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={supplier.avatar} alt={supplier.name} />
              <AvatarFallback>
                {supplier.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium truncate">{supplier.name}</h4>
              <div className="flex items-center gap-2">
                <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">
                  {supplier.category}
                </span>
              </div>
            </div>
          </div>

          <Badge variant={getRiskVariant(supplier.riskLevel)}>
            {supplier.riskLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl font-bold">{supplier.healthScore}%</span>
            {TrendIcon && (
              <TrendIcon
                className={cn(
                  'h-5 w-5',
                  change > 0 ? 'text-green-600' : 'text-red-600',
                )}
              />
            )}
          </div>
          <Progress value={supplier.healthScore} className="mb-2" />
          {change !== 0 && (
            <div
              className={cn(
                'text-xs font-medium',
                change > 0 ? 'text-green-600' : 'text-red-600',
              )}
            >
              {change > 0 ? '+' : ''}
              {change}% from last week
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold">{supplier.clientCount}</div>
            <div className="text-xs text-muted-foreground">Active Clients</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {supplier.averageRating.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Rating</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {supplier.completedWeddings}
            </div>
            <div className="text-xs text-muted-foreground">Weddings</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {supplier.responseTime}h
            </div>
            <div className="text-xs text-muted-foreground">Response</div>
          </div>
        </div>

        {/* Last Activity */}
        <div className="text-xs text-muted-foreground text-center">
          Last active: {formatLastActivity(supplier.lastActivity)}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Profile
          </Button>
          {(supplier.riskLevel === 'critical' ||
            supplier.riskLevel === 'high') && (
            <Button variant="destructive" size="sm" className="flex-1">
              Intervene
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SupplierHealthMonitorSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-muted rounded animate-pulse flex-1"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                  <div className="h-16 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'photography':
      return Camera;
    case 'catering':
      return Utensils;
    case 'venue':
      return MapPin;
    case 'floral':
      return Flower;
    case 'music':
      return Music;
    default:
      return Users;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    case 'suspended':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getRiskVariant(riskLevel: string) {
  switch (riskLevel) {
    case 'low':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'high':
      return 'destructive';
    case 'critical':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatLastActivity(timestamp: string): string {
  const now = new Date();
  const activity = new Date(timestamp);
  const diffInHours = Math.floor(
    (now.getTime() - activity.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 48) return 'Yesterday';

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return activity.toLocaleDateString();
}
