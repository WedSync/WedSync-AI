// WS-130: AI-Powered Photography Library - Photography Styles API
// Team C Batch 10 Round 1

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get photography styles from database
    const { data: styles, error } = await supabase
      .from('photography_styles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching photography styles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch photography styles' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      styles: styles || [],
      count: styles?.length || 0,
    });
  } catch (error) {
    console.error('Photography styles API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      characteristics,
      color_palette,
      mood_tags,
      example_keywords,
    } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 },
      );
    }

    // Insert new photography style
    const { data: style, error } = await supabase
      .from('photography_styles')
      .insert([
        {
          name,
          description,
          characteristics: characteristics || [],
          color_palette: color_palette || [],
          mood_tags: mood_tags || [],
          example_keywords: example_keywords || [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating photography style:', error);
      return NextResponse.json(
        { error: 'Failed to create photography style' },
        { status: 500 },
      );
    }

    return NextResponse.json({ style }, { status: 201 });
  } catch (error) {
    console.error('Photography styles POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
