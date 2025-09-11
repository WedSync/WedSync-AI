'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitBranch,
  Target,
  DollarSign,
  Clock,
  MousePointer,
  Mail,
  Share2,
  ShoppingCart,
  TrendingUp,
  Eye,
} from 'lucide-react';
import {
  Sankey,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

interface TouchPoint {
  id: string;
  type: 'email' | 'viral' | 'organic' | 'paid' | 'social' | 'direct';
  timestamp: string;
  channel: string;
  campaign?: string;
  revenue: number;
}

interface AttributionPath {
  userId: string;
  userName: string;
  touchPoints: TouchPoint[];
  conversionValue: number;
  conversionTime: string;
  pathLength: number;
  firstTouch: string;
  lastTouch: string;
  attribution: {
    firstTouch: number;
    lastTouch: number;
    linear: number;
    timeDecay: number;
    dataDriver: number;
  };
}

interface AttributionModel {
  model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'data_driven';
  totalRevenue: number;
  channelAttribution: { [key: string]: number };
  campaignAttribution: { [key: string]: number };
}

interface SankeyData {
  nodes: Array<{ name: string }>;
  links: Array<{ source: number; target: number; value: number }>;
}

export function AttributionVisualizer() {
  const [selectedModel, setSelectedModel] = useState<string>('linear');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [attributionPaths, setAttributionPaths] = useState<AttributionPath[]>(
    [],
  );
  const [modelComparison, setModelComparison] = useState<AttributionModel[]>(
    [],
  );
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAttributionData();
  }, [selectedModel, timeRange]);

  const loadAttributionData = async () => {
    try {
      setIsLoading(true);
      const [pathsRes, modelsRes, flowRes] = await Promise.all([
        fetch(
          `/api/marketing/attribution/paths?model=${selectedModel}&range=${timeRange}`,
        ),
        fetch(`/api/marketing/attribution/comparison?range=${timeRange}`),
        fetch(`/api/marketing/attribution/flow?range=${timeRange}`),
      ]);

      if (pathsRes.ok && modelsRes.ok && flowRes.ok) {
        const [pathsData, modelsData, flowData] = await Promise.all([
          pathsRes.json(),
          modelsRes.json(),
          flowRes.json(),
        ]);

        setAttributionPaths(pathsData);
        setModelComparison(modelsData);
        setSankeyData(flowData);
      }
    } catch (error) {
      console.error('Error loading attribution data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'viral':
        return <Share2 className="h-4 w-4" />;
      case 'organic':
        return <Eye className="h-4 w-4" />;
      case 'paid':
        return <DollarSign className="h-4 w-4" />;
      case 'social':
        return <GitBranch className="h-4 w-4" />;
      case 'direct':
        return <MousePointer className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-500';
      case 'viral':
        return 'bg-purple-500';
      case 'organic':
        return 'bg-green-500';
      case 'paid':
        return 'bg-yellow-500';
      case 'social':
        return 'bg-pink-500';
      case 'direct':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <GitBranch className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading attribution data...</p>
        </div>
      </div>
    );
  }

  const modelComparisonData = modelComparison.map((model) => ({
    model: model.model
      .replace('_', ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    revenue: model.totalRevenue,
    email: model.channelAttribution.email || 0,
    viral: model.channelAttribution.viral || 0,
    organic: model.channelAttribution.organic || 0,
    paid: model.channelAttribution.paid || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-600" />
              Multi-Touch Attribution Analysis
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_touch">First Touch</SelectItem>
                  <SelectItem value="last_touch">Last Touch</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="time_decay">Time Decay</SelectItem>
                  <SelectItem value="data_driven">Data Driven</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Model Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Attribution Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Channel Attribution */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Attribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modelComparison[0] &&
                Object.entries(modelComparison[0].channelAttribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([channel, revenue]) => (
                    <div
                      key={channel}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded ${getChannelColor(channel)}`}
                        />
                        <span className="capitalize">{channel}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(revenue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {(
                            (revenue / modelComparison[0].totalRevenue) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Converting Paths */}
        <Card>
          <CardHeader>
            <CardTitle>Top Converting Paths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attributionPaths.slice(0, 5).map((path, index) => (
                <div key={index} className="p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{path.userName}</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(path.conversionValue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {path.touchPoints.slice(0, 5).map((touch, idx) => (
                      <React.Fragment key={idx}>
                        <div className="flex items-center gap-1">
                          {getChannelIcon(touch.type)}
                          {idx < path.touchPoints.length - 1 && idx < 4 && (
                            <span className="text-gray-400">→</span>
                          )}
                        </div>
                      </React.Fragment>
                    ))}
                    {path.touchPoints.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{path.touchPoints.length - 5} more
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{path.pathLength} touches</span>
                    <span>{formatTimeAgo(path.conversionTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attribution Flow Visualization */}
      {sankeyData && (
        <Card>
          <CardHeader>
            <CardTitle>Attribution Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <Sankey
                data={sankeyData}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                link={{ stroke: '#8b5cf6', strokeOpacity: 0.3 }}
                node={{ fill: '#8b5cf6' }}
              >
                <Tooltip />
              </Sankey>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Attribution Paths */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Paths Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attributionPaths.map((path, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{path.userName}</p>
                    <p className="text-sm text-muted-foreground">
                      Converted {formatTimeAgo(path.conversionTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(path.conversionValue)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {path.pathLength} touchpoints
                    </p>
                  </div>
                </div>

                {/* Touch Points Timeline */}
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-3">
                    {path.touchPoints.map((touch, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div
                          className={`relative z-10 w-8 h-8 rounded-full ${getChannelColor(touch.type)} flex items-center justify-center text-white`}
                        >
                          {getChannelIcon(touch.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {touch.type}
                            </span>
                            {touch.campaign && (
                              <Badge variant="outline" className="text-xs">
                                {touch.campaign}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {touch.channel} • {formatTimeAgo(touch.timestamp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatCurrency(
                              (touch.revenue *
                                path.attribution[
                                  selectedModel as keyof typeof path.attribution
                                ]) /
                                100,
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {path.attribution[
                              selectedModel as keyof typeof path.attribution
                            ].toFixed(1)}
                            %
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attribution Model Breakdown */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">
                    Attribution by Model
                  </p>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-muted-foreground">First Touch</p>
                      <p className="font-medium">
                        {path.attribution.firstTouch}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Last Touch</p>
                      <p className="font-medium">
                        {path.attribution.lastTouch}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Linear</p>
                      <p className="font-medium">{path.attribution.linear}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Time Decay</p>
                      <p className="font-medium">
                        {path.attribution.timeDecay}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Data Driven</p>
                      <p className="font-medium">
                        {path.attribution.dataDriver}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
