import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('website_id');
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    if (!websiteId) {
      return NextResponse.json(
        { error: 'Website ID is required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get the client_id from the website
    const { data: website, error: websiteError } = await supabase
      .from('wedding_websites')
      .select('client_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Wedding website not found' },
        { status: 404 },
      );
    }

    // Build query for vendors
    let query = supabase
      .from('client_vendors')
      .select(
        `
        id,
        vendor_id,
        role,
        status,
        budget_allocated,
        contract_signed,
        display_on_website,
        vendors (
          id,
          business_name,
          contact_name,
          email,
          phone,
          website_url,
          address,
          description,
          specialties,
          logo_url,
          gallery_images,
          social_media,
          rating,
          review_count,
          verified,
          vendor_categories (
            id,
            name,
            display_name
          )
        )
      `,
      )
      .eq('client_id', website.client_id)
      .eq('display_on_website', true)
      .eq('status', 'confirmed');

    if (category) {
      query = query.eq('vendors.vendor_categories.name', category);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    const { data: clientVendors, error: vendorsError } = await query;

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
      return NextResponse.json(
        { error: 'Failed to fetch vendor information' },
        { status: 500 },
      );
    }

    // Transform data for wedding website display
    const vendors =
      clientVendors?.map((cv) => {
        const vendor = cv.vendors;
        return {
          id: vendor.id,
          business_name: vendor.business_name,
          contact_name: vendor.contact_name,
          role: cv.role,
          category: vendor.vendor_categories?.display_name || 'Other',
          description: vendor.description,
          website_url: vendor.website_url,
          phone: vendor.phone,
          email: vendor.email,
          address: vendor.address,
          logo_url: vendor.logo_url,
          gallery_images: vendor.gallery_images || [],
          social_media: vendor.social_media || {},
          rating: vendor.rating,
          review_count: vendor.review_count,
          verified: vendor.verified,
          specialties: vendor.specialties || [],
          contract_signed: cv.contract_signed,
          budget_allocated: cv.budget_allocated,
        };
      }) || [];

    // Group vendors by category
    const vendorsByCategory = vendors.reduce(
      (acc, vendor) => {
        const category = vendor.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(vendor);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Get vendor statistics
    const stats = {
      total_vendors: vendors.length,
      categories_count: Object.keys(vendorsByCategory).length,
      verified_vendors: vendors.filter((v) => v.verified).length,
      average_rating:
        vendors.length > 0
          ? vendors.reduce((sum, v) => sum + (v.rating || 0), 0) /
            vendors.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        vendors,
        vendors_by_category: vendorsByCategory,
        stats,
      },
    });
  } catch (error) {
    console.error('Error in wedding vendors endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { websiteId, vendorId, displayOnWebsite } = await request.json();

    if (!websiteId || !vendorId) {
      return NextResponse.json(
        { error: 'Website ID and Vendor ID are required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Update vendor display setting
    const { data, error } = await supabase
      .from('client_vendors')
      .update({ display_on_website: displayOnWebsite })
      .eq('vendor_id', vendorId)
      .select()
      .single();

    if (error) {
      console.error('Error updating vendor display setting:', error);
      return NextResponse.json(
        { error: 'Failed to update vendor display setting' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in vendor update endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
