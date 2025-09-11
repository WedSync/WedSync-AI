'use client';

/**
 * WS-254: Dietary Management Dashboard Component
 * Comprehensive dashboard for managing guest dietary requirements
 * Features: Real-time monitoring, risk assessment, compliance tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Users,
  ShieldAlert,
  ChefHat,
  Plus,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  Eye,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';

// TypeScript interfaces
interface DietaryRequirement {
  id: string;
  guest_name: string;
  wedding_id: string;
  category: 'allergy' | 'diet' | 'medical' | 'preference';
  severity: 1 | 2 | 3 | 4 | 5;
  notes: string;
  verified: boolean;
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
}

interface DietarySummary {
  wedding_id: string;
  wedding_name: string;
  total_guests: number;
  requirements: DietaryRequirement[];
  summary_stats: {
    total_requirements: number;
    by_category: {
      allergy: number;
      diet: number;
      medical: number;
      preference: number;
    };
    by_severity: {
      level_1: number;
      level_2: number;
      level_3: number;
      level_4: number;
      level_5: number;
    };
    high_severity_count: number;
    unverified_count: number;
    guests_with_requirements: number;
    most_common_requirements: Array<{
      requirement: string;
      count: number;
      category: string;
    }>;
  };
  compliance_insights: {
    risk_assessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    risk_factors: string[];
    recommendations: string[];
  };
}

interface DietaryDashboardProps {
  weddingId: string;
  supplierId: string;
  onRequirementAdd?: (requirement: DietaryRequirement) => void;
  onMenuGenerate?: () => void;
  className?: string;
}

export function DietaryManagementDashboard({
  weddingId,
  supplierId,
  onRequirementAdd,
  onMenuGenerate,
  className = '',
}: DietaryDashboardProps) {
  const [summary, setSummary] = useState<DietarySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { navigateTo } = useNavigation();

  // Severity level configurations
  const severityConfig = {
    1: {
      label: 'Mild',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '●',
    },
    2: {
      label: 'Low',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '●●',
    },
    3: {
      label: 'Moderate',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '●●●',
    },
    4: {
      label: 'High',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '●●●●',
    },
    5: {
      label: 'Critical',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '●●●●●',
    },
  };

  const categoryIcons = {
    allergy: ShieldAlert,
    diet: Users,
    medical: Activity,
    preference: Eye,
  };

  const categoryColors = {
    allergy: 'bg-red-50 border-red-200 text-red-700',
    diet: 'bg-green-50 border-green-200 text-green-700',
    medical: 'bg-blue-50 border-blue-200 text-blue-700',
    preference: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  // Fetch dietary summary data
  const fetchSummary = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/catering/dietary/summary/${weddingId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch dietary summary');
      }

      setSummary(data.data);
    } catch (err) {
      console.error('Failed to fetch dietary summary:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch dietary data',
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSummary(false);
    setRefreshing(false);
  };

  // Filter requirements based on current filters
  const filteredRequirements =
    summary?.requirements.filter((req) => {
      const matchesCategory =
        filterCategory === 'all' || req.category === filterCategory;
      const matchesSearch =
        searchQuery === '' ||
        req.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity =
        selectedSeverity === 'all' ||
        req.severity.toString() === selectedSeverity;

      return matchesCategory && matchesSearch && matchesSeverity;
    }) || [];

  // Load data on mount
  useEffect(() => {
    fetchSummary();
  }, [weddingId]);

  // Handle requirement deletion
  const handleDeleteRequirement = async (
    id: string,
    guestName: string,
    severity: number,
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete the dietary requirement for ${guestName}?`,
      )
    ) {
      return;
    }

    // Additional confirmation for high-severity requirements
    if (severity >= 4) {
      if (
        !confirm(
          'This is a high-severity dietary requirement. Deletion could create safety risks. Continue?',
        )
      ) {
        return;
      }
    }

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        'Content-Type': 'application/json',
      };

      // Add confirmation header for high-severity items
      if (severity >= 4) {
        headers['x-confirm-delete-high-severity'] = 'true';
      }

      const response = await fetch(`/api/catering/dietary?id=${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete requirement');
      }

      // Refresh data
      await handleRefresh();
    } catch (err) {
      console.error('Failed to delete requirement:', err);
      alert(
        `Failed to delete requirement: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  };

  // Loading state
  if (loading && !summary) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load dietary management dashboard: {error}
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchSummary()}
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const { requirements, summary_stats, compliance_insights } = summary;
  const riskColor = {
    LOW: 'text-green-600 bg-green-50 border-green-200',
    MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
    CRITICAL: 'text-red-600 bg-red-50 border-red-200',
  }[compliance_insights.risk_assessment];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dietary Management Dashboard
          </h1>
          <p className="text-gray-600">
            {summary.wedding_name} • {summary.total_guests} guests
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={() =>
              navigateTo(
                `/catering/dietary/requirements/add?weddingId=${weddingId}`,
              )
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Requirements
          </Button>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {summary.total_guests}
              </p>
              <p className="text-sm text-gray-600">Total Guests</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <Activity className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {summary_stats.total_requirements}
              </p>
              <p className="text-sm text-gray-600">Dietary Requirements</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-red-100 rounded-full mr-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {summary_stats.high_severity_count}
              </p>
              <p className="text-sm text-gray-600">High Risk</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {requirements.filter((r) => r.verified).length}
              </p>
              <p className="text-sm text-gray-600">Verified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Assessment Alert */}
      <Alert className={`border-2 ${riskColor}`}>
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Risk Level: {compliance_insights.risk_assessment}</strong>
              {compliance_insights.risk_factors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Risk Factors:</p>
                  <ul className="text-sm list-disc list-inside mt-1">
                    {compliance_insights.risk_factors.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Critical Requirements Alert */}
      {requirements.filter((r) => r.severity === 5).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800">
                ⚠️ CRITICAL: Life-Threatening Allergies Detected
              </h3>
              <p className="text-red-700 text-sm mt-1">
                {requirements.filter((r) => r.severity === 5).length} guest(s)
                have critical dietary requirements. Emergency protocols must be
                in place.
              </p>
              <div className="mt-3 space-y-1">
                {requirements
                  .filter((r) => r.severity === 5)
                  .map((req) => (
                    <Badge
                      key={req.id}
                      className="bg-red-100 text-red-800 border-red-200 mr-2"
                    >
                      {req.guest_name}: {req.notes}
                      {req.emergency_contact && (
                        <span className="ml-2 text-xs">
                          📞 {req.emergency_contact}
                        </span>
                      )}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Unverified Requirements Alert */}
      {summary_stats.unverified_count > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>
              {summary_stats.unverified_count} dietary requirements
            </strong>{' '}
            need guest verification. Consider sending confirmation requests to
            ensure accuracy.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() =>
            navigateTo(
              `/catering/dietary/requirements/add?weddingId=${weddingId}`,
            )
          }
          className="flex-1 sm:flex-none"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Guest Requirements
        </Button>

        <Button
          onClick={() =>
            navigateTo(`/catering/menu/generate?weddingId=${weddingId}`)
          }
          disabled={requirements.length === 0}
          className="flex-1 sm:flex-none"
        >
          <ChefHat className="h-4 w-4 mr-2" />
          Generate AI Menu
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            navigateTo(`/catering/dietary/analysis?weddingId=${weddingId}`)
          }
          disabled={requirements.length === 0}
        >
          View Analysis Report
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="requirements" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="severity">By Severity</TabsTrigger>
          <TabsTrigger value="insights" className="hidden lg:block">
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search guests or requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="allergy">Allergies</option>
                <option value="diet">Dietary</option>
                <option value="medical">Medical</option>
                <option value="preference">Preferences</option>
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Severities</option>
                <option value="5">Critical (5)</option>
                <option value="4">High (4)</option>
                <option value="3">Moderate (3)</option>
                <option value="2">Low (2)</option>
                <option value="1">Mild (1)</option>
              </select>
            </div>
          </div>

          {/* Requirements List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Guest Dietary Requirements
                <Badge variant="outline">
                  {filteredRequirements.length} of {requirements.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRequirements.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {requirements.length === 0
                      ? 'No dietary requirements added yet.'
                      : 'No requirements match your current filters.'}
                  </p>
                  {requirements.length === 0 && (
                    <Button
                      className="mt-4"
                      onClick={() =>
                        navigateTo(
                          `/catering/dietary/requirements/add?weddingId=${weddingId}`,
                        )
                      }
                    >
                      Add First Requirement
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {filteredRequirements.map((req) => {
                      const CategoryIcon = categoryIcons[req.category];
                      const config =
                        severityConfig[
                          req.severity as keyof typeof severityConfig
                        ];

                      return (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="flex items-center space-x-2">
                              <CategoryIcon className="h-5 w-5 text-gray-500" />
                              <Badge className={config.color}>
                                {config.icon} Level {req.severity}
                              </Badge>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                <span className="font-medium text-gray-900">
                                  {req.guest_name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={categoryColors[req.category]}
                                >
                                  {req.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1 truncate">
                                {req.notes}
                              </p>
                              {req.emergency_contact && (
                                <p className="text-xs text-red-600 mt-1">
                                  Emergency: {req.emergency_contact}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {req.verified ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                                <XCircle className="h-3 w-3 mr-1" />
                                Unverified
                              </Badge>
                            )}

                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigateTo(
                                    `/catering/dietary/requirements/edit/${req.id}`,
                                  )
                                }
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  handleDeleteRequirement(
                                    req.id,
                                    req.guest_name,
                                    req.severity,
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(summary_stats.by_category).map(
              ([category, count]) => {
                if (count === 0) return null;

                const IconComponent =
                  categoryIcons[category as keyof typeof categoryIcons] ||
                  Activity;
                const categoryRequirements = requirements.filter(
                  (r) => r.category === category,
                );

                return (
                  <Card
                    key={category}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-5 w-5" />
                          <span className="capitalize">{category}</span>
                        </div>
                        <Badge>{count}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {categoryRequirements.slice(0, 3).map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm font-medium">
                              {req.guest_name}
                            </span>
                            <Badge
                              className={
                                severityConfig[
                                  req.severity as keyof typeof severityConfig
                                ].color
                              }
                              size="sm"
                            >
                              {req.severity}
                            </Badge>
                          </div>
                        ))}
                        {categoryRequirements.length > 3 && (
                          <p className="text-sm text-gray-500 text-center py-1">
                            +{categoryRequirements.length - 3} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>
        </TabsContent>

        <TabsContent value="severity" className="space-y-4">
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map((level) => {
              const levelRequirements = requirements.filter(
                (r) => r.severity === level,
              );
              if (levelRequirements.length === 0) return null;

              const config =
                severityConfig[level as keyof typeof severityConfig];

              return (
                <Card key={level}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={config.color}>
                          {config.icon} Severity Level {level}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {level === 5
                            ? 'Life-threatening'
                            : level === 4
                              ? 'Severe'
                              : level === 3
                                ? 'Moderate'
                                : level === 2
                                  ? 'Mild'
                                  : 'Preference'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {levelRequirements.length} guest
                        {levelRequirements.length !== 1 ? 's' : ''}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {levelRequirements.map((req) => (
                        <div key={req.id} className="p-3 border rounded-lg">
                          <div className="font-medium text-gray-900">
                            {req.guest_name}
                          </div>
                          <div className="text-sm text-gray-600 capitalize">
                            {req.category}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {req.notes}
                          </div>
                          {req.emergency_contact && (
                            <div className="text-xs text-red-600 mt-1">
                              📞 {req.emergency_contact}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {compliance_insights.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg"
                    >
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Common Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Most Common Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary_stats.most_common_requirements.map((req, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {req.requirement}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          {req.category}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {req.count} guest{req.count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  ))}
                  {summary_stats.most_common_requirements.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No common requirements identified yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
