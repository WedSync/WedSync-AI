'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Camera,
  FileText,
  MessageCircle,
  Zap,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type {
  CostSavingsReporterProps,
  CostSavingsReport,
} from '@/types/ai-optimization';

// Enhanced mock data for comprehensive reporting
const mockReport: CostSavingsReport = {
  period: 'monthly',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  baseline: {
    totalCostPence: 28000, // £280.00
    avgDailyCostPence: 903, // £9.03
  },
  optimized: {
    totalCostPence: 17200, // £172.00
    avgDailyCostPence: 555, // £5.55
  },
  savings: {
    absolutePence: 10800, // £108.00
    percentage: 38.6,
    projectedAnnualSavingsPence: 129600, // £1,296.00
  },
  savingsByOptimization: {
    caching: 6000, // £60.00 (55.6%)
    modelSelection: 2800, // £28.00 (25.9%)
    batchProcessing: 1500, // £15.00 (13.9%)
    seasonalOptimization: 500, // £5.00 (4.6%)
  },
  weddingMetrics: {
    weddingsProcessed: 18,
    avgCostPerWedding: 956, // £9.56
    peakSeasonSavings: 3200, // £32.00
  },
};

// Historical data for trend analysis
const historicalData = [
  { month: 'Oct 2024', baseline: 22000, optimized: 15400, savings: 6600 },
  { month: 'Nov 2024', baseline: 19000, optimized: 13300, savings: 5700 },
  { month: 'Dec 2024', baseline: 24000, optimized: 16800, savings: 7200 },
  { month: 'Jan 2025', baseline: 28000, optimized: 17200, savings: 10800 },
];

export default function CostSavingsReporter({
  report = mockReport,
  period = 'monthly',
  onPeriodChange,
  className = '',
}: CostSavingsReporterProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [downloadFormat, setDownloadFormat] = useState('pdf');

  const savingsBreakdownData = [
    {
      name: 'Smart Caching',
      value: report.savingsByOptimization.caching,
      percentage:
        (report.savingsByOptimization.caching / report.savings.absolutePence) *
        100,
      color: 'bg-blue-500',
      icon: Zap,
      description: 'Reduced API calls through intelligent caching',
    },
    {
      name: 'Model Selection',
      value: report.savingsByOptimization.modelSelection,
      percentage:
        (report.savingsByOptimization.modelSelection /
          report.savings.absolutePence) *
        100,
      color: 'bg-green-500',
      icon: Target,
      description: 'Using cost-effective models for appropriate tasks',
    },
    {
      name: 'Batch Processing',
      value: report.savingsByOptimization.batchProcessing,
      percentage:
        (report.savingsByOptimization.batchProcessing /
          report.savings.absolutePence) *
        100,
      color: 'bg-purple-500',
      icon: BarChart3,
      description: 'Processing operations in batches during off-peak hours',
    },
    {
      name: 'Seasonal Optimization',
      value: report.savingsByOptimization.seasonalOptimization,
      percentage:
        (report.savingsByOptimization.seasonalOptimization /
          report.savings.absolutePence) *
        100,
      color: 'bg-orange-500',
      icon: Calendar,
      description: 'Wedding season cost management strategies',
    },
  ];

  const handleDownloadReport = () => {
    // In a real implementation, this would generate and download the report
    console.log(`Downloading ${period} report in ${downloadFormat} format`);
  };

  const handlePeriodChange = (
    newPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly',
  ) => {
    onPeriodChange(newPeriod);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cost Savings Report
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive analysis of AI cost optimizations and savings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleDownloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">
                  Total Savings
                </p>
                <p className="text-2xl font-bold text-green-900">
                  £{(report.savings.absolutePence / 100).toFixed(2)}
                </p>
                <p className="text-xs text-green-600">
                  {report.savings.percentage.toFixed(1)}% reduction
                </p>
              </div>
              <div className="p-2 bg-green-200 rounded-lg">
                <TrendingDown className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Projected Annual
                </p>
                <p className="text-2xl font-bold">
                  £
                  {(report.savings.projectedAnnualSavingsPence / 100).toFixed(
                    0,
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on current rate
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowUpRight className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Weddings Processed
                </p>
                <p className="text-2xl font-bold">
                  {report.weddingMetrics.weddingsProcessed}
                </p>
                <p className="text-xs text-muted-foreground">
                  £{(report.weddingMetrics.avgCostPerWedding / 100).toFixed(2)}{' '}
                  avg/wedding
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Camera className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Daily Average
                </p>
                <p className="text-2xl font-bold">
                  £{(report.optimized.avgDailyCostPence / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  vs £{(report.baseline.avgDailyCostPence / 100).toFixed(2)}{' '}
                  baseline
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="wedding">Wedding Focus</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Savings Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cost optimization performance for{' '}
                {new Date(report.startDate).toLocaleDateString()} -{' '}
                {new Date(report.endDate).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Cost Comparison */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Cost Reduction</span>
                    <span className="text-sm font-bold">
                      £{(report.baseline.totalCostPence / 100).toFixed(2)} → £
                      {(report.optimized.totalCostPence / 100).toFixed(2)}
                    </span>
                  </div>
                  <Progress
                    value={100 - report.savings.percentage}
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Optimized Cost</span>
                    <span>{report.savings.percentage.toFixed(1)}% Savings</span>
                  </div>
                </div>

                {/* Top Optimization Techniques */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-3">
                      Top Optimization Strategies
                    </h3>
                    <div className="space-y-2">
                      {savingsBreakdownData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium">
                            £{(item.value / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Performance Metrics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Cache Hit Rate:</span>
                        <span className="font-medium">76.7%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Model Optimization:</span>
                        <span className="font-medium">
                          GPT-3.5 for 75% of tasks
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Batch Processing:</span>
                        <span className="font-medium">42 jobs scheduled</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peak Season Prep:</span>
                        <span className="font-medium text-green-600">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Savings by Optimization Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savingsBreakdownData.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          £{(item.value / 100).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Camera className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <div className="font-semibold">Photography AI</div>
                  <div className="text-2xl font-bold text-blue-600">
                    £{(6000 / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    55.6% of total savings
                  </div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <FileText className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="font-semibold">Content Generation</div>
                  <div className="text-2xl font-bold text-green-600">
                    £{(3200 / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    29.6% of total savings
                  </div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <MessageCircle className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <div className="font-semibold">Chatbot</div>
                  <div className="text-2xl font-bold text-purple-600">
                    £{(1600 / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    14.8% of total savings
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Savings Trend</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your optimization progress over the past 4 months
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historicalData.map((month, index) => {
                  const savingsPercentage =
                    (month.savings / month.baseline) * 100;
                  const isImproving =
                    index > 0 &&
                    month.savings > historicalData[index - 1].savings;

                  return (
                    <div
                      key={month.month}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${isImproving ? 'bg-green-100' : 'bg-blue-100'}`}
                        >
                          {isImproving ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <span className="font-medium">{month.month}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          £{(month.savings / 100).toFixed(2)} saved
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {savingsPercentage.toFixed(1)}% reduction
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Excellent Progress!</strong> Your savings have increased
              by 63.6% over the past 4 months. The optimization system is
              learning your usage patterns and becoming more effective.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Wedding-Specific Tab */}
        <TabsContent value="wedding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Industry Performance</CardTitle>
              <p className="text-sm text-muted-foreground">
                AI cost optimization tailored for wedding vendors
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Peak Season Impact</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Peak Season Savings:</span>
                      <span className="font-medium">
                        £
                        {(
                          report.weddingMetrics.peakSeasonSavings / 100
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average per Wedding:</span>
                      <span className="font-medium">
                        £
                        {(
                          report.weddingMetrics.avgCostPerWedding / 100
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Weddings Processed:</span>
                      <span className="font-medium">
                        {report.weddingMetrics.weddingsProcessed}
                      </span>
                    </div>
                  </div>

                  <Alert>
                    <Award className="h-4 w-4" />
                    <AlertDescription>
                      You're saving an average of £6.00 per wedding through AI
                      optimization. This adds up to significant savings during
                      busy seasons!
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Industry Benchmarks</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm">Your Performance</span>
                      <Badge className="bg-green-100 text-green-800">
                        38.6% savings
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">Industry Average</span>
                      <Badge variant="outline">22% savings</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm">Top Performers</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        45% savings
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    You're performing 75% better than the industry average for
                    wedding vendors!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seasonal Optimization Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">
                    Peak Season (March-October)
                  </h4>
                  <ul className="text-sm space-y-1 text-orange-700">
                    <li>• Aggressive caching for photo processing</li>
                    <li>• Batch non-urgent operations</li>
                    <li>• Use GPT-3.5 for routine tasks</li>
                    <li>• Schedule operations during off-peak hours</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Low Season (November-February)
                  </h4>
                  <ul className="text-sm space-y-1 text-blue-700">
                    <li>• Focus on system optimization</li>
                    <li>• Prepare templates for busy season</li>
                    <li>• Improve cache strategies</li>
                    <li>• Plan budget for peak months</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
