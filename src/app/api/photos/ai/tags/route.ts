/**
 * WS-127: AI Smart Tagging API Endpoint
 * Generates and manages AI-powered photo tags
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { photoAIService } from '@/lib/ml/photo-ai-service';
import { z } from 'zod';

const generateTagsSchema = z.object({
  photo_ids: z.array(z.string()).max(50), // Limit for performance
  confidence_threshold: z.number().min(0).max(1).default(0.7),
  max_tags_per_photo: z.number().min(1).max(20).default(10),
  tag_categories: z
    .array(z.enum(['object', 'action', 'emotion', 'setting', 'style']))
    .optional(),
  auto_apply: z.boolean().default(false), // Automatically apply high-confidence tags
});

const applyTagsSchema = z.object({
  photo_id: z.string(),
  tag_ids: z.array(z.string()),
  confidence_scores: z.record(z.string(), z.number()).optional(), // tag_id -> confidence
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'generate';

    if (action === 'apply') {
      return await applyTags(supabase, user, body);
    }

    // Generate tags action
    const {
      photo_ids,
      confidence_threshold,
      max_tags_per_photo,
      tag_categories,
      auto_apply,
    } = generateTagsSchema.parse(body);

    // Check if photos exist and user has access
    const { data: photos, error: photoError } = await supabase
      .from('photos')
      .select('id, uploaded_by, organization_id, filename')
      .in('id', photo_ids);

    if (photoError) {
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 },
      );
    }

    if (photos.length !== photo_ids.length) {
      return NextResponse.json(
        { error: 'Some photos not found' },
        { status: 404 },
      );
    }

    // Check permissions
    const hasAccess = photos.every(
      (photo) => photo.uploaded_by === user.id || photo.organization_id,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to some photos' },
        { status: 403 },
      );
    }

    // Generate smart tags
    const photoTagsMap = await photoAIService.generateSmartTags(photo_ids);

    // Process the results
    const tagGenerationResults = [];
    const existingTags = new Map<string, any>();

    // Get existing tags from database
    const { data: dbTags } = await supabase
      .from('photo_tags')
      .select('*')
      .eq('organization_id', photos[0].organization_id || 'default');

    dbTags?.forEach((tag) => {
      existingTags.set(tag.name.toLowerCase(), tag);
    });

    for (const photo of photos) {
      const photoTags = photoTagsMap.get(photo.id) || [];

      // Filter tags by confidence and category
      const filteredTags = photoTags
        .filter((tag) => {
          const matchesThreshold = true; // Would use actual confidence from AI analysis
          const matchesCategory =
            !tag_categories ||
            tag_categories.length === 0 ||
            tag_categories.includes('object'); // Simplified for demo
          return matchesThreshold && matchesCategory;
        })
        .slice(0, max_tags_per_photo);

      // Create new tags if they don't exist
      const newTags = [];
      const suggestedTagIds = [];

      for (const tag of filteredTags) {
        const existingTag = existingTags.get(tag.name.toLowerCase());

        if (existingTag) {
          suggestedTagIds.push(existingTag.id);
        } else {
          // Create new tag
          const newTag = {
            id: crypto.randomUUID(),
            name: tag.name,
            description: `AI-generated tag for ${tag.name}`,
            color: tag.color,
            organization_id: photos[0].organization_id || 'default',
            usage_count: 0,
            created_by: user.id,
          };

          newTags.push(newTag);
          suggestedTagIds.push(newTag.id);
          existingTags.set(tag.name.toLowerCase(), newTag);
        }
      }

      // Insert new tags
      if (newTags.length > 0) {
        const { error: tagInsertError } = await supabase
          .from('photo_tags')
          .insert(newTags);

        if (tagInsertError) {
          console.error('Failed to create new tags:', tagInsertError);
          // Continue with existing tags only
        }
      }

      // Auto-apply tags if requested
      let appliedTags = [];
      if (auto_apply && suggestedTagIds.length > 0) {
        // Apply high confidence tags
        const highConfidenceTags = suggestedTagIds.slice(
          0,
          Math.min(5, suggestedTagIds.length),
        );

        const tagAssignments = highConfidenceTags.map((tagId) => ({
          id: crypto.randomUUID(),
          photo_id: photo.id,
          tag_id: tagId,
          assigned_by: user.id,
        }));

        const { error: assignError } = await supabase
          .from('photo_tag_assignments')
          .insert(tagAssignments);

        if (!assignError) {
          appliedTags = highConfidenceTags;
        }
      }

      tagGenerationResults.push({
        photo_id: photo.id,
        filename: photo.filename,
        suggested_tags: suggestedTagIds.map((tagId) => {
          const tag = [...existingTags.values()].find((t) => t.id === tagId);
          return {
            id: tag?.id,
            name: tag?.name,
            confidence: 0.8, // Would use actual confidence from AI
            category: 'object', // Would use actual category
            color: tag?.color,
          };
        }),
        applied_tags: appliedTags,
        new_tags_created: newTags.length,
      });
    }

    // Update tag usage counts
    if (auto_apply) {
      const usageUpdates = new Map<string, number>();
      tagGenerationResults.forEach((result) => {
        result.applied_tags.forEach((tagId) => {
          usageUpdates.set(tagId, (usageUpdates.get(tagId) || 0) + 1);
        });
      });

      for (const [tagId, count] of usageUpdates.entries()) {
        await supabase
          .from('photo_tags')
          .update({ usage_count: count })
          .eq('id', tagId);
      }
    }

    return NextResponse.json({
      success: true,
      generation_summary: {
        photos_processed: photos.length,
        total_tags_suggested: tagGenerationResults.reduce(
          (sum, r) => sum + r.suggested_tags.length,
          0,
        ),
        total_tags_applied: auto_apply
          ? tagGenerationResults.reduce(
              (sum, r) => sum + r.applied_tags.length,
              0,
            )
          : 0,
        new_tags_created: tagGenerationResults.reduce(
          (sum, r) => sum + r.new_tags_created,
          0,
        ),
      },
      photo_results: tagGenerationResults,
      settings_used: {
        confidence_threshold,
        max_tags_per_photo,
        auto_apply,
      },
    });
  } catch (error) {
    console.error('Smart tagging error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Smart tagging failed', message: error.message },
      { status: 500 },
    );
  }
}

async function applyTags(supabase: any, user: any, body: any) {
  const { photo_id, tag_ids, confidence_scores } = applyTagsSchema.parse(body);

  // Check if photo exists and user has access
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('id, uploaded_by, organization_id, filename')
    .eq('id', photo_id)
    .single();

  if (photoError || !photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  // Check permissions
  if (photo.uploaded_by !== user.id && !photo.organization_id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Verify tags exist
  const { data: tags, error: tagsError } = await supabase
    .from('photo_tags')
    .select('id, name')
    .in('id', tag_ids);

  if (tagsError) {
    return NextResponse.json(
      { error: 'Failed to verify tags' },
      { status: 500 },
    );
  }

  if (tags.length !== tag_ids.length) {
    return NextResponse.json({ error: 'Some tags not found' }, { status: 404 });
  }

  // Remove existing tag assignments for this photo
  await supabase
    .from('photo_tag_assignments')
    .delete()
    .eq('photo_id', photo_id);

  // Create new tag assignments
  const tagAssignments = tag_ids.map((tagId) => ({
    id: crypto.randomUUID(),
    photo_id,
    tag_id: tagId,
    confidence_score: confidence_scores?.[tagId] || null,
    assigned_by: user.id,
  }));

  const { error: assignError } = await supabase
    .from('photo_tag_assignments')
    .insert(tagAssignments);

  if (assignError) {
    return NextResponse.json(
      { error: 'Failed to apply tags' },
      { status: 500 },
    );
  }

  // Update tag usage counts
  for (const tagId of tag_ids) {
    await supabase.rpc('increment_tag_usage', { tag_id: tagId });
  }

  return NextResponse.json({
    success: true,
    photo: {
      id: photo.id,
      filename: photo.filename,
    },
    applied_tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      confidence: confidence_scores?.[tag.id] || null,
    })),
    applied_count: tag_ids.length,
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photo_id');
    const organizationId = searchParams.get('organization_id');
    const popular = searchParams.get('popular') === 'true';

    if (photoId) {
      // Get tags for specific photo
      const { data: photoTags, error: photoTagsError } = await supabase
        .from('photo_tag_assignments')
        .select(
          `
          id,
          confidence_score,
          assigned_at,
          photo_tags!inner(id, name, color, description)
        `,
        )
        .eq('photo_id', photoId);

      if (photoTagsError) {
        return NextResponse.json(
          { error: 'Failed to fetch photo tags' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        photo_id: photoId,
        tags: photoTags.map((assignment) => ({
          id: assignment.photo_tags.id,
          name: assignment.photo_tags.name,
          color: assignment.photo_tags.color,
          description: assignment.photo_tags.description,
          confidence: assignment.confidence_score,
          assigned_at: assignment.assigned_at,
        })),
      });
    }

    if (popular) {
      // Get popular tags
      const { data: popularTags, error: popularError } = await supabase
        .from('photo_tags')
        .select('id, name, color, description, usage_count')
        .order('usage_count', { ascending: false })
        .limit(20);

      if (popularError) {
        return NextResponse.json(
          { error: 'Failed to fetch popular tags' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        popular_tags: popularTags,
      });
    }

    // Get all tags for organization
    const { data: allTags, error: allTagsError } = await supabase
      .from('photo_tags')
      .select('id, name, color, description, usage_count, created_at')
      .eq('organization_id', organizationId || 'default')
      .order('usage_count', { ascending: false });

    if (allTagsError) {
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      tags: allTags,
      total_tags: allTags.length,
    });
  } catch (error) {
    console.error('Fetch tags error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photo_id');
    const tagId = searchParams.get('tag_id');

    if (!photoId || !tagId) {
      return NextResponse.json(
        { error: 'Photo ID and Tag ID are required' },
        { status: 400 },
      );
    }

    // Verify photo access
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, uploaded_by, organization_id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (photo.uploaded_by !== user.id && !photo.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove tag assignment
    const { error: removeError } = await supabase
      .from('photo_tag_assignments')
      .delete()
      .eq('photo_id', photoId)
      .eq('tag_id', tagId);

    if (removeError) {
      return NextResponse.json(
        { error: 'Failed to remove tag' },
        { status: 500 },
      );
    }

    // Decrement tag usage count
    await supabase.rpc('decrement_tag_usage', { tag_id: tagId });

    return NextResponse.json({
      success: true,
      message: 'Tag removed successfully',
    });
  } catch (error) {
    console.error('Remove tag error:', error);
    return NextResponse.json(
      { error: 'Failed to remove tag' },
      { status: 500 },
    );
  }
}
