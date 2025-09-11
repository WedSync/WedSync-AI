// WS-130: AI-Powered Photography Library - Gallery Photos API
// Team C Batch 10 Round 1

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const galleryId = params.id;
    const { searchParams } = new URL(request.url);
    const styleFilter = searchParams.get('style');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get gallery details first
    const { data: gallery, error: galleryError } = await supabase
      .from('portfolio_galleries')
      .select(
        `
        *,
        photographer:photographer_profiles(*)
      `,
      )
      .eq('id', galleryId)
      .eq('is_public', true)
      .single();

    if (galleryError || !gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Build photos query
    let photosQuery = supabase
      .from('portfolio_photos')
      .select(
        `
        *,
        style_analysis:photo_style_analyses(
          detected_styles,
          color_analysis,
          composition_analysis,
          mood_analysis,
          technical_analysis,
          created_at
        )
      `,
      )
      .eq('portfolio_gallery_id', galleryId);

    // Apply style filter if specified
    if (styleFilter) {
      // This would require a more complex query to filter by detected styles
      // For now, we'll fetch all and filter in memory
    }

    // Apply pagination and ordering
    photosQuery = photosQuery
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: photos, error: photosError } = await photosQuery;

    if (photosError) {
      console.error('Error fetching gallery photos:', photosError);
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 },
      );
    }

    // Filter by style if specified
    let filteredPhotos = photos || [];
    if (styleFilter) {
      filteredPhotos =
        photos?.filter((photo) =>
          photo.style_analysis?.detected_styles?.some((style: any) =>
            style.style_name.toLowerCase().includes(styleFilter.toLowerCase()),
          ),
        ) || [];
    }

    // Process photos to include computed fields
    const processedPhotos = filteredPhotos.map((photo) => ({
      ...photo,
      dominant_style: photo.style_analysis?.detected_styles?.[0] || null,
      style_confidence:
        photo.style_analysis?.detected_styles?.[0]?.confidence || 0,
      technical_score:
        photo.style_analysis?.technical_analysis?.composition_score || 0,
      emotion_score: photo.style_analysis?.mood_analysis?.emotion_score || 0,
      has_analysis: !!photo.style_analysis,
    }));

    // Get total count for pagination
    const { count } = await supabase
      .from('portfolio_photos')
      .select('*', { count: 'exact', head: true })
      .eq('portfolio_gallery_id', galleryId);

    // Update gallery view count
    await supabase
      .from('portfolio_galleries')
      .update({
        view_count: (gallery.view_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galleryId);

    return NextResponse.json({
      gallery,
      photographer: gallery.photographer,
      photos: processedPhotos,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
      analytics: {
        total_photos: count || 0,
        analyzed_photos: processedPhotos.filter((p) => p.has_analysis).length,
        average_style_confidence:
          processedPhotos.length > 0
            ? processedPhotos.reduce((sum, p) => sum + p.style_confidence, 0) /
              processedPhotos.length
            : 0,
        average_technical_score:
          processedPhotos.length > 0
            ? processedPhotos.reduce((sum, p) => sum + p.technical_score, 0) /
              processedPhotos.length
            : 0,
      },
    });
  } catch (error) {
    console.error('Gallery photos API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const galleryId = params.id;
    const body = await request.json();
    const {
      photo_id,
      title,
      description,
      photo_url,
      thumbnail_url,
      tags,
      event_type,
      location,
      taken_date,
      display_order,
      is_featured = false,
    } = body;

    // Validate required fields
    if (!photo_id || !photo_url) {
      return NextResponse.json(
        { error: 'Photo ID and photo URL are required' },
        { status: 400 },
      );
    }

    // Verify gallery exists and user has permission
    const { data: gallery } = await supabase
      .from('portfolio_galleries')
      .select('photographer_id, organization_id')
      .eq('id', galleryId)
      .single();

    if (!gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Check user permission
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userProfile?.organization_id !== gallery.organization_id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Insert portfolio photo
    const { data: portfolioPhoto, error } = await supabase
      .from('portfolio_photos')
      .insert([
        {
          portfolio_gallery_id: galleryId,
          photo_id,
          title,
          description,
          photo_url,
          thumbnail_url,
          tags: tags || [],
          event_type,
          location,
          taken_date,
          display_order: display_order || 0,
          is_featured,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding photo to gallery:', error);
      return NextResponse.json(
        { error: 'Failed to add photo to gallery' },
        { status: 500 },
      );
    }

    // Trigger AI analysis for the photo (async)
    // This would typically be handled by a background job or webhook

    return NextResponse.json({ photo: portfolioPhoto }, { status: 201 });
  } catch (error) {
    console.error('Gallery photos POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
