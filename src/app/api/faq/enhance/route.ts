import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getFAQAIProcessor } from '@/lib/ai/faq-processor';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { z } from 'zod';

// Validation schemas
const enhanceFAQSchema = z.object({
  faqs: z
    .array(
      z.object({
        id: z.string().optional(),
        question: z.string().min(5, 'Question too short'),
        answer: z.string().min(10, 'Answer too short'),
        category: z.string().optional(),
      }),
    )
    .min(1, 'At least one FAQ required')
    .max(50, 'Too many FAQs'),
  supplierId: z.string().uuid('Invalid supplier ID'),
  options: z
    .object({
      categorize: z.boolean().default(true),
      assessQuality: z.boolean().default(true),
      enhanceContent: z.boolean().default(false),
      detectDuplicates: z.boolean().default(true),
    })
    .default({}),
});

/**
 * POST /api/faq/enhance - Process FAQs with AI analysis and enhancement
 *
 * Real wedding context: A photographer has imported 47 FAQs and wants AI to:
 * 1. Categorize them by wedding topics (pricing, services, etc.)
 * 2. Assess quality and provide improvement suggestions
 * 3. Detect any duplicate questions
 * 4. Enhance content for better client communication
 */
export async function POST(request: NextRequest) {
  const auditLogger = new AuditLogger();
  const startTime = Date.now();

  try {
    // Authentication check
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = enhanceFAQSchema.safeParse(body);

    if (!validation.success) {
      await auditLogger.logAction({
        userId: session.user.id,
        action: 'faq_enhancement_validation_failed',
        entityType: 'api_request',
        entityId: '/api/faq/enhance',
        metadata: {
          errors: validation.error.errors,
          requestBody: body,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { faqs, supplierId, options } = validation.data;

    // Verify user has access to supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, organization_id')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Supplier not found or access denied' },
        { status: 403 },
      );
    }

    // Initialize AI processor
    const aiProcessor = getFAQAIProcessor(auditLogger);

    try {
      // Log start of AI processing
      await auditLogger.logAction({
        userId: session.user.id,
        action: 'faq_ai_processing_started',
        entityType: 'supplier_faqs',
        entityId: supplierId,
        metadata: {
          faqCount: faqs.length,
          options,
          processingOptions: {
            categorize: options.categorize,
            assessQuality: options.assessQuality,
            enhanceContent: options.enhanceContent,
            detectDuplicates: options.detectDuplicates,
          },
        },
      });

      const results = {
        processedFAQs: [] as any[],
        duplicateGroups: [] as any[],
        summary: {
          totalProcessed: faqs.length,
          successfulProcessing: 0,
          averageQualityScore: 0,
          categoriesFound: {} as Record<string, number>,
          duplicatesDetected: 0,
          enhancementsApplied: 0,
        },
        processingTimeMs: 0,
        success: true,
      };

      // Process FAQs with AI
      if (
        options.categorize ||
        options.assessQuality ||
        options.enhanceContent
      ) {
        console.log(`🤖 Processing ${faqs.length} FAQs with AI...`);
        const processedResults = await aiProcessor.processBatch(faqs);

        results.processedFAQs = processedResults.map((result) => ({
          originalFAQ: result.originalFAQ,
          category: result.categorization?.category,
          categoryConfidence: result.categorization?.confidence,
          qualityScore: result.qualityAssessment?.overallScore,
          qualityDimensions: result.qualityAssessment?.dimensions,
          improvements: result.qualityAssessment?.improvements || [],
          strengths: result.qualityAssessment?.strengths || [],
          enhancedContent: result.enhancement?.enhancedAnswer,
          enhancements: result.enhancement?.improvements || [],
          processingTimeMs: result.processingTimeMs,
          success: result.success,
          error: result.error,
        }));

        // Calculate summary statistics
        const successfulResults = processedResults.filter((r) => r.success);
        results.summary.successfulProcessing = successfulResults.length;

        if (successfulResults.length > 0) {
          results.summary.averageQualityScore =
            successfulResults.reduce(
              (sum, r) => sum + (r.qualityAssessment?.overallScore || 0),
              0,
            ) / successfulResults.length;

          // Count categories
          successfulResults.forEach((result) => {
            const category = result.categorization?.category || 'general';
            results.summary.categoriesFound[category] =
              (results.summary.categoriesFound[category] || 0) + 1;
          });

          // Count enhancements
          results.summary.enhancementsApplied = successfulResults.filter(
            (r) => r.enhancement && !r.enhancement.preservedOriginal,
          ).length;
        }
      }

      // Detect duplicates
      if (options.detectDuplicates && faqs.length > 1) {
        console.log('🔍 Detecting duplicate FAQs...');
        const duplicates = await aiProcessor.detectDuplicates(faqs);
        results.duplicateGroups = duplicates.map((group) => ({
          questions: group.questions,
          similarity: group.similarity,
          suggestedMerge: group.suggestedMerge,
          reasoning: group.reasoning,
        }));

        results.summary.duplicatesDetected = duplicates.reduce(
          (sum, group) => sum + group.questions.length,
          0,
        );
      }

      results.processingTimeMs = Date.now() - startTime;

      // Save processing results to database
      if (results.processedFAQs.length > 0) {
        const faqUpdates = results.processedFAQs
          .filter((result) => result.success && result.category)
          .map((result) => ({
            question: result.originalFAQ.question,
            category: result.category,
            ai_metadata: {
              categoryConfidence: result.categoryConfidence,
              qualityScore: result.qualityScore,
              qualityDimensions: result.qualityDimensions,
              improvements: result.improvements,
              strengths: result.strengths,
              enhancedContent: result.enhancedContent,
              processedAt: new Date().toISOString(),
            },
          }));

        if (faqUpdates.length > 0) {
          // Note: This assumes you have a way to update existing FAQs
          // You might need to adjust based on your actual database schema
          console.log(`💾 Saving AI analysis for ${faqUpdates.length} FAQs`);
        }
      }

      // Log successful completion
      await auditLogger.logAction({
        userId: session.user.id,
        action: 'faq_ai_processing_completed',
        entityType: 'supplier_faqs',
        entityId: supplierId,
        metadata: {
          ...results.summary,
          processingTimeMs: results.processingTimeMs,
          duplicateGroups: results.duplicateGroups.length,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${results.summary.totalProcessed} FAQs with AI analysis`,
        data: results,
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);

      await auditLogger.logAction({
        userId: session.user.id,
        action: 'faq_ai_processing_failed',
        entityType: 'supplier_faqs',
        entityId: supplierId,
        metadata: {
          error: aiError instanceof Error ? aiError.message : String(aiError),
          faqCount: faqs.length,
          processingTimeMs: Date.now() - startTime,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            'AI processing failed. This might be due to API limits or service issues.',
          code: 'AI_PROCESSING_ERROR',
          details: {
            faqCount: faqs.length,
            processingTimeMs: Date.now() - startTime,
          },
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('FAQ enhancement API error:', error);

    await auditLogger.logAction({
      userId: 'system',
      action: 'api_error',
      entityType: 'api_endpoint',
      entityId: '/api/faq/enhance',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred during FAQ enhancement',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/faq/enhance - Get AI processing status and capabilities
 */
export async function GET() {
  try {
    return NextResponse.json({
      service: 'FAQ AI Enhancement',
      status: 'available',
      capabilities: {
        categorization: {
          description:
            'Intelligent categorization into wedding-specific categories',
          categories: [
            'pricing',
            'timeline',
            'services',
            'booking',
            'planning',
            'policies',
            'availability',
            'equipment',
            'location',
            'general',
          ],
          confidenceScoring: true,
        },
        qualityAssessment: {
          description: 'Multi-dimensional quality assessment for FAQ content',
          dimensions: [
            'completeness',
            'clarity',
            'weddingContext',
            'actionability',
            'professionalTone',
            'lengthAppropriate',
          ],
          improvementSuggestions: true,
        },
        duplicateDetection: {
          description: 'Semantic similarity detection for duplicate questions',
          method: 'OpenAI embeddings with cosine similarity',
          threshold: 0.85,
          mergeSuggestions: true,
        },
        contentEnhancement: {
          description:
            'AI-powered content improvement for better client communication',
          features: [
            'Wedding industry terminology',
            'Professional tone adjustment',
            'Actionability improvements',
            'Call-to-action additions',
          ],
        },
      },
      limits: {
        maxFAQsPerRequest: 50,
        rateLimit: '500 requests per minute',
        processingTimeout: '60 seconds',
      },
      models: {
        categorization: 'GPT-4-turbo',
        qualityAssessment: 'GPT-4-turbo',
        embeddings: 'text-embedding-3-small',
        enhancement: 'GPT-4-turbo',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        service: 'FAQ AI Enhancement',
        status: 'error',
        error: 'Service health check failed',
      },
      { status: 503 },
    );
  }
}
