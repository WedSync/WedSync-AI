'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Users, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface WeddingSeasonAnalyticsProps {
  viewMode?: 'compact' | 'detailed';
}

const seasonalData = [
  { month: 'Jan', traffic: 45, weddings: 120 },
  { month: 'Feb', traffic: 52, weddings: 180 },
  { month: 'Mar', traffic: 78, weddings: 320 },
  { month: 'Apr', traffic: 89, weddings: 450 },
  { month: 'May', traffic: 156, weddings: 780 },
  { month: 'Jun', traffic: 234, weddings: 1200 },
  { month: 'Jul', traffic: 267, weddings: 1350 },
  { month: 'Aug', traffic: 245, weddings: 1180 },
  { month: 'Sep', traffic: 298, weddings: 1450 },
  { month: 'Oct', traffic: 278, weddings: 1320 },
  { month: 'Nov', traffic: 123, weddings: 560 },
  { month: 'Dec', traffic: 67, weddings: 290 },
];

export function WeddingSeasonAnalytics({
  viewMode = 'detailed',
}: WeddingSeasonAnalyticsProps) {
  if (viewMode === 'compact') {
    return (
      <div className="space-y-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Peak Season Traffic</span>
            <Badge variant="destructive">298% above baseline</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-scaling Events</span>
            <span className="text-sm font-medium">47 this month</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Wedding Day Readiness</span>
            <Badge variant="default">✓ Ready</Badge>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={seasonalData}>
            <Line
              type="monotone"
              dataKey="traffic"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
            />
            <XAxis dataKey="month" hide />
            <YAxis hide />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Peak Season Status
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">September</div>
            <p className="text-xs text-muted-foreground">Peak wedding season</p>
            <Badge className="mt-2" variant="destructive">
              High Traffic Period
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Traffic Increase
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">298%</div>
            <p className="text-xs text-muted-foreground">Above baseline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Weddings
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,450</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seasonal Traffic Patterns</CardTitle>
          <CardDescription>
            Wedding season traffic and performance optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={seasonalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="traffic" fill="#8884d8" name="Traffic %" />
              <Bar dataKey="weddings" fill="#82ca9d" name="Weddings" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Wedding Season Readiness
          </CardTitle>
          <CardDescription>
            System preparedness for peak wedding season
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Auto-scaling Capacity</span>
              <Badge variant="default">10x Available</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Cache Pre-warming</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Wedding Day Protocols</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Performance Guarantees</span>
              <Badge variant="default">Met</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
