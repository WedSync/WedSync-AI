import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('website_id');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!websiteId) {
      return NextResponse.json(
        { error: 'Website ID is required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Build query for photos
    let query = supabase
      .from('wedding_photos')
      .select(
        `
        id,
        url,
        thumbnail_url,
        title,
        description,
        category,
        uploaded_by,
        uploaded_by_name,
        upload_date,
        likes_count,
        is_featured,
        metadata
      `,
      )
      .eq('website_id', websiteId)
      .eq('is_approved', true)
      .order('upload_date', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: photos, error: photosError } = await query;

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 },
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('wedding_photos')
      .select('id', { count: 'exact' })
      .eq('website_id', websiteId)
      .eq('is_approved', true);

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error fetching photo count:', countError);
    }

    return NextResponse.json({
      success: true,
      data: {
        photos: photos || [],
        pagination: {
          offset,
          limit,
          total: count || 0,
          hasMore: (count || 0) > offset + limit,
        },
      },
    });
  } catch (error) {
    console.error('Error in wedding photos endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      websiteId,
      photoUrl,
      thumbnailUrl,
      title,
      description,
      category,
      uploadedBy,
      uploadedByName,
      metadata,
    } = await request.json();

    if (!websiteId || !photoUrl) {
      return NextResponse.json(
        { error: 'Website ID and photo URL are required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Insert new photo
    const { data: photo, error: insertError } = await supabase
      .from('wedding_photos')
      .insert({
        website_id: websiteId,
        url: photoUrl,
        thumbnail_url: thumbnailUrl,
        title,
        description,
        category: category || 'general',
        uploaded_by: uploadedBy,
        uploaded_by_name: uploadedByName,
        upload_date: new Date().toISOString(),
        likes_count: 0,
        is_approved: true, // Auto-approve for now
        is_featured: false,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting photo:', insertError);
      return NextResponse.json(
        { error: 'Failed to upload photo' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: photo,
    });
  } catch (error) {
    console.error('Error in photo upload endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
