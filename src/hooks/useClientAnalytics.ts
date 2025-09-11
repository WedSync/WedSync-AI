'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// Types for analytics data structures
interface EngagementData {
  dailyStats: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
    avgSessionDuration: number;
  }>;
  summary: {
    totalUsers: number;
    totalSessions: number;
    totalPageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
    returnUserRate: number;
  };
  topPages: Array<{
    page: string;
    views: number;
    avgTime: number;
    exitRate: number;
  }>;
  userSegments: Array<{
    segment: string;
    count: number;
    avgEngagement: number;
  }>;
}

interface FeatureUsageData {
  features: Array<{
    name: string;
    icon: string;
    totalUsage: number;
    activeUsers: number;
    avgTimeSpent: number;
    adoptionRate: number;
    retentionRate: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    photoGallery: number;
    timeline: number;
    tasks: number;
    messaging: number;
    documents: number;
    vendors: number;
  }>;
  userAdoption: {
    newUsers: number;
    returningUsers: number;
    superUsers: number;
  };
  featureCorrelations: Array<{
    feature1: string;
    feature2: string;
    correlation: number;
  }>;
}

interface CommunicationData {
  summary: {
    totalMessages: number;
    emailsSent: number;
    notificationsSent: number;
    avgResponseTime: number;
    openRate: number;
    responseRate: number;
    engagementScore: number;
  };
  channelPerformance: Array<{
    channel: string;
    sent: number;
    delivered: number;
    opened: number;
    responded: number;
    deliveryRate: number;
    openRate: number;
    responseRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    messagesSent: number;
    messagesOpened: number;
    messagesResponded: number;
    avgResponseTime: number;
  }>;
  topPerformingMessages: Array<{
    subject: string;
    type: string;
    sent: number;
    openRate: number;
    responseRate: number;
    engagement: number;
  }>;
  clientEngagement: Array<{
    clientId: string;
    clientName: string;
    messagesReceived: number;
    messagesOpened: number;
    messagesResponded: number;
    avgResponseTime: number;
    engagementLevel: 'high' | 'medium' | 'low';
  }>;
  responseTimeDistribution: Array<{
    timeRange: string;
    count: number;
    percentage: number;
  }>;
}

interface JourneyData {
  stages: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    avgTimeToComplete: number;
    completionRate: number;
    dropoffRate: number;
    clientsInStage: number;
    avgEngagement: number;
  }>;
  funnelData: Array<{
    stage: string;
    clients: number;
    completionRate: number;
    avgTime: number;
  }>;
  timeToCompletion: Array<{
    stage: string;
    avgDays: number;
    medianDays: number;
    percentile90: number;
  }>;
  journeyMetrics: {
    totalClients: number;
    completedJourney: number;
    averageJourneyTime: number;
    dropoffPoints: Array<{
      stage: string;
      dropoffRate: number;
      commonReasons: string[];
    }>;
  };
  cohortAnalysis: Array<{
    cohort: string;
    startedJourney: number;
    completedJourney: number;
    avgTimeToComplete: number;
    satisfactionScore: number;
  }>;
  milestoneEngagement: Array<{
    milestone: string;
    engagementLevel: number;
    completionRate: number;
    clientFeedback: number;
  }>;
}

interface ClientAnalyticsData {
  engagement: EngagementData;
  features: FeatureUsageData;
  communication: CommunicationData;
  journey: JourneyData;
  overview?: any;
  lastUpdated: string;
}

interface UseClientAnalyticsOptions {
  supplierId?: string;
  timeRange: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Cache implementation for client analytics
class ClientAnalyticsCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  invalidate(pattern: string) {
    const keys = Array.from(this.cache.keys()).filter((key) =>
      key.includes(pattern),
    );
    keys.forEach((key) => this.cache.delete(key));
  }
}

const analyticsCache = new ClientAnalyticsCache();

// Generate mock data for development/testing
const generateMockData = (timeRange: string): ClientAnalyticsData => {
  const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const dates = Array.from({ length: daysCount }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (daysCount - 1 - i));
    return date.toISOString().split('T')[0];
  });

  const mockEngagementData: EngagementData = {
    dailyStats: dates.map((date) => ({
      date,
      activeUsers: Math.floor(Math.random() * 100) + 50,
      sessions: Math.floor(Math.random() * 200) + 100,
      pageViews: Math.floor(Math.random() * 500) + 200,
      avgSessionDuration: Math.floor(Math.random() * 300) + 120,
    })),
    summary: {
      totalUsers: 1248,
      totalSessions: 3456,
      totalPageViews: 12456,
      avgSessionDuration: 420,
      bounceRate: 32.5,
      returnUserRate: 67.8,
    },
    topPages: [
      { page: 'Photo Gallery', views: 3456, avgTime: 180, exitRate: 25 },
      { page: 'Timeline', views: 2345, avgTime: 120, exitRate: 35 },
      { page: 'Tasks', views: 1876, avgTime: 90, exitRate: 28 },
      { page: 'Messages', views: 1654, avgTime: 150, exitRate: 22 },
      { page: 'Vendors', views: 987, avgTime: 75, exitRate: 45 },
    ],
    userSegments: [
      { segment: 'High Engagement', count: 456, avgEngagement: 8.5 },
      { segment: 'Medium Engagement', count: 623, avgEngagement: 6.2 },
      { segment: 'Low Engagement', count: 169, avgEngagement: 3.1 },
    ],
  };

  const mockFeatureData: FeatureUsageData = {
    features: [
      {
        name: 'Photo Gallery',
        icon: 'camera',
        totalUsage: 3456,
        activeUsers: 987,
        avgTimeSpent: 180,
        adoptionRate: 87,
        retentionRate: 92,
        trend: 'up',
        trendValue: 12,
      },
      {
        name: 'Timeline',
        icon: 'calendar',
        totalUsage: 2345,
        activeUsers: 765,
        avgTimeSpent: 120,
        adoptionRate: 73,
        retentionRate: 85,
        trend: 'up',
        trendValue: 8,
      },
      {
        name: 'Task Checklist',
        icon: 'check',
        totalUsage: 1876,
        activeUsers: 654,
        avgTimeSpent: 90,
        adoptionRate: 68,
        retentionRate: 78,
        trend: 'up',
        trendValue: 15,
      },
      {
        name: 'Messaging',
        icon: 'message',
        totalUsage: 1654,
        activeUsers: 543,
        avgTimeSpent: 150,
        adoptionRate: 61,
        retentionRate: 82,
        trend: 'up',
        trendValue: 22,
      },
      {
        name: 'Documents',
        icon: 'file',
        totalUsage: 987,
        activeUsers: 432,
        avgTimeSpent: 75,
        adoptionRate: 45,
        retentionRate: 71,
        trend: 'stable',
        trendValue: 2,
      },
      {
        name: 'Vendor Directory',
        icon: 'users',
        totalUsage: 765,
        activeUsers: 321,
        avgTimeSpent: 60,
        adoptionRate: 38,
        retentionRate: 65,
        trend: 'down',
        trendValue: -5,
      },
    ],
    timeSeriesData: dates.map((date) => ({
      date,
      photoGallery: Math.floor(Math.random() * 50) + 20,
      timeline: Math.floor(Math.random() * 40) + 15,
      tasks: Math.floor(Math.random() * 35) + 10,
      messaging: Math.floor(Math.random() * 30) + 10,
      documents: Math.floor(Math.random() * 25) + 5,
      vendors: Math.floor(Math.random() * 20) + 3,
    })),
    userAdoption: {
      newUsers: 234,
      returningUsers: 756,
      superUsers: 258,
    },
    featureCorrelations: [
      { feature1: 'Photo Gallery', feature2: 'Timeline', correlation: 0.78 },
      { feature1: 'Tasks', feature2: 'Messaging', correlation: 0.65 },
      { feature1: 'Documents', feature2: 'Vendors', correlation: 0.45 },
    ],
  };

  const mockCommunicationData: CommunicationData = {
    summary: {
      totalMessages: 5643,
      emailsSent: 3456,
      notificationsSent: 2187,
      avgResponseTime: 145,
      openRate: 72.5,
      responseRate: 34.8,
      engagementScore: 7.8,
    },
    channelPerformance: [
      {
        channel: 'Email',
        sent: 3456,
        delivered: 3398,
        opened: 2465,
        responded: 1203,
        deliveryRate: 98.3,
        openRate: 72.5,
        responseRate: 48.8,
      },
      {
        channel: 'Portal Messages',
        sent: 2187,
        delivered: 2187,
        opened: 1745,
        responded: 892,
        deliveryRate: 100,
        openRate: 79.8,
        responseRate: 51.1,
      },
      {
        channel: 'SMS',
        sent: 892,
        delivered: 876,
        opened: 654,
        responded: 234,
        deliveryRate: 98.2,
        openRate: 74.7,
        responseRate: 35.8,
      },
      {
        channel: 'Push Notifications',
        sent: 1543,
        delivered: 1487,
        opened: 897,
        responded: 345,
        deliveryRate: 96.4,
        openRate: 60.3,
        responseRate: 38.5,
      },
    ],
    timeSeriesData: dates.map((date) => ({
      date,
      messagesSent: Math.floor(Math.random() * 50) + 20,
      messagesOpened: Math.floor(Math.random() * 40) + 15,
      messagesResponded: Math.floor(Math.random() * 20) + 5,
      avgResponseTime: Math.floor(Math.random() * 100) + 50,
    })),
    topPerformingMessages: [
      {
        subject: 'Your wedding timeline is ready!',
        type: 'Timeline Update',
        sent: 456,
        openRate: 85.2,
        responseRate: 67.3,
        engagement: 89,
      },
      {
        subject: 'Payment reminder - Due in 3 days',
        type: 'Payment',
        sent: 234,
        openRate: 78.4,
        responseRate: 45.7,
        engagement: 76,
      },
      {
        subject: 'New photos added to your gallery',
        type: 'Photo Update',
        sent: 345,
        openRate: 82.1,
        responseRate: 52.8,
        engagement: 82,
      },
    ],
    clientEngagement: [
      {
        clientId: '1',
        clientName: 'Sarah & Mike Johnson',
        messagesReceived: 23,
        messagesOpened: 21,
        messagesResponded: 18,
        avgResponseTime: 45,
        engagementLevel: 'high',
      },
      {
        clientId: '2',
        clientName: 'Emily & David Chen',
        messagesReceived: 18,
        messagesOpened: 15,
        messagesResponded: 12,
        avgResponseTime: 78,
        engagementLevel: 'high',
      },
      {
        clientId: '3',
        clientName: 'Jessica & Tom Wilson',
        messagesReceived: 15,
        messagesOpened: 12,
        messagesResponded: 8,
        avgResponseTime: 156,
        engagementLevel: 'medium',
      },
      {
        clientId: '4',
        clientName: 'Amanda & Chris Brown',
        messagesReceived: 12,
        messagesOpened: 8,
        messagesResponded: 3,
        avgResponseTime: 345,
        engagementLevel: 'low',
      },
    ],
    responseTimeDistribution: [
      { timeRange: 'Within 1 hour', count: 234, percentage: 45.2 },
      { timeRange: '1-4 hours', count: 123, percentage: 23.8 },
      { timeRange: '4-24 hours', count: 89, percentage: 17.2 },
      { timeRange: '1-3 days', count: 45, percentage: 8.7 },
      { timeRange: 'Over 3 days', count: 26, percentage: 5.0 },
    ],
  };

  const mockJourneyData: JourneyData = {
    stages: [
      {
        id: '1',
        name: 'Initial Contact',
        description: 'First interaction with client',
        icon: 'users',
        avgTimeToComplete: 1,
        completionRate: 98,
        dropoffRate: 2,
        clientsInStage: 45,
        avgEngagement: 8.5,
      },
      {
        id: '2',
        name: 'Onboarding',
        description: 'Portal setup and initial planning',
        icon: 'heart',
        avgTimeToComplete: 3,
        completionRate: 92,
        dropoffRate: 8,
        clientsInStage: 78,
        avgEngagement: 7.8,
      },
      {
        id: '3',
        name: 'Planning Phase',
        description: 'Active wedding planning',
        icon: 'calendar',
        avgTimeToComplete: 14,
        completionRate: 87,
        dropoffRate: 13,
        clientsInStage: 156,
        avgEngagement: 8.2,
      },
      {
        id: '4',
        name: 'Vendor Selection',
        description: 'Choosing wedding vendors',
        icon: 'camera',
        avgTimeToComplete: 21,
        completionRate: 78,
        dropoffRate: 22,
        clientsInStage: 234,
        avgEngagement: 7.5,
      },
      {
        id: '5',
        name: 'Final Details',
        description: 'Last-minute preparations',
        icon: 'cake',
        avgTimeToComplete: 7,
        completionRate: 94,
        dropoffRate: 6,
        clientsInStage: 89,
        avgEngagement: 8.7,
      },
      {
        id: '6',
        name: 'Wedding Day',
        description: 'The big day execution',
        icon: 'music',
        avgTimeToComplete: 1,
        completionRate: 99,
        dropoffRate: 1,
        clientsInStage: 12,
        avgEngagement: 9.8,
      },
      {
        id: '7',
        name: 'Post-Wedding',
        description: 'Follow-up and feedback',
        icon: 'check',
        avgTimeToComplete: 14,
        completionRate: 85,
        dropoffRate: 15,
        clientsInStage: 67,
        avgEngagement: 7.2,
      },
    ],
    funnelData: [
      {
        stage: 'Initial Contact',
        clients: 1000,
        completionRate: 98,
        avgTime: 1,
      },
      { stage: 'Onboarding', clients: 980, completionRate: 92, avgTime: 3 },
      {
        stage: 'Planning Phase',
        clients: 901,
        completionRate: 87,
        avgTime: 14,
      },
      {
        stage: 'Vendor Selection',
        clients: 784,
        completionRate: 78,
        avgTime: 21,
      },
      { stage: 'Final Details', clients: 612, completionRate: 94, avgTime: 7 },
      { stage: 'Wedding Day', clients: 575, completionRate: 99, avgTime: 1 },
      { stage: 'Post-Wedding', clients: 569, completionRate: 85, avgTime: 14 },
    ],
    timeToCompletion: [
      { stage: 'Initial Contact', avgDays: 1, medianDays: 1, percentile90: 2 },
      { stage: 'Onboarding', avgDays: 3, medianDays: 2, percentile90: 7 },
      {
        stage: 'Planning Phase',
        avgDays: 14,
        medianDays: 12,
        percentile90: 28,
      },
      {
        stage: 'Vendor Selection',
        avgDays: 21,
        medianDays: 18,
        percentile90: 42,
      },
      { stage: 'Final Details', avgDays: 7, medianDays: 5, percentile90: 14 },
      { stage: 'Wedding Day', avgDays: 1, medianDays: 1, percentile90: 1 },
      { stage: 'Post-Wedding', avgDays: 14, medianDays: 10, percentile90: 30 },
    ],
    journeyMetrics: {
      totalClients: 1000,
      completedJourney: 484,
      averageJourneyTime: 90,
      dropoffPoints: [
        {
          stage: 'Vendor Selection',
          dropoffRate: 22,
          commonReasons: [
            'Too many options',
            'Budget constraints',
            'Timeline pressure',
          ],
        },
        {
          stage: 'Post-Wedding',
          dropoffRate: 15,
          commonReasons: ['Honeymoon', 'Moving', 'Life changes'],
        },
      ],
    },
    cohortAnalysis: [
      {
        cohort: 'Q1 2024',
        startedJourney: 245,
        completedJourney: 187,
        avgTimeToComplete: 85,
        satisfactionScore: 8.2,
      },
      {
        cohort: 'Q2 2024',
        startedJourney: 289,
        completedJourney: 234,
        avgTimeToComplete: 92,
        satisfactionScore: 8.5,
      },
      {
        cohort: 'Q3 2024',
        startedJourney: 312,
        completedJourney: 245,
        avgTimeToComplete: 88,
        satisfactionScore: 8.7,
      },
      {
        cohort: 'Q4 2024',
        startedJourney: 154,
        completedJourney: 98,
        avgTimeToComplete: 95,
        satisfactionScore: 8.1,
      },
    ],
    milestoneEngagement: [
      {
        milestone: 'Contract Signed',
        engagementLevel: 9.2,
        completionRate: 98,
        clientFeedback: 8.8,
      },
      {
        milestone: 'First Planning Meeting',
        engagementLevel: 8.7,
        completionRate: 94,
        clientFeedback: 8.5,
      },
      {
        milestone: 'Vendor Selections Made',
        engagementLevel: 7.8,
        completionRate: 87,
        clientFeedback: 8.1,
      },
      {
        milestone: 'Timeline Finalized',
        engagementLevel: 8.9,
        completionRate: 96,
        clientFeedback: 8.9,
      },
      {
        milestone: 'Final Walkthrough',
        engagementLevel: 9.1,
        completionRate: 99,
        clientFeedback: 9.2,
      },
      {
        milestone: 'Wedding Day',
        engagementLevel: 9.8,
        completionRate: 100,
        clientFeedback: 9.7,
      },
    ],
  };

  return {
    engagement: mockEngagementData,
    features: mockFeatureData,
    communication: mockCommunicationData,
    journey: mockJourneyData,
    lastUpdated: new Date().toISOString(),
  };
};

export function useClientAnalytics({
  supplierId,
  timeRange,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
}: UseClientAnalyticsOptions) {
  const [data, setData] = useState<ClientAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = useMemo(
    () => `client_analytics_${supplierId || 'all'}_${timeRange}`,
    [supplierId, timeRange],
  );

  const fetchData = useCallback(async () => {
    // Check cache first
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData && !loading) {
      setData(cachedData);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would be API calls
      // For now, we'll use mock data generation
      if (process.env.NODE_ENV === 'development' || !supplierId) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockData = generateMockData(timeRange);
        analyticsCache.set(cacheKey, mockData);
        setData(mockData);
      } else {
        // Production API calls would go here
        const endpoints = [
          `/api/analytics/client-portal/engagement?supplierId=${supplierId}&timeRange=${timeRange}`,
          `/api/analytics/client-portal/features?supplierId=${supplierId}&timeRange=${timeRange}`,
          `/api/analytics/client-portal/communication?supplierId=${supplierId}&timeRange=${timeRange}`,
          `/api/analytics/client-portal/journey?supplierId=${supplierId}&timeRange=${timeRange}`,
        ];

        const responses = await Promise.all(
          endpoints.map((endpoint) => fetch(endpoint)),
        );

        const results = await Promise.all(
          responses.map((response) => response.json()),
        );

        const analyticsData: ClientAnalyticsData = {
          engagement: results[0].data,
          features: results[1].data,
          communication: results[2].data,
          journey: results[3].data,
          lastUpdated: new Date().toISOString(),
        };

        analyticsCache.set(cacheKey, analyticsData);
        setData(analyticsData);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(errorMessage);
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, supplierId, timeRange, loading]);

  const refresh = useCallback(() => {
    analyticsCache.invalidate(cacheKey);
    fetchData();
  }, [cacheKey, fetchData]);

  const exportData = useCallback(
    (section: string) => {
      if (!data) return;

      const exportableData = {
        ...data,
        exportedAt: new Date().toISOString(),
        section,
        timeRange,
        supplierId,
      };

      const blob = new Blob([JSON.stringify(exportableData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `client-analytics-${section}-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);
    },
    [data, timeRange, supplierId],
  );

  // Auto-refresh effect
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      // Don't clear cache on unmount, let it expire naturally
      // This allows for better performance when navigating between views
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    exportData,
    cacheKey,
  };
}
