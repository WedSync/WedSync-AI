/**
 * WS-148 Round 2: Searchable Encryption API Endpoint
 *
 * GET /api/encryption/search
 *
 * Performance Requirement: Search response time under 1 second
 * Security Level: P0 - CRITICAL
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedEncryptionMiddleware } from '@/lib/security/advanced-encryption-middleware';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Request validation schema
const SearchEncryptedRequestSchema = z.object({
  query: z.string().min(1).max(255),
  field_type: z.string().optional(),
  search_type: z.enum(['exact', 'partial', 'fuzzy']).default('exact'),
  limit: z.number().int().positive().max(1000).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

type SearchEncryptedRequest = z.infer<typeof SearchEncryptedRequestSchema>;

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const supabase = createClientComponentClient();

  try {
    // Authenticate user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const requestParams = {
      query: searchParams.get('query'),
      field_type: searchParams.get('field_type'),
      search_type: searchParams.get('search_type') || 'exact',
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    };

    // Validate request parameters
    const validatedRequest = SearchEncryptedRequestSchema.parse(requestParams);

    // Get user key for tenant isolation
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 },
      );
    }

    const userKey = profile.organization_id;

    // Call database function to search encrypted fields
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'encryption.search_encrypted_field',
      {
        search_query: validatedRequest.query,
        search_type: validatedRequest.search_type,
        table_name: validatedRequest.field_type || null,
        limit_results: validatedRequest.limit,
      },
    );

    if (searchError) {
      throw new Error(`Search query failed: ${searchError.message}`);
    }

    // Create searchable encryption for the query (for future optimization)
    const searchableEncryption =
      await advancedEncryptionMiddleware.createSearchableEncryption(
        validatedRequest.query,
        userKey,
        validatedRequest.search_type,
      );

    const searchTime = performance.now() - startTime;

    // Record search performance metrics
    await supabase.from('encryption.performance_metrics_v2').insert({
      operation_type: `searchable_encryption_${validatedRequest.search_type}`,
      user_id: session.user.id,
      field_count: searchResults?.length || 0,
      processing_time_ms: Math.round(searchTime),
      success_rate: searchError ? 0 : 1,
    });

    // WS-148 Performance Validation
    const performanceValidation = {
      meets_search_requirement: searchTime < 1000,
      actual_time_ms: Math.round(searchTime),
      target_time_ms: 1000,
      results_count: searchResults?.length || 0,
      search_type: validatedRequest.search_type,
    };

    // Log performance warning if target not met
    if (searchTime > 1000) {
      console.warn(
        `WS-148 Performance Target Violation: Search query took ${searchTime}ms (target: <1000ms)`,
      );
    }

    // Format results for response
    const formattedResults = (searchResults || []).map((result: any) => ({
      record_id: result.record_id,
      table_name: result.table_name,
      column_name: result.column_name,
      relevance_score: parseFloat(result.relevance_score || '0'),
      search_type: validatedRequest.search_type,
    }));

    return NextResponse.json({
      success: true,
      query: validatedRequest.query,
      search_type: validatedRequest.search_type,
      results: formattedResults,
      performance: performanceValidation,
      pagination: {
        limit: validatedRequest.limit,
        offset: validatedRequest.offset,
        total_results: formattedResults.length,
        has_more: formattedResults.length === validatedRequest.limit,
      },
      search_metadata: {
        searchable_hash: searchableEncryption.searchable_hash,
        searchable_ngrams: searchableEncryption.searchable_ngrams?.length || 0,
        searchable_phonetics:
          searchableEncryption.searchable_phonetics?.length || 0,
      },
    });
  } catch (error) {
    console.error('Encrypted search failed:', error);

    // Record failure metrics
    const searchTime = performance.now() - startTime;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('encryption.performance_metrics_v2').insert({
          operation_type: 'searchable_encryption_error',
          user_id: session.user.id,
          processing_time_ms: Math.round(searchTime),
          success_rate: 0,
          error_details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : null,
          },
        });
      }
    } catch (metricsError) {
      console.error('Failed to record error metrics:', metricsError);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Search failed',
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// POST /api/encryption/search - Advanced search with multiple queries
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const supabase = createClientComponentClient();

  try {
    // Authenticate user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await request.json();
    const searchQueries = z
      .array(SearchEncryptedRequestSchema.omit({ offset: true }))
      .parse(body.queries || [body]);

    if (searchQueries.length === 0) {
      return NextResponse.json(
        { error: 'No search queries provided' },
        { status: 400 },
      );
    }

    // Get user key
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 },
      );
    }

    const userKey = profile.organization_id;

    // Execute multiple searches in parallel
    const searchPromises = searchQueries.map(async (queryParams, index) => {
      const queryStartTime = performance.now();

      try {
        // Execute database search
        const { data: results, error } = await supabase.rpc(
          'encryption.search_encrypted_field',
          {
            search_query: queryParams.query,
            search_type: queryParams.search_type,
            table_name: queryParams.field_type || null,
            limit_results: queryParams.limit,
          },
        );

        if (error) {
          throw new Error(`Query ${index + 1} failed: ${error.message}`);
        }

        const queryTime = performance.now() - queryStartTime;

        return {
          query_index: index,
          query: queryParams.query,
          search_type: queryParams.search_type,
          results: (results || []).map((result: any) => ({
            record_id: result.record_id,
            table_name: result.table_name,
            column_name: result.column_name,
            relevance_score: parseFloat(result.relevance_score || '0'),
          })),
          performance: {
            processing_time_ms: Math.round(queryTime),
            results_count: results?.length || 0,
          },
        };
      } catch (queryError) {
        return {
          query_index: index,
          query: queryParams.query,
          search_type: queryParams.search_type,
          error:
            queryError instanceof Error ? queryError.message : 'Unknown error',
          results: [],
          performance: {
            processing_time_ms: Math.round(performance.now() - queryStartTime),
            results_count: 0,
          },
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const totalTime = performance.now() - startTime;

    // Record batch search metrics
    await supabase.from('encryption.performance_metrics_v2').insert({
      operation_type: 'batch_search',
      user_id: session.user.id,
      field_count: searchResults.reduce(
        (sum, result) => sum + result.results.length,
        0,
      ),
      processing_time_ms: Math.round(totalTime),
      success_rate:
        searchResults.filter((r) => !r.error).length / searchResults.length,
    });

    // WS-148 Performance Validation
    const maxQueryTime = Math.max(
      ...searchResults.map((r) => r.performance.processing_time_ms),
    );
    const performanceValidation = {
      meets_search_requirement: maxQueryTime < 1000,
      max_query_time_ms: maxQueryTime,
      avg_query_time_ms: Math.round(
        searchResults.reduce(
          (sum, r) => sum + r.performance.processing_time_ms,
          0,
        ) / searchResults.length,
      ),
      target_time_ms: 1000,
      total_queries: searchResults.length,
      successful_queries: searchResults.filter((r) => !r.error).length,
    };

    return NextResponse.json({
      success: true,
      batch_results: searchResults,
      performance: performanceValidation,
      summary: {
        total_queries: searchResults.length,
        successful_queries: searchResults.filter((r) => !r.error).length,
        total_results: searchResults.reduce(
          (sum, result) => sum + result.results.length,
          0,
        ),
        processing_time_ms: Math.round(totalTime),
      },
    });
  } catch (error) {
    console.error('Batch search failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Batch search failed',
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
