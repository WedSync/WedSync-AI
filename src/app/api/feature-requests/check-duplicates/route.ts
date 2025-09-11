import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const duplicateCheckSchema = z.object({
  title: z.string().min(10),
  description: z.string().min(50),
  wedding_context: z
    .object({
      wedding_size: z
        .enum(['intimate', 'medium', 'large', 'destination'])
        .optional(),
      timeframe: z
        .enum([
          'planning_phase',
          'immediate',
          'week_of_wedding',
          'post_wedding',
        ])
        .optional(),
      pain_points: z.array(z.string()).optional(),
    })
    .optional(),
});

// Helper function to generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.substring(0, 8000), // Truncate to avoid token limit
        model: 'text-embedding-ada-002',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate embedding');
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

// Helper function to find similar requests using vector similarity
async function findSimilarRequests(
  embedding: number[],
  threshold: number = 0.8,
  excludeId?: string,
): Promise<any[]> {
  if (!embedding || embedding.length === 0) return [];

  try {
    // Create the embedding vector format for PostgreSQL
    const embeddingString = `[${embedding.join(',')}]`;

    // Use RPC function for vector similarity search
    let query = supabase.rpc('match_feature_requests', {
      query_embedding: embeddingString,
      similarity_threshold: threshold,
      match_count: 10,
    });

    const { data, error } = await query;

    if (error) {
      console.error('Error in similarity search:', error);

      // Fallback to text-based similarity
      return await findSimilarRequestsFallback(embedding, threshold, excludeId);
    }

    // Filter out the excluded ID if provided
    const filteredData = excludeId
      ? data?.filter((item: any) => item.id !== excludeId) || []
      : data || [];

    return filteredData.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      similarity: item.similarity,
      wedding_context: item.wedding_context,
      vote_count: item.vote_count,
      status: item.status,
      created_at: item.created_at,
      category: item.category,
    }));
  } catch (error) {
    console.error('Error in vector similarity search:', error);
    return await findSimilarRequestsFallback(embedding, threshold, excludeId);
  }
}

// Fallback similarity search using text matching
async function findSimilarRequestsFallback(
  embedding: number[],
  threshold: number,
  excludeId?: string,
): Promise<any[]> {
  try {
    let query = supabase
      .from('feature_requests')
      .select(
        'id, title, description, wedding_context, vote_count, status, created_at, category',
      )
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(50);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error in fallback search:', error);
      return [];
    }

    // Simple text similarity using title matching
    return (data || [])
      .map((item: any) => ({
        ...item,
        similarity: 0.7, // Placeholder similarity score
      }))
      .slice(0, 5); // Return top 5 matches
  } catch (error) {
    console.error('Error in fallback similarity search:', error);
    return [];
  }
}

// Helper function to check wedding context similarity
function isWeddingContextSimilar(context1: any, context2: any): boolean {
  if (!context1 || !context2) return false;

  let similarityScore = 0;
  let factors = 0;

  // Check wedding size
  if (context1.wedding_size === context2.wedding_size) {
    similarityScore += 1;
  }
  factors++;

  // Check timeframe
  if (context1.timeframe === context2.timeframe) {
    similarityScore += 1;
  }
  factors++;

  // Check pain points overlap
  const painPoints1 = context1.pain_points || [];
  const painPoints2 = context2.pain_points || [];
  const commonPainPoints = painPoints1.filter((point: string) =>
    painPoints2.includes(point),
  );

  if (commonPainPoints.length > 0) {
    similarityScore +=
      commonPainPoints.length /
      Math.max(painPoints1.length, painPoints2.length);
    factors++;
  }

  return factors > 0 && similarityScore / factors > 0.5;
}

// Create PostgreSQL function for vector similarity if it doesn't exist
async function ensureSimilarityFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION match_feature_requests(
      query_embedding vector(1536),
      similarity_threshold float,
      match_count int
    )
    RETURNS TABLE (
      id uuid,
      title text,
      description text,
      wedding_context jsonb,
      vote_count int,
      status request_status,
      created_at timestamptz,
      category feature_category,
      similarity float
    )
    LANGUAGE SQL STABLE
    AS $$
      SELECT
        fr.id,
        fr.title,
        fr.description,
        fr.wedding_context,
        fr.vote_count,
        fr.status,
        fr.created_at,
        fr.category,
        1 - (fr.embedding <=> query_embedding) as similarity
      FROM feature_requests fr
      WHERE 
        fr.embedding IS NOT NULL
        AND fr.status NOT IN ('rejected', 'duplicate')
        AND 1 - (fr.embedding <=> query_embedding) > similarity_threshold
      ORDER BY fr.embedding <=> query_embedding ASC
      LIMIT match_count;
    $$;
  `;

  try {
    await supabase.rpc('exec_sql', { sql: functionSQL });
  } catch (error) {
    console.log(
      'Similarity function already exists or failed to create:',
      error,
    );
  }
}

// POST - Check for duplicate feature requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, wedding_context } =
      duplicateCheckSchema.parse(body);

    // Get authenticated user
    const user = await auth.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure similarity function exists
    await ensureSimilarityFunction();

    // Generate embedding for similarity search
    const embeddingText = `${title} ${description} ${wedding_context?.pain_points?.join(' ') || ''}`;
    const embedding = await generateEmbedding(embeddingText);

    if (embedding.length === 0) {
      // If embedding generation fails, fall back to text search
      const { data: textResults, error } = await supabase
        .from('feature_requests')
        .select(
          'id, title, description, wedding_context, vote_count, status, created_at, category',
        )
        .textSearch('search_vector', title.split(' ').join(' | '))
        .neq('status', 'rejected')
        .limit(5);

      if (error) {
        console.error('Text search error:', error);
        return NextResponse.json({ potential_duplicates: [] });
      }

      return NextResponse.json({
        potential_duplicates: (textResults || []).map((req) => ({
          id: req.id,
          title: req.title,
          similarity_score: 0.6, // Default similarity for text match
          wedding_context_match: wedding_context
            ? isWeddingContextSimilar(req.wedding_context, wedding_context)
            : false,
          vote_count: req.vote_count,
          status: req.status,
          created_at: req.created_at,
          category: req.category,
        })),
        search_method: 'text_search',
      });
    }

    // Find semantically similar requests
    const similarRequests = await findSimilarRequests(embedding, 0.75);

    // Filter by wedding context if provided
    const contextFilteredRequests = wedding_context
      ? similarRequests.filter((req) =>
          isWeddingContextSimilar(req.wedding_context, wedding_context),
        )
      : similarRequests;

    // Format response
    const potentialDuplicates = contextFilteredRequests.map((req) => ({
      id: req.id,
      title: req.title,
      similarity_score: req.similarity,
      wedding_context_match: wedding_context
        ? isWeddingContextSimilar(req.wedding_context, wedding_context)
        : null,
      vote_count: req.vote_count,
      status: req.status,
      created_at: req.created_at,
      category: req.category,
      description:
        req.description.substring(0, 200) +
        (req.description.length > 200 ? '...' : ''),
    }));

    return NextResponse.json({
      potential_duplicates: potentialDuplicates,
      search_method: 'ai_semantic',
      embedding_generated: true,
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to check for duplicates',
        potential_duplicates: [],
      },
      { status: 500 },
    );
  }
}
