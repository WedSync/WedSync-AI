import { NextRequest, NextResponse } from 'next/server';
import { OpenAIDietaryService } from '@/lib/integrations/OpenAIDietaryService';
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { z } from 'zod';

// Menu generation validation schema
const menuGenerationSchema = z.object({
  guestCount: z
    .number()
    .int()
    .min(1, 'Guest count must be at least 1')
    .max(1000, 'Guest count cannot exceed 1000'),
  dietaryRequirements: z.object({
    allergies: z.array(z.string()),
    diets: z.array(z.string()),
    medical: z.array(z.string()),
    preferences: z.array(z.string()),
  }),
  menuStyle: z.string().min(1, 'Menu style is required'),
  budgetPerPerson: z.number().positive('Budget per person must be positive'),
  culturalPreferences: z.array(z.string()).default([]),
  seasonalIngredients: z.array(z.string()).default([]),
  weddingContext: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'late_night']),
    venueType: z.string().min(1, 'Venue type is required'),
    duration: z
      .number()
      .int()
      .min(1)
      .max(12, 'Duration must be between 1 and 12 hours'),
  }),
  options: z
    .object({
      useCache: z.boolean().default(true),
      priority: z.enum(['low', 'normal', 'high']).default('normal'),
      includeAlternatives: z.boolean().default(true),
    })
    .optional()
    .default({}),
});

// Initialize OpenAI service
const openAIService = new OpenAIDietaryService({
  apiKey: process.env.OPENAI_API_KEY!,
  maxRetries: 3,
  timeout: 60000, // Longer timeout for menu generation
});

export async function POST(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ body, user }) => {
      try {
        // Validate request body
        const validatedData = menuGenerationSchema.parse(body);

        // Check user permissions
        if (!user.organizationId) {
          return NextResponse.json(
            {
              error: 'Organization membership required for menu generation',
              code: 'NO_ORGANIZATION',
            },
            { status: 403 },
          );
        }

        // Check if this is a high-priority request for premium users
        const options = {
          useCache: validatedData.options?.useCache ?? true,
          priority: validatedData.options?.priority ?? 'normal',
        };

        // Log the request
        console.log(
          `[MENU GENERATION] User ${user.id} generating menu for ${validatedData.guestCount} guests`,
          {
            userId: user.id,
            organizationId: user.organizationId,
            guestCount: validatedData.guestCount,
            budgetPerPerson: validatedData.budgetPerPerson,
            allergies: validatedData.dietaryRequirements.allergies.length,
            diets: validatedData.dietaryRequirements.diets.length,
            priority: options.priority,
          },
        );

        // Generate menu
        const menuResult = await openAIService.generateDietaryCompliantMenu(
          {
            guestCount: validatedData.guestCount,
            dietaryRequirements: validatedData.dietaryRequirements,
            menuStyle: validatedData.menuStyle,
            budgetPerPerson: validatedData.budgetPerPerson,
            culturalPreferences: validatedData.culturalPreferences,
            seasonalIngredients: validatedData.seasonalIngredients,
            weddingContext: validatedData.weddingContext,
          },
          user.id,
          options,
        );

        // Calculate estimated preparation time and complexity
        const estimatedPrepTime = menuResult.preparationAnalysis.totalPrepTime;
        const complexityScore = menuResult.preparationAnalysis.complexityScore;

        // Check if menu meets compliance standards
        const complianceScore = menuResult.complianceAnalysis.overallScore;
        if (complianceScore < 0.8) {
          console.warn(
            `[MENU COMPLIANCE WARNING] Low compliance score: ${complianceScore}`,
            {
              menuId: menuResult.menuId,
              userId: user.id,
              complianceScore,
            },
          );
        }

        // Log successful generation
        console.log(
          `[MENU GENERATION SUCCESS] Menu generated for ${validatedData.guestCount} guests`,
          {
            menuId: menuResult.menuId,
            userId: user.id,
            complianceScore,
            costPerPerson: menuResult.costAnalysis.costPerPerson,
            prepTime: estimatedPrepTime,
            complexity: complexityScore,
            tokensUsed: menuResult.metadata.tokensUsed,
          },
        );

        return NextResponse.json({
          success: true,
          data: {
            ...menuResult,
            processedAt: new Date().toISOString(),
            requestId: `menu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            estimations: {
              preparationTime: `${Math.ceil(estimatedPrepTime / 60)} hours`,
              complexity:
                complexityScore <= 2
                  ? 'Simple'
                  : complexityScore <= 3
                    ? 'Moderate'
                    : 'Complex',
              staffRequired:
                menuResult.preparationAnalysis.staffingRequirements,
              equipmentNeeded: menuResult.preparationAnalysis.equipmentNeeded,
            },
          },
        });
      } catch (error: any) {
        console.error('[MENU GENERATION ERROR]', error);

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: error.errors,
            },
            { status: 400 },
          );
        }

        if (error.message?.includes('Rate limit exceeded')) {
          return NextResponse.json(
            {
              error: 'Menu generation rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              message:
                'Too many menu generation requests. Please try again in a few minutes.',
              retryAfter: 60,
            },
            { status: 429, headers: { 'Retry-After': '60' } },
          );
        }

        if (error.message?.includes('Circuit breaker')) {
          return NextResponse.json(
            {
              error: 'Service temporarily unavailable',
              code: 'SERVICE_UNAVAILABLE',
              message:
                'Menu generation service is temporarily down. Please try again later.',
            },
            { status: 503 },
          );
        }

        return NextResponse.json(
          {
            error: 'Menu generation failed',
            code: 'MENU_GENERATION_ERROR',
            message:
              process.env.NODE_ENV === 'development'
                ? error.message
                : 'Internal server error',
          },
          { status: 500 },
        );
      }
    },
    {
      requireAuth: true,
      requireOrganization: true,
      bodySchema: menuGenerationSchema,
      rateLimitKey: 'menu_generation',
      rateLimitMax: 10, // More restrictive for AI operations
      rateLimitWindowMs: 60000,
    },
  );
}

export async function GET(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ user, query }) => {
      try {
        // Get menu generation service status and pricing info
        const healthStatus = await openAIService.getServiceHealth();

        return NextResponse.json({
          success: true,
          service: 'menu-generation',
          health: healthStatus,
          pricing: {
            gpt4: '$0.03 per 1k tokens',
            gpt35turbo: '$0.002 per 1k tokens',
            estimatedCost: {
              smallMenu: '$0.15 - $0.30',
              largeMenu: '$0.50 - $1.00',
            },
          },
          limits: {
            maxGuests: 1000,
            maxDuration: 12,
            rateLimit: '10 requests per minute',
          },
          features: [
            'AI-powered menu generation',
            'Dietary compliance checking',
            'Cost optimization',
            'Cultural preference integration',
            'Seasonal ingredient suggestions',
            'Equipment and staffing recommendations',
          ],
        });
      } catch (error: any) {
        return NextResponse.json(
          {
            error: 'Service status check failed',
            code: 'HEALTH_CHECK_ERROR',
          },
          { status: 500 },
        );
      }
    },
    {
      requireAuth: true,
      rateLimitKey: 'menu_status_check',
      rateLimitMax: 30,
      rateLimitWindowMs: 60000,
    },
  );
}
