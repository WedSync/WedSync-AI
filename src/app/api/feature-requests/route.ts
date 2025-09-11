import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Validation schemas
const createFeatureRequestSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(100).max(5000),
  category: z.enum([
    'timeline_management',
    'budget_tracking',
    'guest_management',
    'vendor_coordination',
    'communications',
    'analytics',
    'mobile_app',
    'integrations',
    'user_experience',
    'performance',
    'security',
    'accessibility',
    'customization',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  wedding_context: z.object({
    wedding_size: z.enum(['intimate', 'medium', 'large', 'destination']),
    timeframe: z.enum([
      'planning_phase',
      'immediate',
      'week_of_wedding',
      'post_wedding',
    ]),
    pain_points: z.array(z.string()).optional(),
    current_workaround: z.string().max(1000).optional(),
  }),
  business_impact: z.object({
    reach_score: z.number().int().min(1).max(10),
    impact_score: z.number().int().min(1).max(10),
    confidence_score: z.number().int().min(1).max(10),
    effort_score: z.number().int().min(1).max(10),
  }),
  attachment_urls: z.array(z.string().url()).optional(),
});

const querySchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  user_type: z.string().optional(),
  wedding_size: z.string().optional(),
  timeframe: z.string().optional(),
  sort_by: z
    .enum(['votes', 'rice_score', 'recent', 'comments', 'priority'])
    .default('recent'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
});

// Helper functions
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate embedding');
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

async function findSimilarRequests(
  embedding: number[],
  threshold: number = 0.8,
) {
  if (!embedding || embedding.length === 0) return [];

  try {
    const { data, error } = await supabase.rpc(
      'find_similar_feature_requests',
      {
        query_embedding: embedding,
        similarity_threshold: threshold,
        match_count: 5,
      },
    );

    if (error) {
      console.error('Error finding similar requests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in similarity search:', error);
    return [];
  }
}

function calculateWeddingIndustryMultiplier(
  weddingContext: any,
  userType: string,
): number {
  let multiplier = 1.0;

  // Higher priority for wedding suppliers vs couples
  if (userType === 'wedding_supplier') multiplier *= 1.2;
  if (userType === 'admin' || userType === 'product_team') multiplier *= 1.1;

  // Wedding size impact
  switch (weddingContext.wedding_size) {
    case 'destination':
      multiplier *= 1.3; // More complex
      break;
    case 'large':
      multiplier *= 1.2;
      break;
    case 'medium':
      multiplier *= 1.1;
      break;
    default:
      break;
  }

  // Timeframe urgency
  switch (weddingContext.timeframe) {
    case 'week_of_wedding':
      multiplier *= 1.5; // Most critical
      break;
    case 'immediate':
      multiplier *= 1.3;
      break;
    case 'planning_phase':
      multiplier *= 1.1;
      break;
    default:
      break;
  }

  return Math.min(2.0, multiplier); // Cap at 2x
}

function calculateSeasonalUrgencyMultiplier(timeframe: string): number {
  const currentMonth = new Date().getMonth() + 1;
  const peakMonths = [4, 5, 6, 7, 8, 9, 10]; // Apr-Oct wedding season

  let multiplier = 1.0;

  // Boost during peak wedding season
  if (peakMonths.includes(currentMonth)) {
    multiplier *= 1.2;
  }

  // Extra boost for urgent timeframes during season
  if (timeframe === 'week_of_wedding' && peakMonths.includes(currentMonth)) {
    multiplier *= 1.1;
  }

  return Math.min(1.5, multiplier);
}

async function calculateWeddingInsights(request: any) {
  // Placeholder for wedding industry insights calculation
  return {
    seasonal_relevance: calculateSeasonalUrgencyMultiplier(
      request.wedding_context?.timeframe || 'planning_phase',
    ),
    vendor_impact: request.user_type === 'wedding_supplier' ? 'high' : 'medium',
    couple_benefit: request.category === 'guest_management' ? 'high' : 'medium',
    implementation_urgency:
      request.final_priority_score > 50 ? 'high' : 'medium',
  };
}

async function notifyProductTeam(request: any) {
  // Placeholder for product team notification
  console.log(
    `High priority feature request created: ${request.title} (Score: ${request.final_priority_score})`,
  );
}

// GET - List feature requests with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    const validatedQuery = querySchema.parse(queryParams);

    const {
      category,
      status,
      user_type,
      wedding_size,
      timeframe,
      sort_by,
      limit,
      offset,
      search,
    } = validatedQuery;

    let query = supabase.from('feature_requests').select(
      `
        *,
        feature_request_votes(count),
        feature_request_comments(count),
        created_by_user:auth.users!created_by(id, email)
      `,
      { count: 'exact' },
    );

    // Apply filters
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (user_type) query = query.eq('user_type', user_type);

    // Wedding-specific filters
    if (wedding_size) {
      query = query.contains('wedding_context', { wedding_size });
    }
    if (timeframe) {
      query = query.contains('wedding_context', { timeframe });
    }

    // Full-text search
    if (search) {
      query = query.textSearch('search_vector', search, { config: 'english' });
    }

    // Apply sorting
    switch (sort_by) {
      case 'votes':
        query = query.order('vote_count', { ascending: false });
        break;
      case 'rice_score':
        query = query.order('rice_calculated_score', { ascending: false });
        break;
      case 'priority':
        query = query.order('final_priority_score', { ascending: false });
        break;
      case 'comments':
        query = query.order('comment_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feature requests' },
        { status: 500 },
      );
    }

    // Enhance with wedding industry insights
    const enhancedData = await Promise.all(
      data?.map(async (request) => ({
        ...request,
        wedding_insights: await calculateWeddingInsights(request),
        similar_requests_count: 0, // Placeholder - would implement similarity search
      })) || [],
    );

    return NextResponse.json({
      data: enhancedData,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 },
    );
  }
}

// POST - Create feature request with AI duplicate detection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createFeatureRequestSchema.parse(body);

    // Get authenticated user
    const user = await auth.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate AI embedding for duplicate detection
    const embeddingText = `${validatedData.title} ${validatedData.description} ${validatedData.wedding_context.pain_points?.join(' ') || ''}`;
    const embedding = await generateEmbedding(embeddingText);

    // Check for potential duplicates
    const potentialDuplicates =
      embedding.length > 0 ? await findSimilarRequests(embedding, 0.85) : [];

    // Calculate wedding industry multipliers
    const weddingMultiplier = calculateWeddingIndustryMultiplier(
      validatedData.wedding_context,
      user.user_type || 'couple',
    );
    const seasonalMultiplier = calculateSeasonalUrgencyMultiplier(
      validatedData.wedding_context.timeframe,
    );

    // Prepare data for insertion
    const insertData = {
      title: validatedData.title,
      description: validatedData.description,
      category: validatedData.category,
      priority: validatedData.priority || 'medium',
      created_by: user.id,
      user_type: user.user_type || 'couple',
      organization_id: user.organization_id || null,
      wedding_context: validatedData.wedding_context,
      pain_points: validatedData.wedding_context.pain_points || [],
      current_workaround:
        validatedData.wedding_context.current_workaround || null,
      business_impact_data: validatedData.business_impact,
      embedding: embedding.length > 0 ? JSON.stringify(embedding) : null,
      reach_score: validatedData.business_impact.reach_score,
      impact_score: validatedData.business_impact.impact_score,
      confidence_score: validatedData.business_impact.confidence_score,
      effort_score: validatedData.business_impact.effort_score,
      wedding_industry_multiplier: weddingMultiplier,
      seasonal_urgency_multiplier: seasonalMultiplier,
      attachment_urls: validatedData.attachment_urls || [],
    };

    // Insert feature request
    const { data: newRequest, error } = await supabase
      .from('feature_requests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create feature request' },
        { status: 500 },
      );
    }

    // Record potential duplicates if found
    if (potentialDuplicates.length > 0) {
      const duplicateInserts = potentialDuplicates.map((duplicate) => ({
        original_request_id: newRequest.id,
        potential_duplicate_id: duplicate.id,
        similarity_score: duplicate.similarity,
        detection_method: 'ai_semantic' as const,
        ai_confidence: duplicate.similarity,
      }));

      await supabase
        .from('feature_request_duplicates')
        .insert(duplicateInserts);
    }

    // Notify product team if high priority
    if (newRequest.final_priority_score > 50) {
      await notifyProductTeam(newRequest);
    }

    return NextResponse.json(
      {
        feature_request: newRequest,
        potential_duplicates:
          potentialDuplicates.length > 0 ? potentialDuplicates : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating feature request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create feature request' },
      { status: 500 },
    );
  }
}
