// WS-254 Team D: Individual Dietary Requirement API - Update and Delete
import { NextRequest, NextResponse } from 'next/server';
import {
  withSecureValidation,
  validateMobileRequest,
} from '@/lib/security/withSecureValidation';
import type { DietaryRequirement } from '@/types/dietary-management';

// GET /api/catering/dietary/requirements/[id]
export const GET = withSecureValidation(
  async ({ request, user, params }) => {
    try {
      const { id } = params;

      // Validate mobile request
      await validateMobileRequest(request, user);

      if (!id) {
        return NextResponse.json(
          {
            error: 'Requirement ID is required',
            code: 'MISSING_REQUIREMENT_ID',
          },
          { status: 400 },
        );
      }

      // Mock requirement lookup - in real app, query Supabase
      const mockRequirement: DietaryRequirement = {
        id,
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
      };

      // Log access to medical data
      console.log(`[SECURITY] Medical data accessed: ${id} by user ${user.id}`);

      return NextResponse.json(
        {
          success: true,
          requirement: mockRequirement,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=60', // 1 minute cache for individual requirements
            'X-Content-Classification':
              mockRequirement.severity >= 4 ? 'medical-sensitive' : 'sensitive',
          },
        },
      );
    } catch (error) {
      console.error('Error fetching dietary requirement:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch dietary requirement',
          code: 'FETCH_ERROR',
        },
        { status: 500 },
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: { requests: 60, window: '1m' },
    validateBody: false,
    logSensitiveData: true,
  },
);

// PATCH /api/catering/dietary/requirements/[id]
export const PATCH = withSecureValidation(
  async ({ body, user, request, params }) => {
    try {
      const { id } = params;

      // Validate mobile request
      await validateMobileRequest(request, user);

      if (!id) {
        return NextResponse.json(
          {
            error: 'Requirement ID is required',
            code: 'MISSING_REQUIREMENT_ID',
          },
          { status: 400 },
        );
      }

      // Get existing requirement (mock - in real app, query Supabase)
      const existingRequirement: DietaryRequirement = {
        id,
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
      };

      if (!existingRequirement) {
        return NextResponse.json(
          {
            error: 'Dietary requirement not found',
            code: 'NOT_FOUND',
          },
          { status: 404 },
        );
      }

      // Track what changed for audit logging
      const changes: string[] = [];
      const updatedRequirement = { ...existingRequirement };

      // Update allowed fields
      if (body.guestName && body.guestName !== existingRequirement.guestName) {
        changes.push(
          `guestName: "${existingRequirement.guestName}" → "${body.guestName}"`,
        );
        updatedRequirement.guestName = body.guestName;
      }

      if (body.category && body.category !== existingRequirement.category) {
        changes.push(
          `category: "${existingRequirement.category}" → "${body.category}"`,
        );
        updatedRequirement.category = body.category;
      }

      if (body.notes && body.notes !== existingRequirement.notes) {
        changes.push(`notes: "${existingRequirement.notes}" → "${body.notes}"`);
        updatedRequirement.notes = body.notes;
      }

      if (body.severity && body.severity !== existingRequirement.severity) {
        changes.push(
          `severity: ${existingRequirement.severity} → ${body.severity}`,
        );
        updatedRequirement.severity = body.severity;

        // Auto-update medical attention requirement for high severity
        if (body.severity >= 4) {
          updatedRequirement.medicalAttentionRequired = true;
        }
      }

      if (
        body.emergencyContact !== undefined &&
        body.emergencyContact !== existingRequirement.emergencyContact
      ) {
        changes.push(
          `emergencyContact: "${existingRequirement.emergencyContact || 'none'}" → "${body.emergencyContact || 'none'}"`,
        );
        updatedRequirement.emergencyContact = body.emergencyContact;
      }

      if (
        body.verified !== undefined &&
        body.verified !== existingRequirement.verified
      ) {
        changes.push(
          `verified: ${existingRequirement.verified} → ${body.verified}`,
        );
        updatedRequirement.verified = body.verified;

        if (body.verified) {
          updatedRequirement.verifiedBy = user.id;
          updatedRequirement.verifiedAt = new Date().toISOString();
        }
      }

      if (body.medicalAttentionRequired !== undefined) {
        updatedRequirement.medicalAttentionRequired =
          body.medicalAttentionRequired;
      }

      if (body.crossContaminationRisk !== undefined) {
        updatedRequirement.crossContaminationRisk = body.crossContaminationRisk;
      }

      if (body.alternatives && Array.isArray(body.alternatives)) {
        updatedRequirement.alternatives = body.alternatives;
      }

      // Validation: Emergency contact required for high severity
      if (
        updatedRequirement.severity >= 4 &&
        !updatedRequirement.emergencyContact
      ) {
        return NextResponse.json(
          {
            error: 'Emergency contact is required for severity levels 4 and 5',
            code: 'EMERGENCY_CONTACT_REQUIRED',
          },
          { status: 400 },
        );
      }

      // Update timestamp
      updatedRequirement.lastUpdated = new Date().toISOString();

      // Log security event for medical data modification
      console.log(`[SECURITY] Medical data updated: ${id} by user ${user.id}`, {
        changes: changes.length > 0 ? changes : ['No changes detected'],
        severity: updatedRequirement.severity,
        requiresEmergencyContact: updatedRequirement.severity >= 4,
      });

      // In real app, save to Supabase database
      console.log('Updating dietary requirement:', updatedRequirement);

      return NextResponse.json(
        {
          success: true,
          requirement: updatedRequirement,
          changes: changes.length,
          message:
            changes.length > 0
              ? 'Dietary requirement updated successfully'
              : 'No changes detected',
        },
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Content-Classification':
              updatedRequirement.severity >= 4
                ? 'medical-sensitive'
                : 'sensitive',
            'X-Audit-Changes': changes.length.toString(),
          },
        },
      );
    } catch (error) {
      console.error('Error updating dietary requirement:', error);
      return NextResponse.json(
        {
          error: 'Failed to update dietary requirement',
          code: 'UPDATE_ERROR',
        },
        { status: 500 },
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: { requests: 20, window: '1m' },
    validateBody: true,
    logSensitiveData: true,
  },
);

// DELETE /api/catering/dietary/requirements/[id]
export const DELETE = withSecureValidation(
  async ({ user, request, params }) => {
    try {
      const { id } = params;

      // Validate mobile request
      await validateMobileRequest(request, user);

      if (!id) {
        return NextResponse.json(
          {
            error: 'Requirement ID is required',
            code: 'MISSING_REQUIREMENT_ID',
          },
          { status: 400 },
        );
      }

      // Check if requirement exists (mock - in real app, query Supabase)
      const existingRequirement = {
        id,
        guestName: 'Sarah Johnson',
        category: 'allergy',
        severity: 5,
        medicalAttentionRequired: true,
      };

      if (!existingRequirement) {
        return NextResponse.json(
          {
            error: 'Dietary requirement not found',
            code: 'NOT_FOUND',
          },
          { status: 404 },
        );
      }

      // Additional validation for high-severity requirements
      if (existingRequirement.severity >= 4) {
        const { searchParams } = new URL(request.url);
        const confirmDeletion = searchParams.get('confirm') === 'true';

        if (!confirmDeletion) {
          return NextResponse.json(
            {
              error:
                'Deletion confirmation required for high-severity requirements',
              code: 'CONFIRMATION_REQUIRED',
              requirement: {
                id: existingRequirement.id,
                guestName: existingRequirement.guestName,
                severity: existingRequirement.severity,
                category: existingRequirement.category,
              },
              confirmationUrl: `${request.url}?confirm=true`,
            },
            { status: 422 },
          );
        }
      }

      // Log security event for medical data deletion
      console.log(`[SECURITY] Medical data deleted: ${id} by user ${user.id}`, {
        guestName: existingRequirement.guestName,
        severity: existingRequirement.severity,
        category: existingRequirement.category,
        medicalData: existingRequirement.medicalAttentionRequired,
      });

      // In real app, soft delete from Supabase (don't hard delete medical data)
      console.log('Soft deleting dietary requirement:', id);

      return NextResponse.json(
        {
          success: true,
          message: 'Dietary requirement deleted successfully',
          deletedId: id,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Audit-Action': 'soft-delete',
            'X-Content-Classification': 'medical-sensitive',
          },
        },
      );
    } catch (error) {
      console.error('Error deleting dietary requirement:', error);
      return NextResponse.json(
        {
          error: 'Failed to delete dietary requirement',
          code: 'DELETE_ERROR',
        },
        { status: 500 },
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: { requests: 10, window: '1m' },
    validateBody: false,
    logSensitiveData: true,
  },
);
