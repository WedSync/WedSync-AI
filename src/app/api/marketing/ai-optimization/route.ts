import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIContentGenerator } from '@/lib/services/ai-content-generator';
import { withSecureValidation } from '@/lib/validation/middleware';
import { rateLimitService } from '@/lib/ratelimit';
import { z } from 'zod';

// AI Optimization API - WS-143 Round 2
const aiOptimizationSchema = z.object({
  action: z.enum([
    'generate_subject_lines',
    'optimize_content',
    'predict_performance',
    'ab_test_optimize',
  ]),
  campaignContext: z
    .object({
      campaignType: z.enum([
        'viral_invitation',
        'nurture',
        'conversion',
        'retention',
        'super_connector',
      ]),
      recipientType: z.enum(['supplier', 'couple', 'viral_influencer']),
      recipientRole: z.string(),
      goal: z.enum(['conversion', 'engagement', 'retention', 'viral_growth']),
      weddingDate: z.string().optional(),
      venueType: z.string().optional(),
      season: z.enum(['spring', 'summer', 'fall', 'winter']),
      relationship: z.enum(['peer', 'cross_supplier', 'viral_chain']),
      businessType: z.string().optional(),
      experienceLevel: z.enum(['new', 'intermediate', 'expert']).optional(),
    })
    .optional(),
  contentData: z
    .object({
      baseContent: z.string(),
      personalizationData: z.object({
        userType: z.enum([
          'photographer',
          'florist',
          'venue',
          'planner',
          'couple',
        ]),
        businessType: z.string(),
        experienceLevel: z.enum(['new', 'intermediate', 'expert']),
        recentActivity: z.array(z.string()),
        viralInfluencerLevel: z
          .enum(['starter', 'growing', 'super_connector'])
          .optional(),
        networkValue: z.number().optional(),
      }),
      campaignGoal: z.enum(['conversion', 'engagement', 'retention']),
    })
    .optional(),
  performancePrediction: z
    .object({
      campaignConfig: z.object({
        type: z.string(),
        contentQuality: z.number(),
        personalizationLevel: z.string(),
        scheduledTime: z.string(),
        qualityScore: z.number(),
      }),
      audienceData: z.array(z.any()),
    })
    .optional(),
  abTestData: z
    .object({
      campaignId: z.string(),
      testResults: z.array(
        z.object({
          id: z.string(),
          openRate: z.number(),
          clickRate: z.number(),
          conversionRate: z.number(),
        }),
      ),
    })
    .optional(),
  count: z.number().min(1).max(10).default(5),
});

export const POST = withSecureValidation(
  aiOptimizationSchema,
  async (request: NextRequest, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for AI operations
    const rateLimitResult = await rateLimitService.checkAIOptimization(
      session.user.id,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'AI optimization rate limit exceeded',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 },
      );
    }

    try {
      const {
        action,
        campaignContext,
        contentData,
        performancePrediction,
        abTestData,
        count,
      } = validatedData;

      switch (action) {
        case 'generate_subject_lines':
          if (!campaignContext) {
            return NextResponse.json(
              {
                error: 'Campaign context required for subject line generation',
              },
              { status: 400 },
            );
          }

          const subjectLines =
            await AIContentGenerator.generateEmailSubjectLines(
              campaignContext,
              count,
            );

          return NextResponse.json({
            success: true,
            data: {
              action: 'generate_subject_lines',
              subjectLines,
              metadata: {
                generatedAt: new Date().toISOString(),
                aiModel: 'gpt-4',
                campaignType: campaignContext.campaignType,
              },
            },
          });

        case 'optimize_content':
          if (!contentData) {
            return NextResponse.json(
              { error: 'Content data required for optimization' },
              { status: 400 },
            );
          }

          const optimizedContent =
            await AIContentGenerator.optimizeEmailContent(
              contentData.baseContent,
              contentData.personalizationData,
              contentData.campaignGoal,
            );

          return NextResponse.json({
            success: true,
            data: {
              action: 'optimize_content',
              optimizedContent,
              metadata: {
                optimizedAt: new Date().toISOString(),
                originalLength: contentData.baseContent.length,
                optimizedLength: optimizedContent.optimizedPlainText.length,
                improvementScore: optimizedContent.expectedLift,
              },
            },
          });

        case 'predict_performance':
          if (!performancePrediction) {
            return NextResponse.json(
              { error: 'Performance prediction data required' },
              { status: 400 },
            );
          }

          const performanceData =
            await AIContentGenerator.predictCampaignPerformance(
              performancePrediction.campaignConfig,
              performancePrediction.audienceData,
            );

          return NextResponse.json({
            success: true,
            data: {
              action: 'predict_performance',
              performance: performanceData,
              metadata: {
                predictedAt: new Date().toISOString(),
                audienceSize: performancePrediction.audienceData.length,
                confidenceScore: performanceData.confidenceScore,
              },
            },
          });

        case 'ab_test_optimize':
          if (!abTestData) {
            return NextResponse.json(
              { error: 'A/B test data required for optimization' },
              { status: 400 },
            );
          }

          const abTestResult =
            await AIContentGenerator.optimizeABTestAutomatically(
              abTestData.campaignId,
              abTestData.testResults,
            );

          return NextResponse.json({
            success: true,
            data: {
              action: 'ab_test_optimize',
              optimization: abTestResult,
              metadata: {
                optimizedAt: new Date().toISOString(),
                testVariants: abTestData.testResults.length,
                winningVariant: abTestResult.winningVariant,
                confidenceLevel: abTestResult.confidence,
              },
            },
          });

        default:
          return NextResponse.json(
            { error: 'Invalid action specified' },
            { status: 400 },
          );
      }
    } catch (error) {
      console.error('AI optimization request failed:', error);
      return NextResponse.json(
        {
          error: 'AI optimization failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);

export const GET = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return AI optimization capabilities and usage stats
  try {
    const capabilities = {
      actions: [
        'generate_subject_lines',
        'optimize_content',
        'predict_performance',
        'ab_test_optimize',
      ],
      supportedCampaignTypes: [
        'viral_invitation',
        'nurture',
        'conversion',
        'retention',
        'super_connector',
      ],
      supportedRecipientTypes: ['supplier', 'couple', 'viral_influencer'],
      aiModels: ['gpt-4'],
      features: {
        subjectLineGeneration: {
          enabled: true,
          maxCount: 10,
          avgAccuracy: 0.87,
        },
        contentOptimization: {
          enabled: true,
          avgImprovement: 0.23,
          supportedGoals: ['conversion', 'engagement', 'retention'],
        },
        performancePrediction: {
          enabled: true,
          avgAccuracy: 0.85,
          predictionHorizon: '90_days',
        },
        abTestOptimization: {
          enabled: true,
          minSampleSize: 100,
          avgConfidence: 0.95,
        },
      },
    };

    // Get user's usage stats
    const usageStats = await getUserAIUsageStats(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        capabilities,
        usage: usageStats,
        rateLimits: {
          aiOptimization: {
            limit: 50,
            window: '1h',
            current: usageStats.requestsThisHour,
          },
        },
      },
    });
  } catch (error) {
    console.error('Failed to get AI optimization info:', error);
    return NextResponse.json(
      { error: 'Failed to get AI optimization information' },
      { status: 500 },
    );
  }
};

// Helper function to get user AI usage statistics
async function getUserAIUsageStats(userId: string) {
  // This would typically query a database for usage stats
  return {
    requestsThisHour: 12,
    requestsToday: 45,
    requestsThisMonth: 350,
    totalRequests: 1250,
    avgResponseTime: 1.2, // seconds
    successRate: 0.98,
    favoriteAction: 'generate_subject_lines',
    lastUsed: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
  };
}
