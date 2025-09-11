// WS-254 Team D: Dietary Requirements API - Create and List
import { NextRequest, NextResponse } from 'next/server';
import {
  withSecureValidation,
  validateMobileRequest,
} from '@/lib/security/withSecureValidation';
import type {
  DietaryRequirement,
  DietaryRequirementsResponse,
} from '@/types/dietary-management';

// GET /api/catering/dietary/requirements
export const GET = withSecureValidation(
  async ({ request, user }) => {
    try {
      // Validate mobile request
      await validateMobileRequest(request, user);

      const { searchParams } = new URL(request.url);
      const weddingId = searchParams.get('weddingId');
      const severity = searchParams.get('severity');
      const category = searchParams.get('category');
      const verified = searchParams.get('verified');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

      if (!weddingId) {
        return NextResponse.json(
          {
            error: 'Wedding ID is required',
            code: 'MISSING_WEDDING_ID',
          },
          { status: 400 },
        );
      }

      // Build query filters
      const filters: any = { wedding_id: weddingId };

      if (severity) {
        filters.severity = parseInt(severity);
      }

      if (category) {
        filters.category = category;
      }

      if (verified !== null) {
        filters.verified = verified === 'true';
      }

      // Simulate database query - in real app, use Supabase client
      const mockRequirements: DietaryRequirement[] = [
        {
          id: 'req_001',
          guestId: 'guest_001',
          guestName: 'Sarah Johnson',
          category: 'allergy',
          notes: 'Severe nut allergy (anaphylaxis risk)',
          severity: 5,
          verified: true,
          emergencyContact: '+1234567890',
          lastUpdated: '2025-01-14T10:00:00Z',
          createdAt: '2025-01-10T08:00:00Z',
          medicalAttentionRequired: true,
          crossContaminationRisk: true,
          alternatives: ['almond-free', 'tree-nut-free'],
          verifiedBy: user.id,
          verifiedAt: '2025-01-12T14:30:00Z',
        },
        {
          id: 'req_002',
          guestId: 'guest_002',
          guestName: 'Mike Chen',
          category: 'diet',
          notes: 'Strict vegan - no animal products',
          severity: 3,
          verified: true,
          lastUpdated: '2025-01-13T15:30:00Z',
          createdAt: '2025-01-11T09:15:00Z',
          medicalAttentionRequired: false,
          crossContaminationRisk: false,
          alternatives: ['vegan', 'plant-based'],
          verifiedBy: user.id,
          verifiedAt: '2025-01-13T15:30:00Z',
        },
        {
          id: 'req_003',
          guestId: 'guest_003',
          guestName: 'Emma Rodriguez',
          category: 'medical',
          notes: 'Type 1 diabetes - requires carb counting',
          severity: 4,
          verified: false,
          emergencyContact: '+1987654321',
          lastUpdated: '2025-01-14T09:00:00Z',
          createdAt: '2025-01-14T09:00:00Z',
          medicalAttentionRequired: true,
          crossContaminationRisk: false,
          alternatives: ['low-carb', 'sugar-free'],
        },
      ];

      // Apply filters
      let filteredRequirements = mockRequirements.filter((req) => {
        if (severity && req.severity !== parseInt(severity)) return false;
        if (category && req.category !== category) return false;
        if (verified !== null && req.verified !== (verified === 'true'))
          return false;
        return true;
      });

      // Apply pagination
      const total = filteredRequirements.length;
      filteredRequirements = filteredRequirements.slice(offset, offset + limit);

      // Generate summary statistics
      const summary = {
        total: mockRequirements.length,
        byCategory: mockRequirements.reduce(
          (acc, req) => {
            acc[req.category] = (acc[req.category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        bySeverity: mockRequirements.reduce(
          (acc, req) => {
            acc[req.severity] = (acc[req.severity] || 0) + 1;
            return acc;
          },
          {} as Record<number, number>,
        ),
        highRisk: mockRequirements.filter((req) => req.severity >= 4).length,
        unverified: mockRequirements.filter((req) => !req.verified).length,
      };

      // Generate alerts for mobile optimization
      const alerts = mockRequirements
        .filter((req) => req.severity >= 4 || !req.verified)
        .map((req) => ({
          id: `alert_${req.id}`,
          type:
            req.severity >= 4
              ? ('high_risk' as const)
              : ('verification_needed' as const),
          priority:
            req.severity >= 4 ? ('critical' as const) : ('medium' as const),
          message:
            req.severity >= 4
              ? `${req.guestName} has critical dietary requirement`
              : `${req.guestName}'s requirement needs verification`,
          requirementId: req.id,
          guestName: req.guestName,
          actionRequired:
            req.severity >= 4
              ? 'Review emergency protocols'
              : 'Contact guest for verification',
          dismissed: false,
          createdAt: new Date().toISOString(),
        }));

      const response: DietaryRequirementsResponse = {
        requirements: filteredRequirements,
        alerts,
        summary,
        lastUpdated: new Date().toISOString(),
      };

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'private, max-age=300', // 5 minutes cache
          'X-Total-Count': total.toString(),
          'X-Pagination-Limit': limit.toString(),
          'X-Pagination-Offset': offset.toString(),
        },
      });
    } catch (error) {
      console.error('Error fetching dietary requirements:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch dietary requirements',
          code: 'FETCH_ERROR',
        },
        { status: 500 },
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: { requests: 30, window: '1m' },
    validateBody: false,
  },
);

// POST /api/catering/dietary/requirements
export const POST = withSecureValidation(
  async ({ body, user, request }) => {
    try {
      // Validate mobile request
      await validateMobileRequest(request, user);

      const {
        weddingId,
        guestId,
        guestName,
        category,
        notes,
        severity,
        emergencyContact,
        medicalAttentionRequired,
        crossContaminationRisk,
        alternatives,
      } = body;

      if (!weddingId) {
        return NextResponse.json(
          {
            error: 'Wedding ID is required',
            code: 'MISSING_WEDDING_ID',
          },
          { status: 400 },
        );
      }

      // Create new dietary requirement
      const newRequirement: DietaryRequirement = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        guestId: guestId || `guest_${Date.now()}`,
        guestName,
        category,
        notes,
        severity,
        verified: false,
        emergencyContact,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        medicalAttentionRequired: medicalAttentionRequired || severity >= 4,
        crossContaminationRisk: crossContaminationRisk || false,
        alternatives: alternatives || [],
      };

      // In a real app, save to Supabase database
      console.log('Creating dietary requirement:', newRequirement);

      // Log security event for medical data creation
      console.log(
        `[SECURITY] Medical data created: ${newRequirement.id} by user ${user.id}`,
      );

      return NextResponse.json(
        {
          success: true,
          requirement: newRequirement,
          message: 'Dietary requirement created successfully',
        },
        {
          status: 201,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Content-Classification':
              severity >= 4 ? 'medical-sensitive' : 'sensitive',
          },
        },
      );
    } catch (error) {
      console.error('Error creating dietary requirement:', error);
      return NextResponse.json(
        {
          error: 'Failed to create dietary requirement',
          code: 'CREATE_ERROR',
        },
        { status: 500 },
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: { requests: 10, window: '1m' },
    validateBody: true,
    logSensitiveData: true, // Log medical data access
  },
);
