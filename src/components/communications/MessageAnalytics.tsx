'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AreaChart,
  Area,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Mail,
  MousePointerClick,
  Eye,
  Users,
  Clock,
  Calendar,
  Target,
  Activity,
  Download,
  Filter,
  RefreshCcw,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Smartphone,
  Monitor,
  Globe,
  MessageSquare,
  Share2,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageMetrics {
  id: string;
  campaign_name: string;
  sent_at: Date;
  total_sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  unique_opens: number;
  clicked: number;
  unique_clicks: number;
  replied: number;
  forwarded: number;
  unsubscribed: number;
  marked_spam: number;
  engagement_score: number;
  device_stats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  client_stats: {
    gmail: number;
    outlook: number;
    apple_mail: number;
    other: number;
  };
  link_clicks: {
    url: string;
    clicks: number;
    unique_clicks: number;
  }[];
  geographic_data: {
    country: string;
    opens: number;
    clicks: number;
  }[];
  hourly_activity: {
    hour: number;
    opens: number;
    clicks: number;
  }[];
}

interface MessageAnalyticsProps {
  clientId: string;
  dateRange?: { start: Date; end: Date };
  onExport?: (data: any) => void;
  className?: string;
}

export function MessageAnalytics({
  clientId,
  dateRange,
  onExport,
  className,
}: MessageAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [metrics, setMetrics] = useState<MessageMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  // Mock data generation
  useEffect(() => {
    generateMockMetrics();
  }, [selectedPeriod, selectedCampaign]);

  const generateMockMetrics = () => {
    const mockMetrics: MessageMetrics[] = [
      {
        id: '1',
        campaign_name: 'Save the Date',
        sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        total_sent: 250,
        delivered: 245,
        bounced: 5,
        opened: 180,
        unique_opens: 160,
        clicked: 95,
        unique_clicks: 80,
        replied: 15,
        forwarded: 8,
        unsubscribed: 2,
        marked_spam: 1,
        engagement_score: 78,
        device_stats: { desktop: 120, mobile: 100, tablet: 25 },
        client_stats: { gmail: 110, outlook: 80, apple_mail: 45, other: 10 },
        link_clicks: [
          { url: 'Wedding Website', clicks: 45, unique_clicks: 40 },
          { url: 'RSVP Form', clicks: 30, unique_clicks: 28 },
          { url: 'Registry', clicks: 20, unique_clicks: 18 },
        ],
        geographic_data: [
          { country: 'USA', opens: 140, clicks: 70 },
          { country: 'UK', opens: 25, clicks: 15 },
          { country: 'Canada', opens: 15, clicks: 10 },
        ],
        hourly_activity: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          opens: Math.floor(Math.random() * 20),
          clicks: Math.floor(Math.random() * 10),
        })),
      },
      {
        id: '2',
        campaign_name: 'RSVP Reminder',
        sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        total_sent: 180,
        delivered: 178,
        bounced: 2,
        opened: 150,
        unique_opens: 140,
        clicked: 120,
        unique_clicks: 110,
        replied: 45,
        forwarded: 5,
        unsubscribed: 1,
        marked_spam: 0,
        engagement_score: 85,
        device_stats: { desktop: 90, mobile: 75, tablet: 13 },
        client_stats: { gmail: 85, outlook: 60, apple_mail: 28, other: 5 },
        link_clicks: [
          { url: 'RSVP Form', clicks: 85, unique_clicks: 80 },
          { url: 'Contact Us', clicks: 25, unique_clicks: 22 },
          { url: 'FAQ', clicks: 10, unique_clicks: 8 },
        ],
        geographic_data: [
          { country: 'USA', opens: 120, clicks: 95 },
          { country: 'UK', opens: 20, clicks: 18 },
          { country: 'Canada', opens: 10, clicks: 7 },
        ],
        hourly_activity: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          opens: Math.floor(Math.random() * 15),
          clicks: Math.floor(Math.random() * 12),
        })),
      },
    ];
    setMetrics(mockMetrics);
  };

  const aggregatedMetrics = useMemo(() => {
    const totals = metrics.reduce(
      (acc, metric) => ({
        sent: acc.sent + metric.total_sent,
        delivered: acc.delivered + metric.delivered,
        opened: acc.opened + metric.opened,
        clicked: acc.clicked + metric.clicked,
        replied: acc.replied + metric.replied,
        unsubscribed: acc.unsubscribed + metric.unsubscribed,
      }),
      {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        unsubscribed: 0,
      },
    );

    return {
      ...totals,
      deliveryRate:
        totals.sent > 0
          ? ((totals.delivered / totals.sent) * 100).toFixed(1)
          : '0',
      openRate:
        totals.delivered > 0
          ? ((totals.opened / totals.delivered) * 100).toFixed(1)
          : '0',
      clickRate:
        totals.opened > 0
          ? ((totals.clicked / totals.opened) * 100).toFixed(1)
          : '0',
      replyRate:
        totals.delivered > 0
          ? ((totals.replied / totals.delivered) * 100).toFixed(1)
          : '0',
      unsubscribeRate:
        totals.delivered > 0
          ? ((totals.unsubscribed / totals.delivered) * 100).toFixed(1)
          : '0',
    };
  }, [metrics]);

  const timelineData = useMemo(() => {
    const dates = new Map();
    metrics.forEach((metric) => {
      const date = metric.sent_at.toLocaleDateString();
      if (!dates.has(date)) {
        dates.set(date, { date, sent: 0, opened: 0, clicked: 0 });
      }
      const data = dates.get(date);
      data.sent += metric.total_sent;
      data.opened += metric.opened;
      data.clicked += metric.clicked;
    });
    return Array.from(dates.values());
  }, [metrics]);

  const deviceData = useMemo(() => {
    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    metrics.forEach((metric) => {
      devices.desktop += metric.device_stats.desktop;
      devices.mobile += metric.device_stats.mobile;
      devices.tablet += metric.device_stats.tablet;
    });
    return [
      { name: 'Desktop', value: devices.desktop, icon: Monitor },
      { name: 'Mobile', value: devices.mobile, icon: Smartphone },
      { name: 'Tablet', value: devices.tablet, icon: Monitor },
    ];
  }, [metrics]);

  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      opens: 0,
      clicks: 0,
    }));

    metrics.forEach((metric) => {
      metric.hourly_activity.forEach((activity, index) => {
        hours[index].opens += activity.opens;
        hours[index].clicks += activity.clicks;
      });
    });

    return hours;
  }, [metrics]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      generateMockMetrics();
      setIsLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    const exportData = {
      metrics,
      aggregated: aggregatedMetrics,
      timeline: timelineData,
      devices: deviceData,
      hourlyActivity,
      exportDate: new Date().toISOString(),
    };
    onExport?.(exportData);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Message Analytics
              </CardTitle>
              <CardDescription>
                Track engagement and performance of your communications
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">24 Hours</SelectItem>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                  <SelectItem value="90days">90 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCcw
                  className={cn('h-4 w-4', isLoading && 'animate-spin')}
                />
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedMetrics.sent}</div>
            <p className="text-xs text-muted-foreground">Total messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregatedMetrics.delivered}
            </div>
            <div className="flex items-center text-xs">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              <span>{aggregatedMetrics.deliveryRate}% rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedMetrics.opened}</div>
            <div className="flex items-center text-xs">
              <Eye className="h-3 w-3 text-blue-500 mr-1" />
              <span>{aggregatedMetrics.openRate}% rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clicked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregatedMetrics.clicked}
            </div>
            <div className="flex items-center text-xs">
              <MousePointerClick className="h-3 w-3 text-purple-500 mr-1" />
              <span>{aggregatedMetrics.clickRate}% rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Replied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregatedMetrics.replied}
            </div>
            <div className="flex items-center text-xs">
              <MessageSquare className="h-3 w-3 text-green-500 mr-1" />
              <span>{aggregatedMetrics.replyRate}% rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unsubscribed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregatedMetrics.unsubscribed}
            </div>
            <div className="flex items-center text-xs">
              <XCircle className="h-3 w-3 text-red-500 mr-1" />
              <span>{aggregatedMetrics.unsubscribeRate}% rate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="engagement" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="links">Link Tracking</TabsTrigger>
              <TabsTrigger value="geographic">Geographic</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="engagement" className="space-y-6 mt-0">
                {/* Engagement Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Funnel</CardTitle>
                    <CardDescription>
                      Track how recipients interact with your messages
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Delivered</span>
                          <span className="text-sm font-medium">
                            {aggregatedMetrics.delivered} (
                            {aggregatedMetrics.deliveryRate}%)
                          </span>
                        </div>
                        <Progress
                          value={parseFloat(aggregatedMetrics.deliveryRate)}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Opened</span>
                          <span className="text-sm font-medium">
                            {aggregatedMetrics.opened} (
                            {aggregatedMetrics.openRate}%)
                          </span>
                        </div>
                        <Progress
                          value={parseFloat(aggregatedMetrics.openRate)}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Clicked</span>
                          <span className="text-sm font-medium">
                            {aggregatedMetrics.clicked} (
                            {aggregatedMetrics.clickRate}%)
                          </span>
                        </div>
                        <Progress
                          value={parseFloat(aggregatedMetrics.clickRate)}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Replied</span>
                          <span className="text-sm font-medium">
                            {aggregatedMetrics.replied} (
                            {aggregatedMetrics.replyRate}%)
                          </span>
                        </div>
                        <Progress
                          value={parseFloat(aggregatedMetrics.replyRate)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly Activity Heatmap */}
                <Card>
                  <CardHeader>
                    <CardTitle>Hourly Activity</CardTitle>
                    <CardDescription>Best times for engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={hourlyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="opens"
                          stackId="1"
                          stroke="#8884d8"
                          fill="#8884d8"
                        />
                        <Area
                          type="monotone"
                          dataKey="clicks"
                          stackId="1"
                          stroke="#82ca9d"
                          fill="#82ca9d"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                    <CardDescription>
                      Track trends in message engagement
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="sent" stroke="#8884d8" />
                        <Line
                          type="monotone"
                          dataKey="opened"
                          stroke="#82ca9d"
                        />
                        <Line
                          type="monotone"
                          dataKey="clicked"
                          stroke="#ffc658"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="devices" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Distribution</CardTitle>
                      <CardDescription>
                        How recipients view your messages
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={deviceData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {deviceData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Email Clients</CardTitle>
                      <CardDescription>Popular email providers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Gmail</span>
                          <div className="flex items-center gap-2">
                            <Progress value={45} className="w-24" />
                            <span className="text-sm font-medium">45%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Outlook</span>
                          <div className="flex items-center gap-2">
                            <Progress value={30} className="w-24" />
                            <span className="text-sm font-medium">30%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Apple Mail</span>
                          <div className="flex items-center gap-2">
                            <Progress value={20} className="w-24" />
                            <span className="text-sm font-medium">20%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Other</span>
                          <div className="flex items-center gap-2">
                            <Progress value={5} className="w-24" />
                            <span className="text-sm font-medium">5%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="links" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Link Performance</CardTitle>
                    <CardDescription>
                      Track which links get the most engagement
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics[0]?.link_clicks.map((link, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              {link.url}
                            </span>
                            <Badge variant="secondary">
                              {link.clicks} clicks
                            </Badge>
                          </div>
                          <Progress
                            value={
                              (link.clicks /
                                Math.max(
                                  ...metrics[0].link_clicks.map(
                                    (l) => l.clicks,
                                  ),
                                )) *
                              100
                            }
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{link.unique_clicks} unique clicks</span>
                            <span>
                              {(
                                (link.unique_clicks / link.clicks) *
                                100
                              ).toFixed(0)}
                              % unique rate
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="geographic" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Geographic Distribution</CardTitle>
                    <CardDescription>
                      Where your messages are being opened
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={metrics[0]?.geographic_data || []}
                        layout="horizontal"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="country" type="category" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="opens" fill="#8884d8" />
                        <Bar dataKey="clicks" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="campaigns" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                    <CardDescription>
                      Compare performance across different campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics.map((metric) => (
                        <Card key={metric.id}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <CardTitle className="text-base">
                                  {metric.campaign_name}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  Sent {metric.sent_at.toLocaleDateString()}
                                </CardDescription>
                              </div>
                              <Badge
                                variant={
                                  metric.engagement_score > 80
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                Score: {metric.engagement_score}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-6 gap-4 text-center">
                              <div>
                                <p className="text-2xl font-bold">
                                  {metric.total_sent}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Sent
                                </p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {(
                                    (metric.delivered / metric.total_sent) *
                                    100
                                  ).toFixed(0)}
                                  %
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Delivered
                                </p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {(
                                    (metric.opened / metric.delivered) *
                                    100
                                  ).toFixed(0)}
                                  %
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Opened
                                </p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {(
                                    (metric.clicked / metric.opened) *
                                    100
                                  ).toFixed(0)}
                                  %
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Clicked
                                </p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {metric.replied}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Replied
                                </p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {metric.unsubscribed}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Unsub
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Real-time Indicator */}
      {isRealtime && (
        <Card>
          <CardContent className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Real-time data updates enabled
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
