'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Download,
  Calculator,
  Target,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { BudgetExportDialog } from './export/BudgetExportDialog';

interface AnalyticsData {
  categoryBreakdown: Array<{
    name: string;
    amount: number;
    color: string;
    percentage: number;
  }>;
  budgetComparison: Array<{
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    percentage: number;
  }>;
  trendData: Array<{
    month: string;
    spent: number;
    budget: number;
    variance: number;
  }>;
}

interface ForecastData {
  projectionData: Array<{
    month: string;
    actual: number;
    projected: number;
    confidence: number;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    savings?: number;
    urgency: 'low' | 'medium' | 'high';
    category?: string;
  }>;
  finalProjection: {
    totalBudget: number;
    projectedSpending: number;
    variance: number;
    confidenceLevel: number;
  };
}

export default function AdvancedBudgetDashboard({
  weddingId,
}: {
  weddingId: string;
}) {
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, [weddingId, timeRange]);

  const fetchAdvancedAnalytics = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [analyticsResponse, forecastResponse] = await Promise.all([
        fetch(`/api/budgets/${weddingId}/analytics?range=${timeRange}`),
        fetch(`/api/budgets/${weddingId}/forecast`),
      ]);

      if (analyticsResponse.ok) {
        const analytics = await analyticsResponse.json();
        setAnalyticsData(analytics);
      }

      if (forecastResponse.ok) {
        const forecast = await forecastResponse.json();
        setForecastData(forecast);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load budget analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportComplete = (exportId: string) => {
    toast.success('Export completed successfully');
    setExportDialogOpen(false);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Advanced Budget Analytics</h2>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Spending Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Spending Forecast & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forecastData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Projected Final Spending</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={forecastData.projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        `$${value.toLocaleString()}`,
                        'Amount',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="projected"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Forecast Summary */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Budget</p>
                      <p className="font-semibold">
                        $
                        {forecastData.finalProjection.totalBudget.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Projected Spending</p>
                      <p className="font-semibold">
                        $
                        {forecastData.finalProjection.projectedSpending.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Variance</p>
                      <p
                        className={`font-semibold ${forecastData.finalProjection.variance > 0 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {forecastData.finalProjection.variance > 0 ? '+' : ''}$
                        {forecastData.finalProjection.variance.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Confidence</p>
                      <p className="font-semibold">
                        {forecastData.finalProjection.confidenceLevel}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Smart Recommendations</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {forecastData.recommendations?.map((rec, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg ${getUrgencyColor(rec.urgency)}`}
                    >
                      <div className="flex items-start gap-2">
                        {rec.urgency === 'high' ? (
                          <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600" />
                        ) : (
                          <Target className="w-4 h-4 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{rec.title}</p>
                            <Badge variant="secondary" className="text-xs">
                              {rec.urgency}
                            </Badge>
                          </div>
                          <p className="text-xs opacity-90">
                            {rec.description}
                          </p>
                          {rec.category && (
                            <p className="text-xs opacity-75 mt-1">
                              Category: {rec.category}
                            </p>
                          )}
                          {rec.savings && (
                            <p className="text-xs font-medium text-green-700 mt-1">
                              Potential savings: ${rec.savings.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData?.categoryBreakdown || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {analyticsData?.categoryBreakdown?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Spent']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData?.budgetComparison || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
                <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Spending Trends */}
      {analyticsData?.trendData && analyticsData.trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analyticsData.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `$${value.toLocaleString()}`,
                    'Amount',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="spent"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Spent"
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Budget"
                />
                <Line
                  type="monotone"
                  dataKey="variance"
                  stroke="#ffc658"
                  strokeWidth={2}
                  name="Variance"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      {analyticsData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyticsData.budgetComparison.length > 0 && (
                <>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-gray-600">Biggest Overspend</p>
                    <p className="font-semibold">
                      {analyticsData.budgetComparison
                        .filter((item) => item.variance > 0)
                        .sort((a, b) => b.variance - a.variance)[0]?.category ||
                        'None'}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-gray-600">Best Performer</p>
                    <p className="font-semibold">
                      {analyticsData.budgetComparison
                        .filter((item) => item.variance <= 0)
                        .sort((a, b) => a.variance - b.variance)[0]?.category ||
                        'None'}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <p className="text-sm text-gray-600">
                      Categories Over Budget
                    </p>
                    <p className="font-semibold">
                      {
                        analyticsData.budgetComparison.filter(
                          (item) => item.variance > 0,
                        ).length
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
      <BudgetExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        coupleId={weddingId}
        budgetData={{
          categories:
            analyticsData?.categoryBreakdown?.map((cat) => ({
              id: cat.name.toLowerCase().replace(/\s+/g, '-'),
              name: cat.name,
              allocated_amount: cat.amount,
            })) || [],
          transactions:
            analyticsData?.budgetComparison?.map((item, index) => ({
              id: `${index}`,
              description: `${item.category} expenses`,
              amount: item.actual,
              category: item.category,
              date: new Date().toISOString().split('T')[0],
            })) || [],
          totalBudget:
            analyticsData?.budgetComparison?.reduce(
              (sum, item) => sum + item.budgeted,
              0,
            ) || 0,
          totalSpent:
            analyticsData?.budgetComparison?.reduce(
              (sum, item) => sum + item.actual,
              0,
            ) || 0,
        }}
        onExportComplete={handleExportComplete}
      />
    </div>
  );
}
