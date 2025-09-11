'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Files,
  Image,
  Film,
  FileText,
  Music,
  Archive,
  Users,
  Clock,
  TrendingUp,
  Star,
  AlertTriangle,
  Download,
  Share,
  Calendar,
  HardDrive,
  Sparkles,
  Eye,
  Camera,
  FileIcon,
} from 'lucide-react';
import {
  FileSystemFile,
  WeddingFileCategory,
  WeddingContext,
  AIAnalysisResult,
} from '@/types/file-management';
import { cn } from '@/lib/utils';

interface FileAnalyticsDashboardProps {
  files: FileSystemFile[];
  organizationId: string;
  weddingContext?: WeddingContext;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface FileAnalytics {
  totalFiles: number;
  totalSize: number;
  categoryBreakdown: Record<WeddingFileCategory, number>;
  sizeByCategory: Record<WeddingFileCategory, number>;
  uploadTrends: Array<{
    date: string;
    count: number;
    size: number;
  }>;
  qualityMetrics: {
    averageQuality: number;
    highQualityFiles: number;
    lowQualityFiles: number;
  };
  aiInsights: {
    facesDetected: number;
    uniqueScenes: string[];
    commonTags: Array<{ tag: string; count: number }>;
    weddingMoments: Array<{ moment: string; count: number }>;
  };
  vendorAttribution: Record<string, number>;
  storageMetrics: {
    usedSpace: number;
    totalSpace: number;
    growthRate: number;
  };
  accessMetrics: {
    mostViewedFiles: Array<{ file: FileSystemFile; views: number }>;
    recentlyAccessed: FileSystemFile[];
    shareActivity: Array<{ file: FileSystemFile; shares: number }>;
  };
}

const CATEGORY_COLORS = {
  [WeddingFileCategory.CEREMONY_PHOTOS]: '#3B82F6',
  [WeddingFileCategory.RECEPTION_PHOTOS]: '#10B981',
  [WeddingFileCategory.PREPARATION_PHOTOS]: '#F59E0B',
  [WeddingFileCategory.COUPLE_PORTRAITS]: '#EF4444',
  [WeddingFileCategory.FAMILY_PORTRAITS]: '#8B5CF6',
  [WeddingFileCategory.DETAIL_SHOTS]: '#06B6D4',
  [WeddingFileCategory.CEREMONY_VIDEO]: '#6366F1',
  [WeddingFileCategory.RECEPTION_VIDEO]: '#84CC16',
  [WeddingFileCategory.SPEECHES_VIDEO]: '#F97316',
  [WeddingFileCategory.CONTRACTS]: '#64748B',
  [WeddingFileCategory.INVOICES]: '#DC2626',
  [WeddingFileCategory.TIMELINE]: '#059669',
  [WeddingFileCategory.GUEST_LIST]: '#7C3AED',
  [WeddingFileCategory.MUSIC_PLAYLIST]: '#DB2777',
  [WeddingFileCategory.VENDOR_FILES]: '#475569',
  [WeddingFileCategory.MISC]: '#6B7280',
};

const CATEGORY_ICONS = {
  [WeddingFileCategory.CEREMONY_PHOTOS]: Image,
  [WeddingFileCategory.RECEPTION_PHOTOS]: Image,
  [WeddingFileCategory.PREPARATION_PHOTOS]: Image,
  [WeddingFileCategory.COUPLE_PORTRAITS]: Image,
  [WeddingFileCategory.FAMILY_PORTRAITS]: Image,
  [WeddingFileCategory.DETAIL_SHOTS]: Image,
  [WeddingFileCategory.CEREMONY_VIDEO]: Film,
  [WeddingFileCategory.RECEPTION_VIDEO]: Film,
  [WeddingFileCategory.SPEECHES_VIDEO]: Film,
  [WeddingFileCategory.CONTRACTS]: FileText,
  [WeddingFileCategory.INVOICES]: FileText,
  [WeddingFileCategory.TIMELINE]: FileText,
  [WeddingFileCategory.GUEST_LIST]: FileText,
  [WeddingFileCategory.MUSIC_PLAYLIST]: Music,
  [WeddingFileCategory.VENDOR_FILES]: Archive,
  [WeddingFileCategory.MISC]: FileIcon,
};

export default function FileAnalyticsDashboard({
  files,
  organizationId,
  weddingContext,
  dateRange,
}: FileAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<FileAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  const filteredFiles = useMemo(() => {
    if (!dateRange) return files;
    return files.filter((file) => {
      const uploadDate = new Date(file.uploadedAt);
      return uploadDate >= dateRange.start && uploadDate <= dateRange.end;
    });
  }, [files, dateRange]);

  useEffect(() => {
    calculateAnalytics(filteredFiles);
  }, [filteredFiles]);

  const calculateAnalytics = async (filesData: FileSystemFile[]) => {
    setLoading(true);

    try {
      const totalFiles = filesData.length;
      const totalSize = filesData.reduce((sum, file) => sum + file.size, 0);

      // Category breakdown
      const categoryBreakdown: Record<WeddingFileCategory, number> = {} as any;
      const sizeByCategory: Record<WeddingFileCategory, number> = {} as any;

      Object.values(WeddingFileCategory).forEach((category) => {
        categoryBreakdown[category] = 0;
        sizeByCategory[category] = 0;
      });

      filesData.forEach((file) => {
        categoryBreakdown[file.category]++;
        sizeByCategory[file.category] += file.size;
      });

      // Upload trends (by day)
      const uploadTrends = generateUploadTrends(filesData);

      // Quality metrics
      const qualityMetrics = calculateQualityMetrics(filesData);

      // AI insights
      const aiInsights = calculateAIInsights(filesData);

      // Vendor attribution
      const vendorAttribution = calculateVendorAttribution(filesData);

      // Storage metrics
      const storageMetrics = {
        usedSpace: totalSize,
        totalSpace: 10 * 1024 * 1024 * 1024, // 10GB default limit
        growthRate: calculateGrowthRate(filesData),
      };

      // Access metrics (mock data - would come from actual usage tracking)
      const accessMetrics = {
        mostViewedFiles: filesData
          .slice(0, 5)
          .map((file) => ({ file, views: Math.floor(Math.random() * 100) + 1 }))
          .sort((a, b) => b.views - a.views),
        recentlyAccessed: filesData
          .sort(
            (a, b) =>
              new Date(b.uploadedAt).getTime() -
              new Date(a.uploadedAt).getTime(),
          )
          .slice(0, 10),
        shareActivity: filesData
          .slice(0, 5)
          .map((file) => ({ file, shares: Math.floor(Math.random() * 20) }))
          .sort((a, b) => b.shares - a.shares),
      };

      const analyticsData: FileAnalytics = {
        totalFiles,
        totalSize,
        categoryBreakdown,
        sizeByCategory,
        uploadTrends,
        qualityMetrics,
        aiInsights,
        vendorAttribution,
        storageMetrics,
        accessMetrics,
      };

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to calculate analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateUploadTrends = (filesData: FileSystemFile[]) => {
    const trends = new Map<string, { count: number; size: number }>();

    filesData.forEach((file) => {
      const date = new Date(file.uploadedAt).toISOString().split('T')[0];
      const existing = trends.get(date) || { count: 0, size: 0 };
      trends.set(date, {
        count: existing.count + 1,
        size: existing.size + file.size,
      });
    });

    return Array.from(trends.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const calculateQualityMetrics = (filesData: FileSystemFile[]) => {
    const imageFiles = filesData.filter((file) =>
      file.mimeType.startsWith('image/'),
    );
    if (imageFiles.length === 0) {
      return { averageQuality: 0, highQualityFiles: 0, lowQualityFiles: 0 };
    }

    let totalQuality = 0;
    let qualityCount = 0;
    let highQualityFiles = 0;
    let lowQualityFiles = 0;

    imageFiles.forEach((file) => {
      const aiAnalysis = file.metadata?.aiAnalysis as AIAnalysisResult;
      if (aiAnalysis?.qualityScore !== undefined) {
        totalQuality += aiAnalysis.qualityScore;
        qualityCount++;

        if (aiAnalysis.qualityScore >= 8) highQualityFiles++;
        if (aiAnalysis.qualityScore <= 5) lowQualityFiles++;
      }
    });

    return {
      averageQuality: qualityCount > 0 ? totalQuality / qualityCount : 0,
      highQualityFiles,
      lowQualityFiles,
    };
  };

  const calculateAIInsights = (filesData: FileSystemFile[]) => {
    let facesDetected = 0;
    const scenes = new Set<string>();
    const tagCounts = new Map<string, number>();
    const momentCounts = new Map<string, number>();

    filesData.forEach((file) => {
      const aiAnalysis = file.metadata?.aiAnalysis as AIAnalysisResult;
      if (aiAnalysis) {
        // Count faces
        if (aiAnalysis.faces) {
          facesDetected += aiAnalysis.faces.length;
        }

        // Collect scenes
        if (aiAnalysis.sceneRecognition?.primaryScene) {
          scenes.add(aiAnalysis.sceneRecognition.primaryScene);
        }

        // Count tags
        aiAnalysis.smartTags?.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });

        // Count wedding moments
        aiAnalysis.weddingMoments?.forEach((moment) => {
          momentCounts.set(moment, (momentCounts.get(moment) || 0) + 1);
        });
      }
    });

    return {
      facesDetected,
      uniqueScenes: Array.from(scenes),
      commonTags: Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      weddingMoments: Array.from(momentCounts.entries())
        .map(([moment, count]) => ({ moment, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  };

  const calculateVendorAttribution = (filesData: FileSystemFile[]) => {
    const attribution: Record<string, number> = {};

    filesData.forEach((file) => {
      const aiAnalysis = file.metadata?.aiAnalysis as AIAnalysisResult;
      const vendor = aiAnalysis?.vendorAttribution || 'unknown';
      attribution[vendor] = (attribution[vendor] || 0) + 1;
    });

    return attribution;
  };

  const calculateGrowthRate = (filesData: FileSystemFile[]) => {
    if (filesData.length < 2) return 0;

    const sortedFiles = filesData.sort(
      (a, b) =>
        new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
    );

    const firstHalf = sortedFiles.slice(0, Math.floor(sortedFiles.length / 2));
    const secondHalf = sortedFiles.slice(Math.floor(sortedFiles.length / 2));

    const firstHalfSize = firstHalf.reduce((sum, file) => sum + file.size, 0);
    const secondHalfSize = secondHalf.reduce((sum, file) => sum + file.size, 0);

    return firstHalfSize > 0
      ? ((secondHalfSize - firstHalfSize) / firstHalfSize) * 100
      : 0;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading || !analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const categoryChartData = Object.entries(analytics.categoryBreakdown)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      name: category.replace(/_/g, ' ').toLowerCase(),
      value: count,
      color: CATEGORY_COLORS[category as WeddingFileCategory],
    }));

  const sizeChartData = Object.entries(analytics.sizeByCategory)
    .filter(([_, size]) => size > 0)
    .map(([category, size]) => ({
      name: category.replace(/_/g, ' ').toLowerCase(),
      size: size,
      color: CATEGORY_COLORS[category as WeddingFileCategory],
    }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Files</p>
                <p className="text-2xl font-bold">
                  {analytics.totalFiles.toLocaleString()}
                </p>
              </div>
              <Files className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-green-600">
                  {analytics.storageMetrics.growthRate > 0 ? '+' : ''}
                  {analytics.storageMetrics.growthRate.toFixed(1)}%
                </span>
                <span className="text-gray-600 ml-1">growth</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Storage Used</p>
                <p className="text-2xl font-bold">
                  {formatFileSize(analytics.totalSize)}
                </p>
              </div>
              <HardDrive className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-4">
              <Progress
                value={
                  (analytics.storageMetrics.usedSpace /
                    analytics.storageMetrics.totalSpace) *
                  100
                }
                className="h-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(analytics.storageMetrics.totalSpace)} total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Quality Score</p>
                <p className="text-2xl font-bold">
                  {analytics.qualityMetrics.averageQuality.toFixed(1)}
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-green-600">
                  {analytics.qualityMetrics.highQualityFiles} high quality
                </span>
                <span className="text-red-600">
                  {analytics.qualityMetrics.lowQualityFiles} need attention
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Faces Detected</p>
                <p className="text-2xl font-bold">
                  {analytics.aiInsights.facesDetected}
                </p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Powered
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Files by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Storage by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sizeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis tickFormatter={(value) => formatFileSize(value)} />
                    <Tooltip
                      formatter={(value) => [
                        formatFileSize(value as number),
                        'Size',
                      ]}
                    />
                    <Bar dataKey="size" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analytics.categoryBreakdown)
              .filter(([_, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const Icon = CATEGORY_ICONS[category as WeddingFileCategory];
                const size =
                  analytics.sizeByCategory[category as WeddingFileCategory];
                const color = CATEGORY_COLORS[category as WeddingFileCategory];

                return (
                  <Card
                    key={category}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              backgroundColor: `${color}15`,
                              color: color,
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-sm">
                            {category.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatFileSize(size)}
                      </div>
                      <Progress
                        value={(count / analytics.totalFiles) * 100}
                        className="h-1 mt-2"
                        style={
                          {
                            '--progress-background': color,
                          } as React.CSSProperties
                        }
                      />
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Upload Trends Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.uploadTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={formatFileSize}
                  />
                  <Tooltip
                    labelFormatter={(label) => `Date: ${label}`}
                    formatter={(value, name) => {
                      if (name === 'size')
                        return [formatFileSize(value as number), 'Total Size'];
                      return [value, 'Files Uploaded'];
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    fill="#3B82F6"
                    name="Files"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="size"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Size"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Common Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.aiInsights.commonTags.map(({ tag, count }) => (
                  <div key={tag} className="flex items-center justify-between">
                    <Badge variant="outline">{tag}</Badge>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(count / analytics.totalFiles) * 100}
                        className="w-20 h-2"
                      />
                      <span className="text-sm text-gray-600">{count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-pink-600" />
                  Wedding Moments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.aiInsights.weddingMoments.map(
                  ({ moment, count }) => (
                    <div
                      key={moment}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {moment.replace(/-/g, ' ').toLowerCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(count / analytics.totalFiles) * 100}
                          className="w-20 h-2"
                        />
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    </div>
                  ),
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Vendor Attribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.vendorAttribution).map(
                  ([vendor, count]) => (
                    <div
                      key={vendor}
                      className="text-center p-4 bg-gray-50 rounded-lg"
                    >
                      <p className="font-medium text-lg">{count}</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {vendor === 'unknown'
                          ? 'Unattributed'
                          : vendor.replace(/-/g, ' ')}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Most Viewed Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.accessMetrics.mostViewedFiles.map(
                  ({ file, views }, index) => (
                    <div key={file.id} className="flex items-center space-x-3">
                      <Badge
                        variant="outline"
                        className="w-6 h-6 p-0 flex items-center justify-center"
                      >
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.category.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600">{views} views</div>
                    </div>
                  ),
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share className="w-5 h-5" />
                  Share Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.accessMetrics.shareActivity.map(
                  ({ file, shares }, index) => (
                    <div key={file.id} className="flex items-center space-x-3">
                      <Badge
                        variant="outline"
                        className="w-6 h-6 p-0 flex items-center justify-center"
                      >
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.category.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600">
                        {shares} shares
                      </div>
                    </div>
                  ),
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export as PDF Report
            </Button>
            <Button variant="outline">
              <Share className="w-4 h-4 mr-2" />
              Share Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
