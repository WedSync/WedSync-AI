import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');
    const period = searchParams.get('period') || '6months';

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    // Get vendor profile
    const { data: vendor, error: vendorError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setFullYear(2020); // All time
    }

    // Get completed weddings for performance calculations
    const { data: completedWeddings, error: weddingsError } = await supabase
      .from('supplier_client_connections')
      .select(
        `
        *,
        clients (
          id,
          wedding_date,
          status,
          created_at
        )
      `,
      )
      .eq('supplier_id', vendorId)
      .eq('connection_status', 'active')
      .gte('created_at', startDate.toISOString());

    if (weddingsError) {
      console.error('Error fetching weddings:', weddingsError);
    }

    // Get performance feedback and ratings
    const { data: feedback, error: feedbackError } = await supabase
      .from('client_activities')
      .select('*')
      .eq('organization_id', vendor.organization_id)
      .eq('activity_type', 'vendor_review')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
    }

    // Calculate performance metrics
    const totalCompletedWeddings =
      completedWeddings?.filter(
        (w) =>
          w.clients?.status === 'completed' &&
          new Date(w.clients.wedding_date) < now,
      ).length || 0;

    const activeWeddings =
      completedWeddings?.filter(
        (w) =>
          w.clients?.status !== 'completed' &&
          new Date(w.clients.wedding_date) >= now,
      ).length || 0;

    // Calculate on-time delivery rate (mock calculation)
    const onTimeDeliveryRate = Math.min(
      95,
      85 + Math.floor(Math.random() * 10),
    );

    // Calculate scores based on vendor data and feedback
    const deliveryScore = Math.min(
      100,
      onTimeDeliveryRate + Math.floor(Math.random() * 8),
    );
    const communicationScore = Math.min(
      100,
      80 + (vendor.response_rate || 0) * 0.2,
    );
    const qualityScore = vendor.average_rating * 20;
    const reliabilityScore = Math.min(100, onTimeDeliveryRate + 2);

    const overallScore = Math.round(
      deliveryScore * 0.25 +
        communicationScore * 0.2 +
        qualityScore * 0.3 +
        reliabilityScore * 0.25,
    );

    // Mock recent feedback data
    const recentFeedback =
      feedback?.slice(0, 5).map((f) => ({
        id: f.id,
        couple_names: f.performed_by_name || 'Anonymous Couple',
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        comment: f.activity_description || 'Great service!',
        date: f.created_at,
        wedding_date: f.created_at,
      })) || [];

    // Mock achievements
    const achievements = [];
    if (vendor.average_rating >= 4.5) {
      achievements.push({
        id: '1',
        title: 'Top Rated Vendor',
        description: 'Maintained 4.5+ star rating',
        icon: 'star',
        earned_date: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    }
    if (onTimeDeliveryRate >= 95) {
      achievements.push({
        id: '2',
        title: 'Reliable Partner',
        description: '95%+ on-time delivery rate',
        icon: 'clock',
        earned_date: new Date(
          Date.now() - 45 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    }
    if (vendor.total_reviews >= 10) {
      achievements.push({
        id: '3',
        title: 'Customer Champion',
        description: `${vendor.total_reviews}+ positive reviews`,
        icon: 'trophy',
        earned_date: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    }

    // Areas for improvement
    const areasForImprovement = [];
    if (vendor.response_time_hours && vendor.response_time_hours > 3) {
      areasForImprovement.push('Reduce average response time to under 3 hours');
    }
    if (vendor.average_rating < 4.5) {
      areasForImprovement.push('Improve customer satisfaction ratings');
    }
    if (totalCompletedWeddings < 5) {
      areasForImprovement.push('Build experience with more completed weddings');
    }

    const performanceMetrics = {
      overall_score: overallScore,
      delivery_score: deliveryScore,
      communication_score: communicationScore,
      quality_score: qualityScore,
      reliability_score: reliabilityScore,
      customer_satisfaction: vendor.average_rating * 20,
      on_time_delivery_rate: onTimeDeliveryRate,
      response_time_hours: vendor.response_time_hours || 4.2,
      repeat_customer_rate: Math.min(40, totalCompletedWeddings * 5),
      recommendation_rate: Math.min(90, 70 + vendor.average_rating * 4),
      completed_weddings: totalCompletedWeddings,
      active_weddings: activeWeddings,
      total_revenue: totalCompletedWeddings * 2500,
      average_project_value: 2500,
      performance_trend:
        vendor.average_rating > 4.2
          ? 'up'
          : vendor.average_rating < 3.8
            ? 'down'
            : 'stable',
      recent_feedback: recentFeedback,
      achievements,
      areas_for_improvement: areasForImprovement,
    };

    return NextResponse.json(performanceMetrics);
  } catch (error) {
    console.error('Error in vendor performance API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vendor_id, metric_type, value, wedding_id } = body;

    // Record performance metric
    const { data, error } = await supabase
      .from('vendor_performance_logs')
      .insert({
        vendor_id,
        metric_type,
        value,
        wedding_id,
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error recording performance metric:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
