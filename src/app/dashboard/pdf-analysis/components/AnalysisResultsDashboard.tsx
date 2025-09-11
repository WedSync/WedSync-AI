'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  Filter,
  Search,
  TrendingUp,
  FileText,
  Users,
  Eye,
  CheckCircle,
  AlertTriangle,
  Brain,
  Sparkles,
  Star,
  Heart,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AnalysisResult {
  id: string;
  fileName: string;
  clientName: string;
  weddingDate?: string;
  venue?: string;
  analysisDate: Date;
  status: 'completed' | 'failed' | 'processing';
  processingTime: number; // seconds
  fieldsExtracted: number;
  confidenceScore: number;
  dataQuality: 'high' | 'medium' | 'low';
  category: 'questionnaire' | 'contract' | 'planning_form' | 'vendor_brief';
  tags: string[];
  fileSize: number; // bytes
  exportCount: number;
  lastAccessed: Date;
}

interface AnalysisMetrics {
  totalAnalyses: number;
  successRate: number;
  avgProcessingTime: number;
  avgConfidence: number;
  totalFieldsExtracted: number;
  popularCategories: Array<{ name: string; count: number }>;
  monthlyTrends: Array<{ month: string; analyses: number; success: number }>;
  qualityDistribution: Array<{
    quality: string;
    count: number;
    percentage: number;
  }>;
}

interface AnalysisResultsDashboardProps {
  onViewAnalysis: (analysisId: string) => void;
  onExportAnalysis: (
    analysisId: string,
    format: 'pdf' | 'csv' | 'json',
  ) => void;
  onDeleteAnalysis: (analysisId: string) => void;
}

// Mock data for demonstration
const mockAnalysisResults: AnalysisResult[] = [
  {
    id: 'analysis-001',
    fileName: 'Smith_Wedding_Questionnaire_2024.pdf',
    clientName: 'Emily & James Smith',
    weddingDate: '2024-06-15',
    venue: 'Ashridge House, Hertfordshire',
    analysisDate: new Date('2024-01-15T10:30:00'),
    status: 'completed',
    processingTime: 127,
    fieldsExtracted: 45,
    confidenceScore: 94,
    dataQuality: 'high',
    category: 'questionnaire',
    tags: ['luxury', 'outdoor', 'photography'],
    fileSize: 2.4 * 1024 * 1024,
    exportCount: 3,
    lastAccessed: new Date('2024-01-16T14:20:00'),
  },
  {
    id: 'analysis-002',
    fileName: 'Johnson_Contract_Details.pdf',
    clientName: 'Sarah & Michael Johnson',
    weddingDate: '2024-08-20',
    venue: 'The Shard, London',
    analysisDate: new Date('2024-01-14T16:45:00'),
    status: 'completed',
    processingTime: 89,
    fieldsExtracted: 32,
    confidenceScore: 87,
    dataQuality: 'high',
    category: 'contract',
    tags: ['city', 'formal', 'corporate'],
    fileSize: 1.8 * 1024 * 1024,
    exportCount: 1,
    lastAccessed: new Date('2024-01-15T09:10:00'),
  },
  {
    id: 'analysis-003',
    fileName: 'Williams_Planning_Form_v2.pdf',
    clientName: 'Jessica & David Williams',
    weddingDate: '2024-09-14',
    venue: 'Cotswolds Barn',
    analysisDate: new Date('2024-01-13T11:20:00'),
    status: 'completed',
    processingTime: 156,
    fieldsExtracted: 52,
    confidenceScore: 91,
    dataQuality: 'high',
    category: 'planning_form',
    tags: ['rustic', 'countryside', 'intimate'],
    fileSize: 3.1 * 1024 * 1024,
    exportCount: 2,
    lastAccessed: new Date('2024-01-14T13:30:00'),
  },
  {
    id: 'analysis-004',
    fileName: 'Brown_Vendor_Requirements.pdf',
    clientName: 'Anna & Chris Brown',
    weddingDate: '2024-07-05',
    venue: 'Beach Club, Brighton',
    analysisDate: new Date('2024-01-12T14:15:00'),
    status: 'completed',
    processingTime: 98,
    fieldsExtracted: 28,
    confidenceScore: 79,
    dataQuality: 'medium',
    category: 'vendor_brief',
    tags: ['beach', 'casual', 'seaside'],
    fileSize: 1.5 * 1024 * 1024,
    exportCount: 4,
    lastAccessed: new Date('2024-01-13T16:45:00'),
  },
  {
    id: 'analysis-005',
    fileName: 'Davis_Wedding_Info_Incomplete.pdf',
    clientName: 'Lisa & Tom Davis',
    analysisDate: new Date('2024-01-11T09:30:00'),
    status: 'failed',
    processingTime: 45,
    fieldsExtracted: 0,
    confidenceScore: 0,
    dataQuality: 'low',
    category: 'questionnaire',
    tags: ['incomplete', 'low-quality'],
    fileSize: 0.8 * 1024 * 1024,
    exportCount: 0,
    lastAccessed: new Date('2024-01-11T09:30:00'),
  },
];

export function AnalysisResultsDashboard({
  onViewAnalysis,
  onExportAnalysis,
  onDeleteAnalysis,
}: AnalysisResultsDashboardProps) {
  const [analysisResults, setAnalysisResults] =
    useState<AnalysisResult[]>(mockAnalysisResults);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'name'>('date');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>(
    '30d',
  );

  // Filter and sort results
  const filteredResults = useMemo(() => {
    return analysisResults
      .filter((result) => {
        const matchesSearch =
          result.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' || result.category === selectedCategory;
        const matchesStatus =
          selectedStatus === 'all' || result.status === selectedStatus;

        let matchesDate = true;
        if (dateRange !== 'all') {
          const daysAgo = parseInt(dateRange);
          const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
          matchesDate = result.analysisDate > cutoff;
        }

        return matchesSearch && matchesCategory && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return b.analysisDate.getTime() - a.analysisDate.getTime();
          case 'confidence':
            return b.confidenceScore - a.confidenceScore;
          case 'name':
            return a.clientName.localeCompare(b.clientName);
          default:
            return 0;
        }
      });
  }, [
    analysisResults,
    searchTerm,
    selectedCategory,
    selectedStatus,
    sortBy,
    dateRange,
  ]);

  // Calculate metrics
  const metrics = useMemo<AnalysisMetrics>(() => {
    const completed = analysisResults.filter((r) => r.status === 'completed');
    const failed = analysisResults.filter((r) => r.status === 'failed');

    return {
      totalAnalyses: analysisResults.length,
      successRate:
        analysisResults.length > 0
          ? (completed.length / analysisResults.length) * 100
          : 0,
      avgProcessingTime:
        completed.length > 0
          ? completed.reduce((sum, r) => sum + r.processingTime, 0) /
            completed.length
          : 0,
      avgConfidence:
        completed.length > 0
          ? completed.reduce((sum, r) => sum + r.confidenceScore, 0) /
            completed.length
          : 0,
      totalFieldsExtracted: completed.reduce(
        (sum, r) => sum + r.fieldsExtracted,
        0,
      ),
      popularCategories: [
        {
          name: 'Questionnaires',
          count: analysisResults.filter((r) => r.category === 'questionnaire')
            .length,
        },
        {
          name: 'Contracts',
          count: analysisResults.filter((r) => r.category === 'contract')
            .length,
        },
        {
          name: 'Planning Forms',
          count: analysisResults.filter((r) => r.category === 'planning_form')
            .length,
        },
        {
          name: 'Vendor Briefs',
          count: analysisResults.filter((r) => r.category === 'vendor_brief')
            .length,
        },
      ].sort((a, b) => b.count - a.count),
      monthlyTrends: [
        { month: 'Dec 2023', analyses: 8, success: 7 },
        { month: 'Jan 2024', analyses: 12, success: 11 },
        { month: 'Feb 2024', analyses: 15, success: 14 },
        { month: 'Mar 2024', analyses: 18, success: 17 },
      ],
      qualityDistribution: [
        {
          quality: 'High',
          count: completed.filter((r) => r.dataQuality === 'high').length,
          percentage: 0,
        },
        {
          quality: 'Medium',
          count: completed.filter((r) => r.dataQuality === 'medium').length,
          percentage: 0,
        },
        {
          quality: 'Low',
          count: completed.filter((r) => r.dataQuality === 'low').length,
          percentage: 0,
        },
      ].map((item) => ({
        ...item,
        percentage:
          completed.length > 0 ? (item.count / completed.length) * 100 : 0,
      })),
    };
  }, [analysisResults]);

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'questionnaire':
        return FileText;
      case 'contract':
        return CheckCircle;
      case 'planning_form':
        return Calendar;
      case 'vendor_brief':
        return Users;
      default:
        return FileText;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Analysis Results Dashboard</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Track and analyze your AI-powered wedding form processing
              </p>
            </div>

            <Button onClick={() => onExportAnalysis('all', 'csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Analyses
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalAnalyses}
                </p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+12%</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.successRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Star className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">Excellent</span>
              <span className="text-gray-500 ml-1">performance</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Confidence
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.avgConfidence.toFixed(1)}%
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+5.2%</span>
              <span className="text-gray-500 ml-1">improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Fields Extracted
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalFieldsExtracted}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Heart className="h-4 w-4 text-pink-500 mr-1" />
              <span className="text-pink-500 font-medium">Wedding data</span>
              <span className="text-gray-500 ml-1">captured</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Analysis Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.monthlyTrends.map((month, index) => (
                <div
                  key={month.month}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{month.month}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {month.analyses} total
                      </div>
                      <div className="text-xs text-green-600">
                        {month.success} successful
                      </div>
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-blue-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(month.success / month.analyses) * 100}%`,
                        }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.qualityDistribution.map((quality, index) => (
                <div
                  key={quality.quality}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'h-3 w-3 rounded-full',
                        quality.quality === 'High' && 'bg-green-500',
                        quality.quality === 'Medium' && 'bg-yellow-500',
                        quality.quality === 'Low' && 'bg-red-500',
                      )}
                    />
                    <span className="text-sm font-medium">
                      {quality.quality} Quality
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {quality.count} analyses
                      </div>
                      <div className="text-xs text-gray-500">
                        {quality.percentage.toFixed(1)}%
                      </div>
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <motion.div
                        className={cn(
                          'h-2 rounded-full',
                          quality.quality === 'High' && 'bg-green-500',
                          quality.quality === 'Medium' && 'bg-yellow-500',
                          quality.quality === 'Low' && 'bg-red-500',
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${quality.percentage}%` }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by client name or file name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="questionnaire">Questionnaires</option>
                <option value="contract">Contracts</option>
                <option value="planning_form">Planning Forms</option>
                <option value="vendor_brief">Vendor Briefs</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="confidence">Sort by Confidence</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <div className="space-y-3">
              {filteredResults.map((result) => {
                const CategoryIcon = getCategoryIcon(result.category);

                return (
                  <motion.div
                    key={result.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <CategoryIcon className="h-8 w-8 text-gray-500" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {result.clientName}
                            </h4>
                            <Badge
                              variant={
                                result.status === 'completed'
                                  ? 'default'
                                  : result.status === 'failed'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {result.status}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={getQualityColor(result.dataQuality)}
                            >
                              {result.dataQuality} quality
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-600 truncate mb-2">
                            {result.fileName}
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {result.analysisDate.toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDuration(result.processingTime)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FileText className="h-3 w-3" />
                              <span>{result.fieldsExtracted} fields</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3" />
                              <span>{result.confidenceScore}% confident</span>
                            </div>
                          </div>

                          {result.weddingDate && (
                            <div className="mt-2 text-xs text-gray-600">
                              <Heart className="h-3 w-3 inline mr-1 text-pink-500" />
                              Wedding: {result.weddingDate}{' '}
                              {result.venue && `at ${result.venue}`}
                            </div>
                          )}

                          {result.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {result.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewAnalysis(result.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExportAnalysis(result.id, 'pdf')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {filteredResults.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No analyses found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or upload a new wedding form
                to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
