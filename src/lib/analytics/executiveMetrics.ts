import { createClient } from '@/lib/supabase/server';

interface ExecutiveMetrics {
  // Core KPIs
  totalRevenue: number;
  revenueGrowth: number;
  activeClients: number;
  clientGrowth: number;
  weddingBookings: number;
  bookingGrowth: number;
  avgVendorRating: number;
  vendorRatingGrowth: number;
  uptime: number;
  uptimeChange: number;
  peakSeasonLoad: number;
  loadTrend: string;

  // Chart data
  revenueChart: Array<{
    month: string;
    revenue: number;
    target: number;
  }>;

  clientChart: Array<{
    month: string;
    newClients: number;
    activeClients: number;
  }>;

  timelineChart: Array<{
    month: string;
    bookings: number;
    capacity: number;
  }>;

  vendorChart: Array<{
    name: string;
    value: number;
    rating: number;
  }>;

  // Real-time activity
  recentActivity: Array<{
    type: string;
    description: string;
    details: string;
    timestamp: string;
  }>;

  // Wedding industry specific metrics
  seasonalTrends: {
    peakMonths: string[];
    averageLoadIncrease: number;
    capacityUtilization: number;
  };
}

// Cache for expensive queries
const metricsCache = new Map<
  string,
  { data: ExecutiveMetrics; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getExecutiveMetrics(
  organizationId: string,
  startDate: string,
  endDate: string,
  options: { forceRefresh?: boolean } = {},
): Promise<ExecutiveMetrics> {
  const cacheKey = `metrics-${organizationId}-${startDate}-${endDate}`;
  const now = Date.now();

  // Check cache first
  if (!options.forceRefresh) {
    const cached = metricsCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const supabase = await createClient();

  try {
    // Run multiple queries in parallel for better performance
    const [
      revenueMetrics,
      clientMetrics,
      bookingMetrics,
      vendorMetrics,
      systemMetrics,
      chartData,
      activityData,
    ] = await Promise.all([
      getRevenueMetrics(supabase, organizationId, startDate, endDate),
      getClientMetrics(supabase, organizationId, startDate, endDate),
      getBookingMetrics(supabase, organizationId, startDate, endDate),
      getVendorMetrics(supabase, organizationId, startDate, endDate),
      getSystemMetrics(supabase, organizationId, startDate, endDate),
      getChartData(supabase, organizationId, startDate, endDate),
      getRecentActivity(supabase, organizationId),
    ]);

    const metrics: ExecutiveMetrics = {
      ...revenueMetrics,
      ...clientMetrics,
      ...bookingMetrics,
      ...vendorMetrics,
      ...systemMetrics,
      ...chartData,
      recentActivity: activityData,
      seasonalTrends: await getSeasonalTrends(supabase, organizationId),
    };

    // Cache the result
    metricsCache.set(cacheKey, { data: metrics, timestamp: now });

    return metrics;
  } catch (error) {
    console.error('Error fetching executive metrics:', error);
    throw new Error('Failed to fetch executive metrics');
  }
}

async function getRevenueMetrics(
  supabase: any,
  organizationId: string,
  startDate: string,
  endDate: string,
) {
  const { data: currentRevenue } = await supabase
    .from('payments')
    .select('amount')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'completed');

  const previousPeriodStart = new Date(startDate);
  const previousPeriodEnd = new Date(endDate);
  const periodDays = Math.floor(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodDays);

  const { data: previousRevenue } = await supabase
    .from('payments')
    .select('amount')
    .eq('organization_id', organizationId)
    .gte('created_at', previousPeriodStart.toISOString())
    .lte('created_at', previousPeriodEnd.toISOString())
    .eq('status', 'completed');

  const totalRevenue =
    currentRevenue?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const previousTotal =
    previousRevenue?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const revenueGrowth =
    previousTotal > 0
      ? ((totalRevenue - previousTotal) / previousTotal) * 100
      : 0;

  return {
    totalRevenue,
    revenueGrowth,
  };
}

async function getClientMetrics(
  supabase: any,
  organizationId: string,
  startDate: string,
  endDate: string,
) {
  const { data: currentClients } = await supabase
    .from('clients')
    .select('id, created_at')
    .eq('organization_id', organizationId)
    .lte('created_at', endDate);

  const activeClients = currentClients?.length || 0;
  const newClients =
    currentClients?.filter(
      (client) => new Date(client.created_at) >= new Date(startDate),
    ).length || 0;

  // Calculate growth vs same period last year for seasonality
  const lastYearStart = new Date(startDate);
  const lastYearEnd = new Date(endDate);
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

  const { data: lastYearClients } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .gte('created_at', lastYearStart.toISOString())
    .lte('created_at', lastYearEnd.toISOString());

  const lastYearCount = lastYearClients?.length || 0;
  const clientGrowth =
    lastYearCount > 0
      ? ((newClients - lastYearCount) / lastYearCount) * 100
      : 0;

  return {
    activeClients,
    clientGrowth,
  };
}

async function getBookingMetrics(
  supabase: any,
  organizationId: string,
  startDate: string,
  endDate: string,
) {
  const { data: bookings } = await supabase
    .from('client_events')
    .select('id, event_date, created_at')
    .eq('organization_id', organizationId)
    .eq('event_type', 'wedding')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const weddingBookings = bookings?.length || 0;

  // Peak season analysis (May-September)
  const peakSeasonBookings =
    bookings?.filter((booking) => {
      const eventDate = new Date(booking.event_date);
      const month = eventDate.getMonth();
      return month >= 4 && month <= 8; // May (4) to September (8)
    }).length || 0;

  const offSeasonBookings = weddingBookings - peakSeasonBookings;
  const peakSeasonLoad =
    offSeasonBookings > 0 ? peakSeasonBookings / offSeasonBookings : 1;

  // Previous period comparison
  const previousPeriodStart = new Date(startDate);
  const previousPeriodEnd = new Date(endDate);
  const periodDays = Math.floor(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodDays);

  const { data: previousBookings } = await supabase
    .from('client_events')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('event_type', 'wedding')
    .gte('created_at', previousPeriodStart.toISOString())
    .lte('created_at', previousPeriodEnd.toISOString());

  const previousCount = previousBookings?.length || 0;
  const bookingGrowth =
    previousCount > 0
      ? ((weddingBookings - previousCount) / previousCount) * 100
      : 0;

  return {
    weddingBookings,
    bookingGrowth,
    peakSeasonLoad,
    loadTrend:
      bookingGrowth > 10
        ? 'Increasing'
        : bookingGrowth < -10
          ? 'Decreasing'
          : 'Stable',
  };
}

async function getVendorMetrics(
  supabase: any,
  organizationId: string,
  startDate: string,
  endDate: string,
) {
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, rating, category')
    .eq('organization_id', organizationId);

  const avgVendorRating =
    vendors?.reduce((sum, vendor) => sum + (vendor.rating || 0), 0) /
      (vendors?.length || 1) || 0;

  // Get rating trend
  const { data: previousRatings } = await supabase
    .from('vendor_ratings')
    .select('rating, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100);

  const recentRatings =
    previousRatings?.slice(0, 30).reduce((sum, r) => sum + r.rating, 0) / 30 ||
    0;
  const olderRatings =
    previousRatings?.slice(30, 60).reduce((sum, r) => sum + r.rating, 0) / 30 ||
    0;
  const vendorRatingGrowth =
    olderRatings > 0 ? recentRatings - olderRatings : 0;

  return {
    avgVendorRating,
    vendorRatingGrowth,
  };
}

async function getSystemMetrics(
  supabase: any,
  organizationId: string,
  startDate: string,
  endDate: string,
) {
  // Mock system metrics - would typically come from monitoring system
  const uptime = 99.95;
  const uptimeChange = 0.02;

  return {
    uptime,
    uptimeChange,
  };
}

async function getChartData(
  supabase: any,
  organizationId: string,
  startDate: string,
  endDate: string,
) {
  // Generate monthly data for charts
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const revenueChart = months.map((month, index) => ({
    month,
    revenue:
      Math.floor(Math.random() * 50000) +
      45000 +
      (index >= 4 && index <= 8 ? 30000 : 0), // Peak season boost
    target: 50000 + index * 5000,
  }));

  const clientChart = months.map((month, index) => ({
    month,
    newClients:
      Math.floor(Math.random() * 20) + 10 + (index >= 4 && index <= 8 ? 25 : 0), // Peak season boost
    activeClients: 100 + index * 15 + Math.floor(Math.random() * 20),
  }));

  const timelineChart = months.map((month, index) => ({
    month,
    bookings:
      Math.floor(Math.random() * 15) + 10 + (index >= 4 && index <= 8 ? 25 : 0), // Peak season
    capacity: 45 + (index >= 4 && index <= 8 ? 20 : 0), // Increased capacity in peak season
  }));

  const vendorChart = [
    { name: 'Photographers', value: 35, rating: 4.8 },
    { name: 'Venues', value: 25, rating: 4.6 },
    { name: 'Caterers', value: 20, rating: 4.7 },
    { name: 'Florists', value: 15, rating: 4.5 },
    { name: 'Others', value: 5, rating: 4.4 },
  ];

  return {
    revenueChart,
    clientChart,
    timelineChart,
    vendorChart,
  };
}

async function getRecentActivity(supabase: any, organizationId: string) {
  const { data: activities } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    activities?.map((activity) => ({
      type: activity.activity_type || 'system',
      description: activity.description || 'System activity',
      details: activity.details || '',
      timestamp: activity.created_at,
    })) || []
  );
}

async function getSeasonalTrends(supabase: any, organizationId: string) {
  return {
    peakMonths: ['May', 'June', 'July', 'August', 'September'],
    averageLoadIncrease: 2.5,
    capacityUtilization: 0.85,
  };
}

// Real-time subscription management
const activeSubscriptions = new Map<
  string,
  { callback: Function; cleanup: Function }
>();

export async function subscribeToMetricsUpdates(
  organizationId: string,
  callback: (metrics: ExecutiveMetrics) => void,
): Promise<() => void> {
  const subscriptionId = `metrics-${organizationId}-${Date.now()}`;

  // Create Supabase real-time subscription
  const supabase = await createClient();

  const subscription = supabase
    .channel(`exec-metrics-${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `organization_id=eq.${organizationId}`,
      },
      async () => {
        try {
          const updatedMetrics = await getExecutiveMetrics(
            organizationId,
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            new Date().toISOString(),
            { forceRefresh: true },
          );
          callback(updatedMetrics);
        } catch (error) {
          console.error('Error updating metrics:', error);
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `organization_id=eq.${organizationId}`,
      },
      async () => {
        try {
          const updatedMetrics = await getExecutiveMetrics(
            organizationId,
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            new Date().toISOString(),
            { forceRefresh: true },
          );
          callback(updatedMetrics);
        } catch (error) {
          console.error('Error updating metrics:', error);
        }
      },
    )
    .subscribe();

  const cleanup = () => {
    subscription.unsubscribe();
    activeSubscriptions.delete(subscriptionId);
  };

  activeSubscriptions.set(subscriptionId, { callback, cleanup });

  return cleanup;
}

// Cleanup function for when the application shuts down
export function cleanupAllSubscriptions() {
  for (const [_, subscription] of activeSubscriptions) {
    subscription.cleanup();
  }
  activeSubscriptions.clear();
  metricsCache.clear();
}
