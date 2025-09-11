import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    // Get trending templates (high weekly growth)
    const { data: trending } = await supabase
      .from('marketplace_templates')
      .select(
        `
        id,
        title,
        category,
        install_count
      `,
      )
      .eq('status', 'active')
      .order('install_count', { ascending: false })
      .limit(10);

    // Calculate weekly growth (mock for now - would need analytics table)
    const trendingWithGrowth =
      trending?.map((template) => ({
        id: template.id,
        title: template.title,
        category: template.category,
        installCount: template.install_count || 0,
        weeklyGrowthPercent: Math.floor(Math.random() * 50) + 10, // Mock growth percentage
      })) || [];

    // Get featured templates
    const { data: featuredData } = await supabase
      .from('marketplace_templates')
      .select(
        `
        id,
        title,
        description,
        template_type,
        category,
        subcategory,
        price_cents,
        currency,
        minimum_tier,
        preview_images,
        install_count,
        average_rating,
        rating_count,
        featured,
        tags,
        target_wedding_types,
        target_price_range,
        suppliers!inner (
          id,
          business_name,
          vendor_type
        )
      `,
      )
      .eq('status', 'active')
      .eq('featured', true)
      .order('featured_until', { ascending: false })
      .limit(6);

    const featured =
      featuredData?.map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        templateType: template.template_type,
        category: template.category,
        subcategory: template.subcategory,
        priceCents: template.price_cents,
        currency: template.currency,
        minimumTier: template.minimum_tier,
        previewImages: template.preview_images || ['/api/placeholder/400/250'],
        installCount: template.install_count || 0,
        averageRating: template.average_rating || 0,
        ratingCount: template.rating_count || 0,
        creator: {
          id: template.suppliers.id,
          businessName: template.suppliers.business_name,
          vendorType: template.suppliers.vendor_type,
          avatarUrl: '/api/placeholder/40/40',
        },
        featured: template.featured || false,
        tags: template.tags || [],
        targetWeddingTypes: template.target_wedding_types || [],
        targetPriceRange: template.target_price_range || '',
        featuredReason: 'High conversion rate',
        previewImage:
          template.preview_images?.[0] || '/api/placeholder/400/250',
      })) || [];

    // Mock data for development if no real data
    if (featured.length === 0) {
      featured.push(
        {
          id: 'featured-1',
          title: 'Luxury Photography Client Intake Suite',
          description:
            'Complete intake system that generates £340k+ annually with 73% conversion rate',
          templateType: 'form',
          category: 'photography',
          subcategory: 'client_intake',
          priceCents: 4700,
          currency: 'GBP',
          minimumTier: 'professional' as const,
          previewImages: ['/api/placeholder/400/250'],
          installCount: 234,
          averageRating: 4.9,
          ratingCount: 87,
          creator: {
            id: 'creator-1',
            businessName: 'Elite Wedding Photography',
            vendorType: 'photography',
            avatarUrl: '/api/placeholder/40/40',
          },
          featured: true,
          tags: ['high-conversion', 'luxury', 'client-intake'],
          targetWeddingTypes: ['luxury', 'destination'],
          targetPriceRange: '£10k-20k+',
          featuredReason: 'Highest revenue generator',
          previewImage: '/api/placeholder/400/250',
        },
        {
          id: 'featured-2',
          title: 'Venue Booking Workflow Bundle',
          description:
            'Complete venue management system with booking forms and contracts',
          templateType: 'bundle',
          category: 'venue',
          subcategory: 'booking_management',
          priceCents: 6500,
          currency: 'GBP',
          minimumTier: 'professional' as const,
          previewImages: ['/api/placeholder/400/250'],
          installCount: 156,
          averageRating: 4.7,
          ratingCount: 43,
          creator: {
            id: 'creator-2',
            businessName: 'Premium Venues Ltd',
            vendorType: 'venue',
            avatarUrl: '/api/placeholder/40/40',
          },
          featured: true,
          tags: ['booking', 'contracts', 'venue-management'],
          targetWeddingTypes: ['luxury', 'traditional'],
          targetPriceRange: '£15k+',
          featuredReason: 'Most comprehensive solution',
          previewImage: '/api/placeholder/400/250',
        },
        {
          id: 'featured-3',
          title: 'Catering Menu Planning System',
          description:
            'Dietary requirements, menu planning, and service coordination templates',
          templateType: 'journey_workflow',
          category: 'catering',
          subcategory: 'menu_planning',
          priceCents: 3900,
          currency: 'GBP',
          minimumTier: 'starter' as const,
          previewImages: ['/api/placeholder/400/250'],
          installCount: 89,
          averageRating: 4.6,
          ratingCount: 32,
          creator: {
            id: 'creator-3',
            businessName: 'Gourmet Wedding Catering',
            vendorType: 'catering',
            avatarUrl: '/api/placeholder/40/40',
          },
          featured: true,
          tags: [
            'menu-planning',
            'dietary-requirements',
            'service-coordination',
          ],
          targetWeddingTypes: ['traditional', 'intimate'],
          targetPriceRange: '£5k-15k',
          featuredReason: 'Perfect for dietary management',
          previewImage: '/api/placeholder/400/250',
        },
      );
    }

    // Get personalized recommendations (would be based on user's vendor type and history)
    const recommendations = [
      {
        id: 'rec-1',
        title: 'Budget-Friendly Planning Timeline',
        recommendationReason: 'Popular with planners like you',
        relevanceScore: 0.85,
      },
      {
        id: 'rec-2',
        title: 'Client Communication Sequence',
        recommendationReason: 'High conversion rate for your industry',
        relevanceScore: 0.92,
      },
      {
        id: 'rec-3',
        title: 'Vendor Coordination Toolkit',
        recommendationReason: 'Recently updated with new features',
        relevanceScore: 0.78,
      },
    ];

    const response = {
      trending: trendingWithGrowth,
      featured,
      recommendations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
