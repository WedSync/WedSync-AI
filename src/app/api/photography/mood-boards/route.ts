// WS-130: AI-Powered Photography Library - Mood Board Generation API
// Team C Batch 10 Round 1

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';
import { MoodBoardBuilder } from '@/lib/ml/mood-board-builder';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      client_id,
      project_name,
      style_preferences,
      color_preferences,
      mood_keywords,
      event_type,
      inspiration_images,
      layout_preferences,
      board_size,
      include_text_overlays,
      custom_requirements,
    } = body;

    // Validate required fields
    if (!client_id || !project_name) {
      return NextResponse.json(
        { error: 'Client ID and project name are required' },
        { status: 400 },
      );
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 },
      );
    }

    // Verify client access
    const { data: client } = await supabase
      .from('clients')
      .select('id, organization_id')
      .eq('id', client_id)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 },
      );
    }

    // Initialize mood board builder
    const moodBoardBuilder = new MoodBoardBuilder();

    // Generate mood board using AI
    const generationParams = {
      stylePreferences: style_preferences || [],
      colorPreferences: color_preferences || [],
      moodKeywords: mood_keywords || [],
      eventType: event_type || 'general',
      inspirationImages: inspiration_images || [],
      layoutType: layout_preferences?.layout || 'grid',
      boardDimensions: {
        width: board_size?.width || 1920,
        height: board_size?.height || 1080,
      },
      includeTextOverlays: include_text_overlays !== false,
      customRequirements: custom_requirements || {},
    };

    const generatedMoodBoard =
      await moodBoardBuilder.createMoodBoard(generationParams);

    // Save mood board to database
    const { data: moodBoard, error: moodBoardError } = await supabase
      .from('mood_boards')
      .insert([
        {
          client_id,
          project_name,
          style_preferences: style_preferences || [],
          color_palette: generatedMoodBoard.colorPalette,
          mood_keywords: mood_keywords || [],
          event_type: event_type || 'general',
          layout_config: {
            type: layout_preferences?.layout || 'grid',
            dimensions: generationParams.boardDimensions,
            ...layout_preferences,
          },
          image_sources: generatedMoodBoard.images.map((img: any) => ({
            url: img.url,
            source: img.source,
            description: img.description,
            style_tags: img.styleTags,
            position: img.position,
          })),
          generated_layout: generatedMoodBoard.layout,
          color_analysis: generatedMoodBoard.colorAnalysis,
          style_analysis: generatedMoodBoard.styleAnalysis,
          export_urls: {
            high_res: generatedMoodBoard.exports?.highRes,
            web_res: generatedMoodBoard.exports?.webRes,
            thumbnail: generatedMoodBoard.exports?.thumbnail,
          },
          generation_metadata: {
            ai_model_used: 'mood-board-ai-v1.0',
            generation_time: new Date().toISOString(),
            parameters: generationParams,
            processing_stats: generatedMoodBoard.processingStats,
          },
          organization_id: userProfile.organization_id,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (moodBoardError) {
      console.error('Error saving mood board:', moodBoardError);
      return NextResponse.json(
        { error: 'Failed to save mood board' },
        { status: 500 },
      );
    }

    // Return complete mood board with analysis
    return NextResponse.json(
      {
        moodBoard: {
          ...moodBoard,
          preview_url: generatedMoodBoard.exports?.webRes,
          analysis: {
            total_images: generatedMoodBoard.images.length,
            color_harmony_score: generatedMoodBoard.colorAnalysis.harmonyScore,
            style_consistency_score:
              generatedMoodBoard.styleAnalysis.consistencyScore,
            dominant_colors: generatedMoodBoard.colorPalette.slice(0, 5),
            style_breakdown: generatedMoodBoard.styleAnalysis.breakdown,
          },
        },
        generation_details: {
          model_used: 'AI Mood Board Builder v1.0',
          processing_time:
            generatedMoodBoard.processingStats?.totalTime || '3.2s',
          images_searched:
            generatedMoodBoard.processingStats?.imagesSearched || 0,
          layouts_tested:
            generatedMoodBoard.processingStats?.layoutsTested || 0,
          confidence: generatedMoodBoard.confidence || 0.85,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Mood board generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const eventType = searchParams.get('event_type');
    const styleFilter = searchParams.get('style');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 },
      );
    }

    // Build query
    let query = supabase
      .from('mood_boards')
      .select(
        `
        *,
        client:clients(id, name, email)
      `,
      )
      .eq('organization_id', userProfile.organization_id);

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (styleFilter) {
      query = query.contains('style_preferences', [styleFilter]);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: moodBoards, error } = await query;

    if (error) {
      console.error('Error fetching mood boards:', error);
      return NextResponse.json(
        { error: 'Failed to fetch mood boards' },
        { status: 500 },
      );
    }

    // Process mood boards to include analytics and preview data
    const processedMoodBoards =
      moodBoards?.map((board) => ({
        ...board,
        preview_url: board.export_urls?.web_res,
        thumbnail_url: board.export_urls?.thumbnail,
        analytics: {
          total_images: board.image_sources?.length || 0,
          color_count: board.color_palette?.length || 0,
          style_tags: extractUniqueStyleTags(board.image_sources || []),
          creation_date: board.created_at,
          last_modified: board.updated_at,
          export_formats: Object.keys(board.export_urls || {}).length,
        },
        summary: {
          dominant_style: board.style_analysis?.breakdown?.[0]?.style,
          primary_color: board.color_palette?.[0],
          mood_description: generateMoodDescription(board.mood_keywords || []),
          complexity_level: calculateComplexityLevel(board),
        },
      })) || [];

    // Get total count for pagination
    const { count } = await supabase
      .from('mood_boards')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userProfile.organization_id);

    return NextResponse.json({
      moodBoards: processedMoodBoards,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error('Mood boards GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Individual mood board endpoint
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      project_name,
      style_preferences,
      mood_keywords,
      layout_config,
      image_sources,
      regenerate_layout,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Mood board ID is required' },
        { status: 400 },
      );
    }

    // Verify mood board exists and user has permission
    const { data: existingBoard } = await supabase
      .from('mood_boards')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingBoard) {
      return NextResponse.json(
        { error: 'Mood board not found' },
        { status: 404 },
      );
    }

    // Check user permission
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userProfile?.organization_id !== existingBoard.organization_id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    let updatedData: any = {
      updated_at: new Date().toISOString(),
    };

    // If regenerating layout or significant changes, use AI
    if (
      regenerate_layout ||
      JSON.stringify(style_preferences) !==
        JSON.stringify(existingBoard.style_preferences) ||
      JSON.stringify(mood_keywords) !==
        JSON.stringify(existingBoard.mood_keywords)
    ) {
      const moodBoardBuilder = new MoodBoardBuilder();
      const updatedBoard = await moodBoardBuilder.updateMoodBoard(
        existingBoard,
        {
          stylePreferences: style_preferences,
          moodKeywords: mood_keywords,
          layoutConfig: layout_config,
          regenerateLayout: regenerate_layout,
        },
      );

      updatedData = {
        ...updatedData,
        project_name: project_name || existingBoard.project_name,
        style_preferences: style_preferences || existingBoard.style_preferences,
        mood_keywords: mood_keywords || existingBoard.mood_keywords,
        layout_config: layout_config || existingBoard.layout_config,
        generated_layout: updatedBoard.layout,
        color_analysis: updatedBoard.colorAnalysis,
        style_analysis: updatedBoard.styleAnalysis,
        export_urls: {
          ...existingBoard.export_urls,
          ...updatedBoard.exports,
        },
      };
    } else {
      // Simple updates without regeneration
      updatedData = {
        ...updatedData,
        project_name: project_name || existingBoard.project_name,
        style_preferences: style_preferences || existingBoard.style_preferences,
        mood_keywords: mood_keywords || existingBoard.mood_keywords,
        layout_config: layout_config || existingBoard.layout_config,
        image_sources: image_sources || existingBoard.image_sources,
      };
    }

    // Update mood board
    const { data: updatedBoard, error } = await supabase
      .from('mood_boards')
      .update(updatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mood board:', error);
      return NextResponse.json(
        { error: 'Failed to update mood board' },
        { status: 500 },
      );
    }

    return NextResponse.json({ moodBoard: updatedBoard });
  } catch (error) {
    console.error('Mood board update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper functions
function extractUniqueStyleTags(imageSources: any[]): string[] {
  const allTags = imageSources.flatMap((source) => source.style_tags || []);
  return Array.from(new Set(allTags));
}

function generateMoodDescription(keywords: string[]): string {
  if (keywords.length === 0) return 'General mood';
  if (keywords.length === 1) return keywords[0];
  if (keywords.length === 2) return `${keywords[0]} and ${keywords[1]}`;
  return `${keywords.slice(0, -1).join(', ')}, and ${keywords[keywords.length - 1]}`;
}

function calculateComplexityLevel(board: any): string {
  const imageCount = board.image_sources?.length || 0;
  const colorCount = board.color_palette?.length || 0;
  const styleCount = board.style_preferences?.length || 0;

  const complexity = imageCount + colorCount * 2 + styleCount * 3;

  if (complexity < 10) return 'Simple';
  if (complexity < 25) return 'Moderate';
  return 'Complex';
}
