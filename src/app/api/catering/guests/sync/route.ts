import { NextRequest, NextResponse } from 'next/server';
import { GuestManagementIntegration } from '@/lib/integrations/GuestManagementIntegration';
import { DietaryNotificationService } from '@/lib/integrations/DietaryNotificationService';
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { z } from 'zod';

// Guest sync validation schema
const guestSyncSchema = z.object({
  weddingId: z.string().uuid('Invalid wedding ID format'),
  guests: z
    .array(
      z.object({
        name: z.string().min(1, 'Guest name is required'),
        email: z.string().email('Invalid email format').optional(),
        dietaryNotes: z.string().optional(),
        dietaryVerified: z.boolean().optional().default(false),
        emergencyContact: z.string().optional(),
        rsvpStatus: z.string().optional(),
      }),
    )
    .min(1, 'At least one guest is required'),
  options: z
    .object({
      notifyHighRisk: z.boolean().default(true),
      sendVerificationEmails: z.boolean().default(false),
      overwriteExisting: z.boolean().default(false),
    })
    .optional()
    .default({}),
});

// External import schema
const externalImportSchema = z.object({
  weddingId: z.string().uuid('Invalid wedding ID format'),
  system: z.enum(['rsvpify', 'the_knot', 'wedding_wire', 'zola']),
  credentials: z.object({
    apiUrl: z.string().url('Invalid API URL'),
    apiKey: z.string().min(1, 'API key is required'),
    eventId: z.string().optional(),
  }),
});

// Initialize services
const guestIntegration = new GuestManagementIntegration();
const notificationService = new DietaryNotificationService();

export async function POST(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ body, user }) => {
      try {
        // Validate request body
        const validatedData = guestSyncSchema.parse(body);

        // Check user permissions - must be part of organization
        if (!user.organizationId) {
          return NextResponse.json(
            {
              error: 'Organization membership required',
              code: 'NO_ORGANIZATION',
            },
            { status: 403 },
          );
        }

        // Check if user has access to this wedding
        // TODO: Add wedding ownership verification

        const { weddingId, guests, options } = validatedData;

        console.log(`[GUEST SYNC] Starting sync for wedding ${weddingId}`, {
          userId: user.id,
          organizationId: user.organizationId,
          guestCount: guests.length,
          options,
        });

        // Perform guest dietary requirements sync
        const syncResult = await guestIntegration.syncGuestDietaryRequirements(
          weddingId,
          guests,
        );

        // Handle high-risk requirements notification
        if (options?.notifyHighRisk && syncResult.newRequirements > 0) {
          // Check for high-risk requirements (severity >= 4)
          const highRiskGuests = guests.filter(
            (guest) =>
              guest.dietaryNotes &&
              (guest.dietaryNotes.toLowerCase().includes('severe') ||
                guest.dietaryNotes.toLowerCase().includes('anaphylactic') ||
                guest.dietaryNotes.toLowerCase().includes('epipen')),
          );

          for (const guest of highRiskGuests) {
            if (guest.dietaryNotes) {
              try {
                await notificationService.notifyHighRiskRequirement(weddingId, {
                  id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                  guestName: guest.name,
                  category: 'High Risk Dietary Requirement',
                  severity: 5,
                  notes: guest.dietaryNotes,
                  emergencyContact: guest.emergencyContact,
                });
              } catch (notificationError) {
                console.warn(
                  `[NOTIFICATION WARNING] Failed to send high-risk alert for ${guest.name}:`,
                  notificationError,
                );
              }
            }
          }
        }

        // Send verification emails if requested
        if (options?.sendVerificationEmails) {
          const guestsWithEmail = guests.filter(
            (g) => g.email && g.dietaryNotes,
          );

          for (const guest of guestsWithEmail) {
            try {
              await notificationService.sendGuestVerificationRequest(
                weddingId,
                guest.email!,
                [
                  {
                    id: `temp_${Date.now()}`,
                    category: 'General Dietary Requirement',
                    notes: guest.dietaryNotes || '',
                    severity: 3,
                  },
                ],
              );
            } catch (verificationError) {
              console.warn(
                `[VERIFICATION WARNING] Failed to send verification email to ${guest.email}:`,
                verificationError,
              );
            }
          }
        }

        console.log(
          `[GUEST SYNC SUCCESS] Synced ${syncResult.totalGuests} guests`,
          {
            weddingId,
            totalGuests: syncResult.totalGuests,
            requirementsFound: syncResult.requirementsFound,
            newRequirements: syncResult.newRequirements,
            updatedRequirements: syncResult.updatedRequirements,
            errors: syncResult.errors.length,
          },
        );

        return NextResponse.json({
          success: true,
          data: {
            syncId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            weddingId,
            ...syncResult,
            processedAt: new Date().toISOString(),
            notifications: {
              highRiskAlertsSent: options?.notifyHighRisk
                ? guests.filter((g) =>
                    g.dietaryNotes?.toLowerCase().includes('severe'),
                  ).length
                : 0,
              verificationEmailsSent: options?.sendVerificationEmails
                ? guests.filter((g) => g.email && g.dietaryNotes).length
                : 0,
            },
          },
        });
      } catch (error: any) {
        console.error('[GUEST SYNC ERROR]', error);

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

        return NextResponse.json(
          {
            error: 'Guest sync failed',
            code: 'GUEST_SYNC_ERROR',
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
      bodySchema: guestSyncSchema,
      rateLimitKey: 'guest_sync',
      rateLimitMax: 20,
      rateLimitWindowMs: 60000,
    },
  );
}

export async function PUT(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ body, user }) => {
      try {
        // External system import validation
        const validatedData = externalImportSchema.parse(body);

        if (!user.organizationId) {
          return NextResponse.json(
            {
              error: 'Organization membership required',
              code: 'NO_ORGANIZATION',
            },
            { status: 403 },
          );
        }

        const { weddingId, system, credentials } = validatedData;

        console.log(
          `[EXTERNAL IMPORT] Starting import from ${system} for wedding ${weddingId}`,
          {
            userId: user.id,
            organizationId: user.organizationId,
            system,
          },
        );

        // Perform external system import
        const importResult = await guestIntegration.importFromExternalSystem(
          weddingId,
          system,
          credentials,
        );

        console.log(
          `[EXTERNAL IMPORT SUCCESS] Imported ${importResult.importedCount} guests from ${system}`,
          {
            weddingId,
            system,
            importedCount: importResult.importedCount,
            requirementsFound: importResult.requirementsFound,
            errors: importResult.errors.length,
          },
        );

        return NextResponse.json({
          success: true,
          data: {
            importId: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            weddingId,
            ...importResult,
            processedAt: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        console.error('[EXTERNAL IMPORT ERROR]', error);

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

        if (error.message?.includes('API')) {
          return NextResponse.json(
            {
              error: 'External system connection failed',
              code: 'EXTERNAL_API_ERROR',
              message: 'Could not connect to external guest management system',
            },
            { status: 502 },
          );
        }

        return NextResponse.json(
          {
            error: 'External import failed',
            code: 'IMPORT_ERROR',
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
      bodySchema: externalImportSchema,
      rateLimitKey: 'external_import',
      rateLimitMax: 5, // Very restrictive for external API calls
      rateLimitWindowMs: 300000, // 5 minutes
    },
  );
}

export async function GET(request: NextRequest) {
  return withSecureValidation(
    request,
    async ({ user, query }) => {
      try {
        const weddingId = query?.weddingId as string;

        if (!weddingId) {
          return NextResponse.json(
            {
              error: 'Wedding ID required',
              code: 'MISSING_WEDDING_ID',
            },
            { status: 400 },
          );
        }

        // Get dietary analytics for the wedding
        const analytics = await guestIntegration.getDietaryAnalytics(weddingId);

        if (!analytics) {
          return NextResponse.json(
            {
              error: 'Wedding not found or no dietary requirements',
              code: 'NOT_FOUND',
            },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            weddingId,
            analytics,
            supportedSystems: [
              {
                name: 'RSVPify',
                status: 'active',
                features: ['dietary_notes', 'email_sync'],
              },
              {
                name: 'The Knot',
                status: 'planned',
                features: ['basic_import'],
              },
              {
                name: 'Wedding Wire',
                status: 'planned',
                features: ['basic_import'],
              },
              { name: 'Zola', status: 'planned', features: ['basic_import'] },
            ],
            exportFormats: ['csv', 'excel', 'json', 'pdf'],
            lastUpdated: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        console.error('[GUEST ANALYTICS ERROR]', error);

        return NextResponse.json(
          {
            error: 'Failed to retrieve guest analytics',
            code: 'ANALYTICS_ERROR',
          },
          { status: 500 },
        );
      }
    },
    {
      requireAuth: true,
      requireOrganization: true,
      rateLimitKey: 'guest_analytics',
      rateLimitMax: 100,
      rateLimitWindowMs: 60000,
    },
  );
}
