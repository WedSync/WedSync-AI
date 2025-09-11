/**
 * WS-177 Vendor Security Validation API Route
 * Team D Round 1 Implementation - Ultra Hard Vendor Security Standards
 *
 * Comprehensive vendor security validation with wedding-specific compliance
 * Real-time vendor access control and celebrity client protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AuditSecurityManager } from '@/lib/security/AuditSecurityManager';
import { SecurityMonitoringService } from '@/lib/security/SecurityMonitoringService';
import {
  WeddingSecurityContext,
  SecuritySeverity,
  ThreatLevel,
} from '@/lib/security/SecurityLayerInterface';
import { z } from 'zod';

const vendorValidationSchema = z.object({
  organization_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  validation_type: z.enum([
    'access_permissions',
    'security_clearance',
    'compliance_status',
    'celebrity_access',
    'data_handling',
    'time_based_access',
    'location_restrictions',
    'comprehensive_audit',
  ]),
  access_context: z.object({
    requested_resources: z.array(z.string()),
    access_level: z.enum(['read', 'write', 'admin', 'celebrity_tier']),
    time_window: z
      .object({
        start_time: z.string().datetime(),
        end_time: z.string().datetime(),
      })
      .optional(),
    location_constraints: z
      .object({
        allowed_locations: z.array(z.string()),
        restrict_by_ip: z.boolean().default(false),
      })
      .optional(),
    celebrity_context: z
      .object({
        celebrity_tier: z.enum(['standard', 'vip', 'celebrity']).optional(),
        requires_clearance: z.boolean().default(false),
        privacy_level: z.enum(['standard', 'enhanced', 'maximum']).optional(),
      })
      .optional(),
  }),
  compliance_requirements: z
    .object({
      gdpr_compliance: z.boolean().default(true),
      soc2_compliance: z.boolean().default(true),
      background_check: z.boolean().default(false),
      nda_signed: z.boolean().default(false),
      insurance_verified: z.boolean().default(false),
      security_training_completed: z.boolean().default(false),
    })
    .optional(),
});

interface VendorSecurityProfile {
  vendor_id: string;
  organization_id: string;
  security_clearance_level: number;
  compliance_status: 'compliant' | 'partial' | 'non_compliant';
  celebrity_access_approved: boolean;
  background_check_status: 'verified' | 'pending' | 'failed' | 'not_required';
  security_training_status:
    | 'completed'
    | 'in_progress'
    | 'not_started'
    | 'expired';
  insurance_status: 'verified' | 'pending' | 'expired' | 'not_provided';
  nda_status: 'signed' | 'pending' | 'expired' | 'not_required';
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    risk_factors: string[];
    last_assessment: string;
  };
  access_history: {
    successful_access: number;
    failed_attempts: number;
    policy_violations: number;
    last_access: string | null;
  };
}

interface VendorValidationResult {
  validation_type: string;
  status: 'approved' | 'denied' | 'conditional';
  security_score: number;
  risk_level: ThreatLevel;
  approval_conditions?: string[];
  violations_found: string[];
  recommendations: string[];
  access_restrictions?: {
    time_limited: boolean;
    resource_limited: boolean;
    location_restricted: boolean;
    supervision_required: boolean;
  };
  next_validation_required: string;
}

export async function POST(request: NextRequest) {
  const auditManager = new AuditSecurityManager();
  const monitoringService = new SecurityMonitoringService();

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized access to vendor validation' },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = vendorValidationSchema.parse(body);

    // Create wedding security context
    const context: WeddingSecurityContext = {
      userId: user.id,
      organizationId: validatedRequest.organization_id,
      clientId: validatedRequest.client_id,
      vendorId: validatedRequest.vendor_id,
      userRole: user.app_metadata?.role || 'user',
      celebrityTier:
        validatedRequest.access_context.celebrity_context?.celebrity_tier ||
        'standard',
      permissions: user.app_metadata?.permissions || [],
      sessionId: user.app_metadata?.session_id || 'unknown',
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Validate organization access
    const hasAccess = await auditManager.validateOrganizationAccess(
      user.id,
      validatedRequest.organization_id,
    );
    if (!hasAccess) {
      await auditManager.logSecurityEvent({
        event_type: 'unauthorized_access',
        severity: 'high',
        organization_id: validatedRequest.organization_id,
        vendor_id: validatedRequest.vendor_id,
        user_id: user.id,
        event_details: {
          action: 'vendor_validation_unauthorized_access',
          attempted_vendor: validatedRequest.vendor_id,
        },
      });

      return NextResponse.json(
        { error: 'Unauthorized organization access for vendor validation' },
        { status: 403 },
      );
    }

    // Get vendor information
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select(
        `
        id, 
        organization_id, 
        name, 
        category, 
        security_clearance_level,
        compliance_status,
        celebrity_access_approved,
        background_check_status,
        insurance_status,
        nda_status,
        security_training_status,
        created_at,
        updated_at
      `,
      )
      .eq('id', validatedRequest.vendor_id)
      .eq('organization_id', validatedRequest.organization_id)
      .single();

    if (vendorError || !vendor) {
      await auditManager.logSecurityEvent({
        event_type: 'vendor_not_found',
        severity: 'medium',
        organization_id: validatedRequest.organization_id,
        vendor_id: validatedRequest.vendor_id,
        user_id: user.id,
        event_details: {
          action: 'vendor_validation_vendor_not_found',
          error: vendorError?.message || 'Vendor not found',
        },
      });

      return NextResponse.json(
        { error: 'Vendor not found or access denied' },
        { status: 404 },
      );
    }

    // Celebrity access validation
    const isCelebrityAccess =
      validatedRequest.access_context.celebrity_context?.celebrity_tier ===
        'celebrity' ||
      validatedRequest.access_context.celebrity_context?.requires_clearance;

    if (isCelebrityAccess) {
      const celebrityAccess =
        await auditManager.validateCelebrityAccess(context);
      if (!celebrityAccess) {
        await auditManager.logSecurityEvent({
          event_type: 'celebrity_unauthorized_access',
          severity: 'critical',
          organization_id: validatedRequest.organization_id,
          vendor_id: validatedRequest.vendor_id,
          user_id: user.id,
          celebrity_client: true,
          event_details: {
            action: 'vendor_celebrity_validation_denied',
            vendor_name: vendor.name,
            requested_access_level:
              validatedRequest.access_context.access_level,
          },
        });

        return NextResponse.json(
          { error: 'Insufficient privileges for celebrity vendor validation' },
          { status: 403 },
        );
      }

      // Additional celebrity vendor validation
      if (!vendor.celebrity_access_approved) {
        await auditManager.logSecurityEvent({
          event_type: 'celebrity_vendor_not_approved',
          severity: 'high',
          organization_id: validatedRequest.organization_id,
          vendor_id: validatedRequest.vendor_id,
          celebrity_client: true,
          event_details: {
            action: 'celebrity_vendor_access_denied',
            vendor_name: vendor.name,
            reason: 'Celebrity access not approved for vendor',
          },
        });

        return NextResponse.json(
          {
            error: 'Vendor not approved for celebrity client access',
            vendor_status: 'celebrity_access_denied',
          },
          { status: 403 },
        );
      }
    }

    // Get vendor security profile
    const vendorProfile = await buildVendorSecurityProfile(vendor, supabase);

    // Perform validation based on type
    let validationResult: VendorValidationResult;

    switch (validatedRequest.validation_type) {
      case 'access_permissions':
        validationResult = await validateAccessPermissions(
          vendor,
          vendorProfile,
          validatedRequest.access_context,
          supabase,
        );
        break;
      case 'security_clearance':
        validationResult = await validateSecurityClearance(
          vendor,
          vendorProfile,
          validatedRequest.access_context,
        );
        break;
      case 'compliance_status':
        validationResult = await validateComplianceStatus(
          vendor,
          vendorProfile,
          validatedRequest.compliance_requirements,
        );
        break;
      case 'celebrity_access':
        validationResult = await validateCelebrityAccess(
          vendor,
          vendorProfile,
          validatedRequest.access_context.celebrity_context,
        );
        break;
      case 'data_handling':
        validationResult = await validateDataHandling(
          vendor,
          vendorProfile,
          validatedRequest.access_context,
        );
        break;
      case 'time_based_access':
        validationResult = await validateTimeBasedAccess(
          vendor,
          vendorProfile,
          validatedRequest.access_context.time_window,
        );
        break;
      case 'location_restrictions':
        validationResult = await validateLocationRestrictions(
          vendor,
          vendorProfile,
          validatedRequest.access_context.location_constraints,
        );
        break;
      case 'comprehensive_audit':
        validationResult = await performComprehensiveVendorAudit(
          vendor,
          vendorProfile,
          validatedRequest,
          supabase,
        );
        break;
      default:
        throw new Error('Unknown validation type');
    }

    // Log vendor validation attempt
    await auditManager.logSecurityEvent({
      event_type: 'vendor_validation_performed',
      severity: validationResult.status === 'denied' ? 'high' : 'medium',
      organization_id: validatedRequest.organization_id,
      vendor_id: validatedRequest.vendor_id,
      client_id: validatedRequest.client_id,
      user_id: user.id,
      celebrity_client: isCelebrityAccess,
      event_details: {
        action: 'vendor_security_validation',
        validation_type: validatedRequest.validation_type,
        validation_status: validationResult.status,
        security_score: validationResult.security_score,
        risk_level: validationResult.risk_level,
        vendor_name: vendor.name,
        violations_found: validationResult.violations_found.length,
      },
    });

    // Trigger alerts for high-risk situations
    if (
      validationResult.status === 'denied' ||
      validationResult.risk_level === 'critical'
    ) {
      await monitoringService.triggerSecurityAlert({
        type: 'vendor_security_risk',
        severity:
          validationResult.risk_level === 'critical' ? 'critical' : 'high',
        celebrityClient: isCelebrityAccess,
        organizationId: validatedRequest.organization_id,
        vendorId: validatedRequest.vendor_id,
        message: `Vendor validation ${validationResult.status} - ${validationResult.risk_level} risk detected`,
        context: {
          validation_type: validatedRequest.validation_type,
          vendor_name: vendor.name,
          security_score: validationResult.security_score,
          violations: validationResult.violations_found,
        },
      });
    }

    // Update vendor last validation timestamp
    await supabase
      .from('vendors')
      .update({
        last_validation: new Date().toISOString(),
        last_validation_type: validatedRequest.validation_type,
        last_validation_status: validationResult.status,
      })
      .eq('id', validatedRequest.vendor_id);

    return NextResponse.json(
      {
        success: true,
        organization_id: validatedRequest.organization_id,
        vendor_id: validatedRequest.vendor_id,
        vendor_name: vendor.name,
        validation_timestamp: new Date().toISOString(),
        validation_result: validationResult,
        vendor_profile: vendorProfile,
        celebrity_access_validated: isCelebrityAccess,
        compliance_status: vendor.compliance_status,
        message: `Vendor ${validationResult.status} for ${validatedRequest.validation_type}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Vendor validation API error:', error);

    // Log the error as a security event
    try {
      await auditManager.logSecurityEvent({
        event_type: 'api_error',
        severity: 'high',
        organization_id: validatedRequest?.organization_id || 'unknown',
        vendor_id: validatedRequest?.vendor_id || 'unknown',
        event_details: {
          action: 'vendor_validation_api_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: '/api/security/vendor/validate',
          method: 'POST',
        },
      });
    } catch (logError) {
      console.error('Failed to log vendor validation API error:', logError);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
          message: 'Vendor validation request validation failed',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to perform vendor validation',
      },
      { status: 500 },
    );
  }
}

async function buildVendorSecurityProfile(
  vendor: any,
  supabase: any,
): Promise<VendorSecurityProfile> {
  // Get vendor access history
  const { data: accessLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('vendor_id', vendor.id)
    .gte(
      'created_at',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );

  const successfulAccess =
    accessLogs?.filter(
      (log) =>
        log.event_type === 'data_access' &&
        log.severity !== 'high' &&
        log.severity !== 'critical',
    ).length || 0;

  const failedAttempts =
    accessLogs?.filter((log) => log.event_type === 'unauthorized_access')
      .length || 0;

  const policyViolations =
    accessLogs?.filter((log) => log.event_type === 'policy_violation').length ||
    0;

  // Calculate risk factors
  const riskFactors = [];
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (failedAttempts > 3) {
    riskFactors.push('Multiple failed access attempts');
    riskLevel = 'high';
  }

  if (policyViolations > 0) {
    riskFactors.push('Policy violations detected');
    riskLevel = riskLevel === 'low' ? 'medium' : 'high';
  }

  if (vendor.background_check_status === 'failed') {
    riskFactors.push('Failed background check');
    riskLevel = 'critical';
  }

  if (vendor.security_training_status === 'expired') {
    riskFactors.push('Expired security training');
    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
  }

  if (vendor.insurance_status === 'expired') {
    riskFactors.push('Expired insurance coverage');
    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
  }

  return {
    vendor_id: vendor.id,
    organization_id: vendor.organization_id,
    security_clearance_level: vendor.security_clearance_level || 0,
    compliance_status: vendor.compliance_status || 'non_compliant',
    celebrity_access_approved: vendor.celebrity_access_approved || false,
    background_check_status: vendor.background_check_status || 'not_required',
    security_training_status: vendor.security_training_status || 'not_started',
    insurance_status: vendor.insurance_status || 'not_provided',
    nda_status: vendor.nda_status || 'not_required',
    risk_assessment: {
      risk_level: riskLevel,
      risk_factors: riskFactors,
      last_assessment: new Date().toISOString(),
    },
    access_history: {
      successful_access: successfulAccess,
      failed_attempts: failedAttempts,
      policy_violations: policyViolations,
      last_access: accessLogs?.[0]?.created_at || null,
    },
  };
}

async function validateAccessPermissions(
  vendor: any,
  profile: VendorSecurityProfile,
  accessContext: any,
  supabase: any,
): Promise<VendorValidationResult> {
  const violations = [];
  const conditions = [];
  let securityScore = 100;
  let status: 'approved' | 'denied' | 'conditional' = 'approved';

  // Check security clearance level
  const requiredClearance =
    accessContext.access_level === 'admin'
      ? 3
      : accessContext.access_level === 'celebrity_tier'
        ? 4
        : accessContext.access_level === 'write'
          ? 2
          : 1;

  if (profile.security_clearance_level < requiredClearance) {
    violations.push(
      `Insufficient security clearance (has ${profile.security_clearance_level}, needs ${requiredClearance})`,
    );
    securityScore -= 30;
    status = 'denied';
  }

  // Check compliance status
  if (profile.compliance_status !== 'compliant') {
    violations.push('Vendor not fully compliant with security requirements');
    securityScore -= 20;
    if (status !== 'denied') status = 'conditional';
    conditions.push('Complete compliance requirements');
  }

  // Check background check for sensitive access
  if (
    accessContext.access_level === 'admin' ||
    accessContext.celebrity_context?.requires_clearance
  ) {
    if (profile.background_check_status !== 'verified') {
      violations.push('Background check not verified for sensitive access');
      securityScore -= 25;
      status = 'denied';
    }
  }

  // Check security training
  if (profile.security_training_status === 'expired') {
    violations.push('Security training expired');
    securityScore -= 15;
    if (status !== 'denied') status = 'conditional';
    conditions.push('Complete current security training');
  }

  // Check recent violations
  if (profile.access_history.policy_violations > 0) {
    violations.push(
      `${profile.access_history.policy_violations} recent policy violations`,
    );
    securityScore -= 10 * profile.access_history.policy_violations;
    if (status !== 'denied') status = 'conditional';
    conditions.push('Review and acknowledge policy violations');
  }

  // Wedding-specific validations
  const weddingValidations = await validateWeddingSpecificAccess(
    vendor,
    accessContext,
    supabase,
  );
  violations.push(...weddingValidations.violations);
  securityScore -= weddingValidations.scoreDeduction;
  conditions.push(...weddingValidations.conditions);

  // Determine final risk level
  let riskLevel: ThreatLevel = 'low';
  if (securityScore < 50 || status === 'denied') {
    riskLevel = 'critical';
  } else if (securityScore < 70) {
    riskLevel = 'high';
  } else if (securityScore < 85) {
    riskLevel = 'medium';
  }

  return {
    validation_type: 'access_permissions',
    status: status,
    security_score: Math.max(0, securityScore),
    risk_level: riskLevel,
    approval_conditions: conditions.length > 0 ? conditions : undefined,
    violations_found: violations,
    recommendations: generateAccessRecommendations(violations, profile),
    access_restrictions: {
      time_limited: securityScore < 80,
      resource_limited: securityScore < 70,
      location_restricted: securityScore < 60,
      supervision_required: securityScore < 50,
    },
    next_validation_required: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function validateSecurityClearance(
  vendor: any,
  profile: VendorSecurityProfile,
  accessContext: any,
): Promise<VendorValidationResult> {
  const violations = [];
  let securityScore = 100;
  let status: 'approved' | 'denied' | 'conditional' = 'approved';

  // Security clearance requirements based on access level
  const clearanceRequirements = {
    celebrity_tier: { level: 4, background: true, training: true, nda: true },
    admin: { level: 3, background: true, training: true, nda: false },
    write: { level: 2, background: false, training: true, nda: false },
    read: { level: 1, background: false, training: false, nda: false },
  };

  const requirements =
    clearanceRequirements[
      accessContext.access_level as keyof typeof clearanceRequirements
    ];

  if (profile.security_clearance_level < requirements.level) {
    violations.push(
      `Security clearance level ${profile.security_clearance_level} below required ${requirements.level}`,
    );
    securityScore -= 40;
    status = 'denied';
  }

  if (
    requirements.background &&
    profile.background_check_status !== 'verified'
  ) {
    violations.push('Background check verification required');
    securityScore -= 30;
    status = 'denied';
  }

  if (
    requirements.training &&
    profile.security_training_status !== 'completed'
  ) {
    violations.push('Security training completion required');
    securityScore -= 20;
    if (status !== 'denied') status = 'conditional';
  }

  if (requirements.nda && profile.nda_status !== 'signed') {
    violations.push('Non-disclosure agreement signature required');
    securityScore -= 15;
    if (status !== 'denied') status = 'conditional';
  }

  // Celebrity access specific validations
  if (accessContext.celebrity_context?.celebrity_tier === 'celebrity') {
    if (!profile.celebrity_access_approved) {
      violations.push('Celebrity access approval required');
      securityScore -= 50;
      status = 'denied';
    }

    // Enhanced requirements for celebrity access
    if (profile.insurance_status !== 'verified') {
      violations.push(
        'Professional liability insurance verification required for celebrity access',
      );
      securityScore -= 20;
      if (status !== 'denied') status = 'conditional';
    }
  }

  let riskLevel: ThreatLevel = 'low';
  if (securityScore < 50) {
    riskLevel = 'critical';
  } else if (securityScore < 70) {
    riskLevel = 'high';
  } else if (securityScore < 85) {
    riskLevel = 'medium';
  }

  return {
    validation_type: 'security_clearance',
    status: status,
    security_score: Math.max(0, securityScore),
    risk_level: riskLevel,
    violations_found: violations,
    recommendations: [
      'Complete required security clearance levels',
      'Maintain current background check status',
      'Keep security training up to date',
      'Ensure all compliance requirements are met',
    ],
    next_validation_required: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function validateComplianceStatus(
  vendor: any,
  profile: VendorSecurityProfile,
  complianceRequirements: any,
): Promise<VendorValidationResult> {
  const violations = [];
  let securityScore = 100;
  let status: 'approved' | 'denied' | 'conditional' = 'approved';

  // GDPR compliance check
  if (
    complianceRequirements?.gdpr_compliance &&
    profile.compliance_status !== 'compliant'
  ) {
    violations.push('GDPR compliance requirements not met');
    securityScore -= 25;
    status = 'conditional';
  }

  // SOC2 compliance check
  if (
    complianceRequirements?.soc2_compliance &&
    profile.compliance_status !== 'compliant'
  ) {
    violations.push('SOC2 compliance requirements not met');
    securityScore -= 25;
    status = 'conditional';
  }

  // Background check requirement
  if (
    complianceRequirements?.background_check &&
    profile.background_check_status !== 'verified'
  ) {
    violations.push('Background check verification required');
    securityScore -= 30;
    status = 'denied';
  }

  // NDA requirement
  if (complianceRequirements?.nda_signed && profile.nda_status !== 'signed') {
    violations.push('Non-disclosure agreement must be signed');
    securityScore -= 20;
    status = 'conditional';
  }

  // Insurance verification
  if (
    complianceRequirements?.insurance_verified &&
    profile.insurance_status !== 'verified'
  ) {
    violations.push('Insurance verification required');
    securityScore -= 20;
    status = 'conditional';
  }

  // Security training
  if (
    complianceRequirements?.security_training_completed &&
    profile.security_training_status !== 'completed'
  ) {
    violations.push('Security training must be completed');
    securityScore -= 15;
    status = 'conditional';
  }

  let riskLevel: ThreatLevel = 'low';
  if (securityScore < 60) {
    riskLevel = 'high';
  } else if (securityScore < 80) {
    riskLevel = 'medium';
  }

  return {
    validation_type: 'compliance_status',
    status: status,
    security_score: Math.max(0, securityScore),
    risk_level: riskLevel,
    violations_found: violations,
    recommendations: [
      'Complete all required compliance certifications',
      'Maintain up-to-date documentation',
      'Regular compliance audits',
      'Staff compliance training',
    ],
    next_validation_required: new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function validateCelebrityAccess(
  vendor: any,
  profile: VendorSecurityProfile,
  celebrityContext: any,
): Promise<VendorValidationResult> {
  const violations = [];
  let securityScore = 100;
  let status: 'approved' | 'denied' | 'conditional' = 'approved';

  // Celebrity access approval
  if (!profile.celebrity_access_approved) {
    violations.push('Vendor not approved for celebrity client access');
    securityScore = 0;
    status = 'denied';
  }

  // Enhanced requirements for celebrity access
  if (profile.security_clearance_level < 4) {
    violations.push('Maximum security clearance required for celebrity access');
    securityScore -= 40;
    if (status !== 'denied') status = 'conditional';
  }

  if (profile.background_check_status !== 'verified') {
    violations.push(
      'Background check verification mandatory for celebrity access',
    );
    securityScore -= 30;
    status = 'denied';
  }

  if (profile.nda_status !== 'signed') {
    violations.push('Signed NDA mandatory for celebrity access');
    securityScore -= 25;
    status = 'denied';
  }

  if (profile.insurance_status !== 'verified') {
    violations.push(
      'Professional liability insurance required for celebrity access',
    );
    securityScore -= 20;
    if (status !== 'denied') status = 'conditional';
  }

  if (profile.security_training_status !== 'completed') {
    violations.push(
      'Specialized security training required for celebrity access',
    );
    securityScore -= 20;
    if (status !== 'denied') status = 'conditional';
  }

  // Privacy level requirements
  if (celebrityContext?.privacy_level === 'maximum') {
    if (profile.access_history.policy_violations > 0) {
      violations.push(
        'No policy violations permitted for maximum privacy celebrity clients',
      );
      securityScore -= 30;
      status = 'denied';
    }
  }

  let riskLevel: ThreatLevel = 'low';
  if (status === 'denied' || securityScore < 70) {
    riskLevel = 'critical';
  } else if (securityScore < 85) {
    riskLevel = 'high';
  }

  return {
    validation_type: 'celebrity_access',
    status: status,
    security_score: Math.max(0, securityScore),
    risk_level: riskLevel,
    violations_found: violations,
    recommendations: [
      'Complete celebrity access certification program',
      'Maintain perfect compliance record',
      'Regular celebrity-specific security briefings',
      'Enhanced privacy protection training',
    ],
    access_restrictions: {
      time_limited: true,
      resource_limited: true,
      location_restricted: true,
      supervision_required: celebrityContext?.privacy_level === 'maximum',
    },
    next_validation_required: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function validateDataHandling(
  vendor: any,
  profile: VendorSecurityProfile,
  accessContext: any,
): Promise<VendorValidationResult> {
  const violations = [];
  let securityScore = 100;
  let status: 'approved' | 'denied' | 'conditional' = 'approved';

  // Data handling requirements based on resources
  const sensitiveResources = [
    'client_data',
    'financial_information',
    'guest_lists',
    'vendor_contracts',
  ];
  const requestedSensitive = accessContext.requested_resources.filter(
    (resource: string) =>
      sensitiveResources.some((sr) => resource.includes(sr)),
  );

  if (requestedSensitive.length > 0) {
    if (profile.security_training_status !== 'completed') {
      violations.push(
        'Data handling training required for sensitive resources',
      );
      securityScore -= 25;
      status = 'conditional';
    }

    if (profile.compliance_status !== 'compliant') {
      violations.push(
        'Full compliance status required for sensitive data access',
      );
      securityScore -= 20;
      status = 'conditional';
    }
  }

  // Celebrity data handling
  if (accessContext.celebrity_context?.celebrity_tier === 'celebrity') {
    if (profile.nda_status !== 'signed') {
      violations.push('Signed NDA required for celebrity data handling');
      securityScore -= 30;
      status = 'denied';
    }

    if (profile.access_history.policy_violations > 0) {
      violations.push(
        'No policy violations permitted for celebrity data handling',
      );
      securityScore -= 25;
      status = 'conditional';
    }
  }

  let riskLevel: ThreatLevel = 'low';
  if (securityScore < 60) {
    riskLevel = 'high';
  } else if (securityScore < 80) {
    riskLevel = 'medium';
  }

  return {
    validation_type: 'data_handling',
    status: status,
    security_score: Math.max(0, securityScore),
    risk_level: riskLevel,
    violations_found: violations,
    recommendations: [
      'Complete data protection training',
      'Implement data handling best practices',
      'Regular data access audits',
      'Maintain compliance certifications',
    ],
    next_validation_required: new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function validateTimeBasedAccess(
  vendor: any,
  profile: VendorSecurityProfile,
  timeWindow: any,
): Promise<VendorValidationResult> {
  const violations = [];
  let securityScore = 100;
  let status: 'approved' | 'denied' | 'conditional' = 'approved';

  if (timeWindow) {
    const startTime = new Date(timeWindow.start_time);
    const endTime = new Date(timeWindow.end_time);
    const now = new Date();

    // Check if current time is within allowed window
    if (now < startTime || now > endTime) {
      violations.push('Current time outside of approved access window');
      securityScore = 0;
      status = 'denied';
    }

    // Check for reasonable time windows (not too long)
    const windowDuration = endTime.getTime() - startTime.getTime();
    const maxDuration = 8 * 60 * 60 * 1000; // 8 hours

    if (windowDuration > maxDuration) {
      violations.push('Access window duration exceeds maximum allowed time');
      securityScore -= 20;
      if (status !== 'denied') status = 'conditional';
    }
  }

  return {
    validation_type: 'time_based_access',
    status: status,
    security_score: Math.max(0, securityScore),
    risk_level: status === 'denied' ? 'high' : 'low',
    violations_found: violations,
    recommendations: [
      'Ensure access only during approved time windows',
      'Implement automatic session termination',
      'Monitor for after-hours access attempts',
    ],
    next_validation_required: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function validateLocationRestrictions(
  vendor: any,
  profile: VendorSecurityProfile,
  locationConstraints: any,
): Promise<VendorValidationResult> {
  const violations = [];
  let securityScore = 100;
  let status: 'approved' | 'denied' | 'conditional' = 'approved';

  if (locationConstraints?.restrict_by_ip) {
    // In a real implementation, this would check the current IP against allowed locations
    // For now, we'll simulate the validation
    const currentLocation = 'unknown'; // Would be determined from IP geolocation
    const allowedLocations = locationConstraints.allowed_locations || [];

    if (
      allowedLocations.length > 0 &&
      !allowedLocations.includes(currentLocation)
    ) {
      violations.push('Access attempted from non-approved location');
      securityScore -= 40;
      status = 'denied';
    }
  }

  return {
    validation_type: 'location_restrictions',
    status: status,
    security_score: Math.max(0, securityScore),
    risk_level: status === 'denied' ? 'high' : 'low',
    violations_found: violations,
    recommendations: [
      'Implement IP geolocation validation',
      'Maintain approved location lists',
      'Monitor for location-based anomalies',
    ],
    next_validation_required: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function performComprehensiveVendorAudit(
  vendor: any,
  profile: VendorSecurityProfile,
  request: any,
  supabase: any,
): Promise<VendorValidationResult> {
  // Perform all validation types
  const accessValidation = await validateAccessPermissions(
    vendor,
    profile,
    request.access_context,
    supabase,
  );
  const clearanceValidation = await validateSecurityClearance(
    vendor,
    profile,
    request.access_context,
  );
  const complianceValidation = await validateComplianceStatus(
    vendor,
    profile,
    request.compliance_requirements,
  );

  // Combine results
  const allViolations = [
    ...accessValidation.violations_found,
    ...clearanceValidation.violations_found,
    ...complianceValidation.violations_found,
  ];

  const averageScore =
    (accessValidation.security_score +
      clearanceValidation.security_score +
      complianceValidation.security_score) /
    3;

  const worstStatus = [
    accessValidation.status,
    clearanceValidation.status,
    complianceValidation.status,
  ].includes('denied')
    ? 'denied'
    : [
          accessValidation.status,
          clearanceValidation.status,
          complianceValidation.status,
        ].includes('conditional')
      ? 'conditional'
      : 'approved';

  let riskLevel: ThreatLevel = 'low';
  if (worstStatus === 'denied' || averageScore < 50) {
    riskLevel = 'critical';
  } else if (averageScore < 70) {
    riskLevel = 'high';
  } else if (averageScore < 85) {
    riskLevel = 'medium';
  }

  return {
    validation_type: 'comprehensive_audit',
    status: worstStatus,
    security_score: Math.round(averageScore),
    risk_level: riskLevel,
    violations_found: allViolations,
    recommendations: [
      'Address all identified security violations',
      'Implement comprehensive security improvements',
      'Regular security audits and assessments',
      'Continuous compliance monitoring',
    ],
    access_restrictions: {
      time_limited: averageScore < 80,
      resource_limited: averageScore < 70,
      location_restricted: averageScore < 60,
      supervision_required: averageScore < 50,
    },
    next_validation_required: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function validateWeddingSpecificAccess(
  vendor: any,
  accessContext: any,
  supabase: any,
) {
  const violations = [];
  const conditions = [];
  let scoreDeduction = 0;

  // Wedding category-specific validations
  const sensitiveCategories = [
    'photography',
    'videography',
    'security',
    'transportation',
  ];
  if (sensitiveCategories.includes(vendor.category)) {
    // Enhanced requirements for sensitive wedding vendors
    const { data: vendorCertifications } = await supabase
      .from('vendor_certifications')
      .select('*')
      .eq('vendor_id', vendor.id)
      .eq('certification_type', 'wedding_specialized');

    if (!vendorCertifications || vendorCertifications.length === 0) {
      violations.push(
        `Wedding specialization certification required for ${vendor.category} vendors`,
      );
      scoreDeduction += 15;
      conditions.push('Complete wedding industry certification');
    }
  }

  // Celebrity wedding specific requirements
  if (accessContext.celebrity_context?.celebrity_tier === 'celebrity') {
    const { data: celebrityExperience } = await supabase
      .from('vendor_experience')
      .select('*')
      .eq('vendor_id', vendor.id)
      .eq('experience_type', 'celebrity_events');

    if (!celebrityExperience || celebrityExperience.length === 0) {
      violations.push('Celebrity event experience required');
      scoreDeduction += 20;
      conditions.push('Demonstrate celebrity event experience');
    }
  }

  return {
    violations,
    conditions,
    scoreDeduction,
  };
}

function generateAccessRecommendations(
  violations: string[],
  profile: VendorSecurityProfile,
): string[] {
  const recommendations = [];

  if (violations.some((v) => v.includes('clearance'))) {
    recommendations.push('Upgrade security clearance level');
    recommendations.push('Complete enhanced background verification');
  }

  if (violations.some((v) => v.includes('training'))) {
    recommendations.push('Complete current security training modules');
    recommendations.push('Schedule regular training refreshers');
  }

  if (violations.some((v) => v.includes('compliance'))) {
    recommendations.push('Address compliance gaps immediately');
    recommendations.push('Implement compliance monitoring system');
  }

  if (profile.access_history.policy_violations > 0) {
    recommendations.push('Review and acknowledge past policy violations');
    recommendations.push('Implement violation prevention measures');
  }

  return recommendations;
}
