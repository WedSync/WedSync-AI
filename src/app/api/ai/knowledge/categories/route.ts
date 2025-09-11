/**
 * AI Knowledge Base Categories API
 * Team B - WS-210 Implementation
 *
 * Provides endpoints for browsing content by category and getting category statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { KnowledgeBaseEngine } from '@/lib/ai/knowledge-base-engine';
import { ContentClassifier } from '@/lib/ai/content-classifier';
import { logger } from '@/lib/logger';
import { ratelimit } from '@/lib/ratelimit';

// Initialize services
const knowledgeEngine = new KnowledgeBaseEngine(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
  process.env.OPENAI_API_KEY ||
    (() => {
      throw new Error('Missing environment variable: OPENAI_API_KEY');
    })(),
);

const contentClassifier = new ContentClassifier({
  apiKey:
    process.env.OPENAI_API_KEY ||
    (() => {
      throw new Error('Missing environment variable: OPENAI_API_KEY');
    })(),
} as any);

// Request validation schemas
const CategoryQuerySchema = z.object({
  organization_id: z.string().uuid(),
  category: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

/**
 * GET /api/ai/knowledge/categories - Get documents by category or list all categories
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get('organization_id');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate required organization_id
    if (!organization_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: organization_id' },
        { status: 400 },
      );
    }

    // Rate limiting
    const rateLimitResult = await ratelimit.limit(organization_id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          reset: rateLimitResult.reset,
          remaining: rateLimitResult.remaining,
        },
        { status: 429 },
      );
    }

    // If category is specified, get documents for that category
    if (category) {
      const validatedQuery = CategoryQuerySchema.parse({
        organization_id,
        category,
        limit,
        offset,
      });

      logger.info('Fetching documents by category', {
        organization_id,
        category,
        limit,
        offset,
      });

      const documents = await knowledgeEngine.getDocumentsByCategory(
        organization_id,
        category,
      );

      // Apply pagination
      const paginatedDocs = documents.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        category,
        documents: paginatedDocs,
        total: documents.length,
        limit,
        offset,
        has_more: offset + limit < documents.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Otherwise, get all available categories with statistics
    logger.info('Fetching knowledge base categories', { organization_id });

    const stats = await knowledgeEngine.getKnowledgeBaseStats(organization_id);
    const availableCategories = contentClassifier.getAvailableCategories();

    // Build category info with descriptions
    const categoriesWithInfo = availableCategories.map((cat) => ({
      category: cat,
      description: contentClassifier.getCategoryDescription(cat),
      document_count:
        stats.categories?.find((c: any) => c.category === cat)?.count || 0,
    }));

    // Sort by document count (highest first)
    categoriesWithInfo.sort((a, b) => b.document_count - a.document_count);

    return NextResponse.json({
      success: true,
      categories: categoriesWithInfo,
      total_categories: availableCategories.length,
      total_documents: stats.total_documents,
      last_updated: stats.last_updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Categories API failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Categories operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ai/knowledge/categories - Classify content and suggest category
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request
    const ClassifyRequestSchema = z.object({
      title: z.string().min(1).max(500),
      content: z.string().min(10).max(50000),
      source_type: z.enum([
        'faq',
        'vendor-profile',
        'service-package',
        'policy',
        'guide',
        'pricing',
      ]),
      organization_id: z.string().uuid(),
      include_details: z.boolean().optional().default(false),
    });

    const validatedRequest = ClassifyRequestSchema.parse(body);
    const { title, content, source_type, organization_id, include_details } =
      validatedRequest;

    // Rate limiting
    const rateLimitResult = await ratelimit.limit(organization_id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          reset: rateLimitResult.reset,
          remaining: rateLimitResult.remaining,
        },
        { status: 429 },
      );
    }

    logger.info('Content classification requested', {
      organization_id,
      source_type,
      title: title.substring(0, 50) + '...',
      include_details,
    });

    // Perform classification
    if (include_details) {
      const result = await contentClassifier.getDetailedClassification(
        title,
        content,
        source_type,
      );

      return NextResponse.json({
        success: true,
        classification: result,
        timestamp: new Date().toISOString(),
      });
    } else {
      const category = await contentClassifier.classifyWeddingContent(
        title,
        content,
        source_type,
      );

      return NextResponse.json({
        success: true,
        category,
        description: contentClassifier.getCategoryDescription(category as any),
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Content classification failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid classification request',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Classification operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
