/**
 * WS-150: Compliance Reports API - GDPR/PCI Compliance Reports
 * Generates compliance reports for regulatory requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  auditService,
  AuditEventType,
  AuditSeverity,
} from '@/lib/audit/audit-service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authentication and authorization
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (
      !profile ||
      !['admin', 'super_admin', 'system_admin', 'compliance_officer'].includes(
        profile.role,
      )
    ) {
      await auditService.logSecurityEvent(
        AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
        'Unauthorized access to compliance reports',
        {
          endpoint: '/api/audit/compliance/reports',
          user_role: profile?.role,
        },
        {
          user_id: user.id,
          user_email: user.email,
          organization_id: profile?.organization_id,
          ip_address:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
        },
        'high',
      );

      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') as
      | 'gdpr'
      | 'pci'
      | 'sox'
      | 'hipaa'
      | 'all';
    const startDate = searchParams.get('start_date')
      ? new Date(searchParams.get('start_date')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const endDate = searchParams.get('end_date')
      ? new Date(searchParams.get('end_date')!)
      : new Date();
    const format = searchParams.get('format') || 'json';
    const includeDetails = searchParams.get('include_details') === 'true';

    // Validate parameters
    if (
      !reportType ||
      !['gdpr', 'pci', 'sox', 'hipaa', 'all'].includes(reportType)
    ) {
      return NextResponse.json(
        { error: 'Valid report type required: gdpr, pci, sox, hipaa, or all' },
        { status: 400 },
      );
    }

    if (endDate.getTime() - startDate.getTime() > 365 * 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 365 days' },
        { status: 400 },
      );
    }

    // Generate compliance report
    let report;
    switch (reportType) {
      case 'gdpr':
        report = await generateGDPRReport(
          profile.organization_id,
          startDate,
          endDate,
          includeDetails,
        );
        break;
      case 'pci':
        report = await generatePCIReport(
          profile.organization_id,
          startDate,
          endDate,
          includeDetails,
        );
        break;
      case 'sox':
        report = await generateSOXReport(
          profile.organization_id,
          startDate,
          endDate,
          includeDetails,
        );
        break;
      case 'hipaa':
        report = await generateHIPAAReport(
          profile.organization_id,
          startDate,
          endDate,
          includeDetails,
        );
        break;
      case 'all':
        report = await generateComprehensiveReport(
          profile.organization_id,
          startDate,
          endDate,
          includeDetails,
        );
        break;
      default:
        throw new Error('Invalid report type');
    }

    // Log the compliance report generation
    await auditService.log(
      {
        event_type: AuditEventType.COMPLIANCE_DATA_EXPORT,
        severity: AuditSeverity.INFO,
        action: `Compliance report generated: ${reportType.toUpperCase()}`,
        resource_type: 'compliance_report',
        details: {
          report_type: reportType,
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          format,
          include_details: includeDetails,
          generated_by_admin: true,
          report_size: JSON.stringify(report).length,
        },
      },
      {
        user_id: user.id,
        user_email: user.email,
        organization_id: profile.organization_id,
        ip_address:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      },
    );

    // Return in requested format
    if (format === 'csv') {
      const csv = convertReportToCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-compliance-report-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      report_type: reportType,
      generated_at: new Date().toISOString(),
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      data: report,
    });
  } catch (error) {
    console.error('[COMPLIANCE REPORTS API] Error:', error);

    try {
      await auditService.log({
        event_type: AuditEventType.SYSTEM_ERROR_OCCURRED,
        severity: AuditSeverity.ERROR,
        action: 'Compliance report generation error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: '/api/audit/compliance/reports',
        },
      });
    } catch (logError) {
      console.error('[COMPLIANCE REPORTS API] Failed to log error:', logError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GDPR Compliance Report
async function generateGDPRReport(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  includeDetails: boolean,
) {
  const gdprEvents = await auditService.query({
    organization_id: organizationId,
    start_date: startDate,
    end_date: endDate,
    event_types: [
      AuditEventType.COMPLIANCE_DATA_REQUEST,
      AuditEventType.COMPLIANCE_DATA_DELETION,
      AuditEventType.COMPLIANCE_DATA_EXPORT,
      AuditEventType.COMPLIANCE_CONSENT_CHANGED,
      AuditEventType.DATA_CREATE,
      AuditEventType.DATA_READ,
      AuditEventType.DATA_UPDATE,
      AuditEventType.DATA_DELETE,
    ],
    limit: 5000,
  });

  const dataSubjectRequests = gdprEvents.filter(
    (event) => event.event_type === AuditEventType.COMPLIANCE_DATA_REQUEST,
  );

  const dataDeletions = gdprEvents.filter(
    (event) =>
      event.event_type === AuditEventType.COMPLIANCE_DATA_DELETION ||
      (event.event_type === AuditEventType.DATA_DELETE &&
        event.details?.gdpr_compliance === true),
  );

  const dataExports = gdprEvents.filter(
    (event) => event.event_type === AuditEventType.COMPLIANCE_DATA_EXPORT,
  );

  const consentChanges = gdprEvents.filter(
    (event) => event.event_type === AuditEventType.COMPLIANCE_CONSENT_CHANGED,
  );

  const dataProcessingEvents = gdprEvents.filter(
    (event) =>
      [
        AuditEventType.DATA_CREATE,
        AuditEventType.DATA_READ,
        AuditEventType.DATA_UPDATE,
      ].includes(event.event_type) &&
      event.details?.data_classification === 'restricted',
  );

  return {
    summary: {
      total_events: gdprEvents.length,
      data_subject_requests: dataSubjectRequests.length,
      data_deletions: dataDeletions.length,
      data_exports: dataExports.length,
      consent_changes: consentChanges.length,
      sensitive_data_processing: dataProcessingEvents.length,
    },
    compliance_status: {
      data_deletion_requests_fulfilled: dataDeletions.length,
      data_export_requests_fulfilled: dataExports.length,
      average_response_time_hours:
        calculateAverageResponseTime(dataSubjectRequests),
      outstanding_requests: getOutstandingRequests(dataSubjectRequests),
    },
    data_processing_lawfulness: {
      consent_based_processing: consentChanges.filter(
        (e) => e.details?.consent_granted,
      ).length,
      legitimate_interest_processing: dataProcessingEvents.filter(
        (e) => e.details?.legal_basis === 'legitimate_interest',
      ).length,
      contract_based_processing: dataProcessingEvents.filter(
        (e) => e.details?.legal_basis === 'contract',
      ).length,
    },
    ...(includeDetails && {
      detailed_events: {
        data_subject_requests: dataSubjectRequests,
        data_deletions: dataDeletions,
        data_exports: dataExports,
        consent_changes: consentChanges,
      },
    }),
  };
}

// PCI DSS Compliance Report
async function generatePCIReport(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  includeDetails: boolean,
) {
  const pciEvents = await auditService.query({
    organization_id: organizationId,
    start_date: startDate,
    end_date: endDate,
    event_types: [
      AuditEventType.FINANCIAL_PAYMENT_PROCESSED,
      AuditEventType.FINANCIAL_REFUND_ISSUED,
      AuditEventType.FINANCIAL_ACCESS_ATTEMPT,
      AuditEventType.DATA_READ,
      AuditEventType.DATA_UPDATE,
      AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
    ],
    limit: 5000,
  });

  const financialTransactions = pciEvents.filter((event) =>
    [
      AuditEventType.FINANCIAL_PAYMENT_PROCESSED,
      AuditEventType.FINANCIAL_REFUND_ISSUED,
    ].includes(event.event_type),
  );

  const cardDataAccess = pciEvents.filter(
    (event) =>
      event.details?.data_classification === 'restricted' &&
      (event.details?.card_data_access === true ||
        event.resource_type?.includes('payment')),
  );

  const securityViolations = pciEvents.filter(
    (event) =>
      [
        AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
        AuditEventType.FINANCIAL_ACCESS_ATTEMPT,
      ].includes(event.event_type) && event.severity === 'error',
  );

  return {
    summary: {
      total_financial_events: financialTransactions.length,
      cardholder_data_access_events: cardDataAccess.length,
      security_violations: securityViolations.length,
      total_transaction_volume: financialTransactions.reduce(
        (sum, event) => sum + (event.details?.amount || 0),
        0,
      ),
    },
    security_metrics: {
      unauthorized_access_attempts: securityViolations.length,
      successful_payment_processing: financialTransactions.filter(
        (e) =>
          e.event_type === AuditEventType.FINANCIAL_PAYMENT_PROCESSED &&
          e.severity !== 'error',
      ).length,
      failed_transactions: financialTransactions.filter(
        (e) => e.severity === 'error',
      ).length,
    },
    data_protection: {
      card_data_properly_masked: cardDataAccess.filter((e) =>
        e.details?.card_number?.includes('****'),
      ).length,
      cvv_data_logged: cardDataAccess.filter(
        (e) => e.details?.cvv && !e.details?.cvv?.includes('***'),
      ).length, // Should be 0
      encryption_used: cardDataAccess.filter(
        (e) => e.details?.encrypted === true,
      ).length,
    },
    compliance_violations: identifyPCIViolations(pciEvents),
    ...(includeDetails && {
      detailed_events: {
        financial_transactions: financialTransactions,
        card_data_access: cardDataAccess,
        security_violations: securityViolations,
      },
    }),
  };
}

// SOX Compliance Report
async function generateSOXReport(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  includeDetails: boolean,
) {
  const soxEvents = await auditService.query({
    organization_id: organizationId,
    start_date: startDate,
    end_date: endDate,
    event_types: [
      AuditEventType.FINANCIAL_PAYMENT_PROCESSED,
      AuditEventType.FINANCIAL_BILLING_UPDATED,
      AuditEventType.DATA_UPDATE,
      AuditEventType.DATA_DELETE,
      AuditEventType.SECURITY_ADMIN_PRIVILEGE_USED,
    ],
    limit: 5000,
  });

  const financialRecordChanges = soxEvents.filter(
    (event) =>
      (event.event_type === AuditEventType.DATA_UPDATE ||
        event.event_type === AuditEventType.DATA_DELETE) &&
      (event.resource_type?.includes('financial') ||
        event.resource_type?.includes('billing') ||
        event.resource_type?.includes('payment')),
  );

  const adminActions = soxEvents.filter(
    (event) =>
      event.event_type === AuditEventType.SECURITY_ADMIN_PRIVILEGE_USED,
  );

  return {
    summary: {
      financial_record_changes: financialRecordChanges.length,
      admin_privilege_usage: adminActions.length,
      total_financial_transactions: soxEvents.filter(
        (e) => e.event_type === AuditEventType.FINANCIAL_PAYMENT_PROCESSED,
      ).length,
    },
    internal_controls: {
      segregation_of_duties: analyzeSeparationOfDuties(soxEvents),
      approval_workflows: analyzeApprovalWorkflows(soxEvents),
      change_management: analyzeChangeManagement(financialRecordChanges),
    },
    financial_reporting_integrity: {
      unauthorized_financial_changes: financialRecordChanges.filter(
        (e) => e.severity === 'warning' || e.severity === 'error',
      ).length,
      proper_authorization: financialRecordChanges.filter(
        (e) => e.details?.authorized === true,
      ).length,
      audit_trail_completeness: calculateAuditTrailCompleteness(
        financialRecordChanges,
      ),
    },
    ...(includeDetails && {
      detailed_events: {
        financial_record_changes: financialRecordChanges,
        admin_actions: adminActions,
      },
    }),
  };
}

// HIPAA Compliance Report (if applicable)
async function generateHIPAAReport(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  includeDetails: boolean,
) {
  const hipaaEvents = await auditService.query({
    organization_id: organizationId,
    start_date: startDate,
    end_date: endDate,
    event_types: [
      AuditEventType.DATA_READ,
      AuditEventType.DATA_UPDATE,
      AuditEventType.DATA_CREATE,
      AuditEventType.DATA_DELETE,
      AuditEventType.DATA_BULK_EXPORT,
      AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
    ],
    limit: 5000,
  });

  const phiAccess = hipaaEvents.filter(
    (event) =>
      event.details?.data_classification === 'restricted' &&
      event.details?.phi_data === true,
  );

  return {
    summary: {
      phi_access_events: phiAccess.length,
      unauthorized_access_attempts: hipaaEvents.filter(
        (e) =>
          e.event_type === AuditEventType.SECURITY_UNAUTHORIZED_ACCESS &&
          e.details?.phi_data === true,
      ).length,
    },
    safeguards: {
      access_controls: analyzeHIPAAAccessControls(phiAccess),
      audit_controls: phiAccess.length > 0, // Audit trail exists
      integrity: analyzeDataIntegrity(phiAccess),
      transmission_security: analyzeTransmissionSecurity(phiAccess),
    },
    ...(includeDetails && {
      detailed_events: {
        phi_access: phiAccess,
      },
    }),
  };
}

// Comprehensive Report combining all compliance frameworks
async function generateComprehensiveReport(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  includeDetails: boolean,
) {
  const [gdprReport, pciReport, soxReport, hipaaReport] = await Promise.all([
    generateGDPRReport(organizationId, startDate, endDate, false),
    generatePCIReport(organizationId, startDate, endDate, false),
    generateSOXReport(organizationId, startDate, endDate, false),
    generateHIPAAReport(organizationId, startDate, endDate, false),
  ]);

  return {
    gdpr_compliance: gdprReport,
    pci_compliance: pciReport,
    sox_compliance: soxReport,
    hipaa_compliance: hipaaReport,
    overall_compliance_score: calculateOverallComplianceScore([
      gdprReport,
      pciReport,
      soxReport,
      hipaaReport,
    ]),
  };
}

// Helper functions
function calculateAverageResponseTime(requests: any[]): number {
  if (requests.length === 0) return 0;

  const responseTimes = requests
    .filter((req) => req.details?.response_time_hours)
    .map((req) => req.details.response_time_hours);

  return responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;
}

function getOutstandingRequests(requests: any[]): number {
  return requests.filter(
    (req) =>
      req.details?.status === 'pending' ||
      req.details?.status === 'in_progress',
  ).length;
}

function identifyPCIViolations(events: any[]): any[] {
  const violations = [];

  // Check for unmasked card data
  events.forEach((event) => {
    if (
      event.details?.card_number &&
      !event.details.card_number.includes('****')
    ) {
      violations.push({
        type: 'unmasked_card_data',
        event_id: event.id,
        timestamp: event.timestamp,
        severity: 'critical',
      });
    }
  });

  return violations;
}

function analyzeSeparationOfDuties(events: any[]): any {
  const userActions: Record<string, string[]> = {};

  events.forEach((event) => {
    if (event.user_id) {
      if (!userActions[event.user_id]) {
        userActions[event.user_id] = [];
      }
      userActions[event.user_id].push(event.action);
    }
  });

  const violations = Object.entries(userActions).filter(
    ([userId, actions]) =>
      actions.includes('create_transaction') &&
      actions.includes('approve_transaction'),
  );

  return {
    violations: violations.length,
    total_users_analyzed: Object.keys(userActions).length,
  };
}

function analyzeApprovalWorkflows(events: any[]): any {
  const approvalEvents = events.filter(
    (event) => event.details?.requires_approval === true,
  );

  const approvedEvents = approvalEvents.filter(
    (event) => event.details?.approved === true,
  );

  return {
    total_approval_required: approvalEvents.length,
    properly_approved: approvedEvents.length,
    approval_rate:
      approvalEvents.length > 0
        ? (approvedEvents.length / approvalEvents.length) * 100
        : 0,
  };
}

function analyzeChangeManagement(changes: any[]): any {
  const authorizedChanges = changes.filter(
    (change) => change.details?.authorized === true,
  );

  return {
    total_changes: changes.length,
    authorized_changes: authorizedChanges.length,
    authorization_rate:
      changes.length > 0
        ? (authorizedChanges.length / changes.length) * 100
        : 0,
  };
}

function calculateAuditTrailCompleteness(events: any[]): number {
  const requiredFields = ['user_id', 'action', 'timestamp', 'details'];

  const completeEvents = events.filter((event) =>
    requiredFields.every((field) => event[field] != null),
  );

  return events.length > 0 ? (completeEvents.length / events.length) * 100 : 0;
}

function analyzeHIPAAAccessControls(events: any[]): any {
  const uniqueUsers = new Set(events.map((e) => e.user_id));
  const authorizedAccess = events.filter((e) => e.details?.authorized === true);

  return {
    unique_users_accessing_phi: uniqueUsers.size,
    authorized_access_rate:
      events.length > 0 ? (authorizedAccess.length / events.length) * 100 : 0,
  };
}

function analyzeDataIntegrity(events: any[]): any {
  const modifications = events.filter(
    (e) =>
      e.event_type === AuditEventType.DATA_UPDATE ||
      e.event_type === AuditEventType.DATA_DELETE,
  );

  return {
    total_modifications: modifications.length,
    logged_changes: modifications.filter((e) => e.change_diff).length,
  };
}

function analyzeTransmissionSecurity(events: any[]): any {
  const transmissionEvents = events.filter(
    (e) => e.details?.transmission === true,
  );

  const encryptedTransmissions = transmissionEvents.filter(
    (e) => e.details?.encrypted === true,
  );

  return {
    total_transmissions: transmissionEvents.length,
    encrypted_transmissions: encryptedTransmissions.length,
    encryption_rate:
      transmissionEvents.length > 0
        ? (encryptedTransmissions.length / transmissionEvents.length) * 100
        : 0,
  };
}

function calculateOverallComplianceScore(reports: any[]): number {
  // Simple scoring algorithm - can be enhanced based on specific requirements
  let totalScore = 0;
  let maxScore = 0;

  reports.forEach((report) => {
    // Add scoring logic based on report content
    // This is a simplified example
    if (report.summary) {
      maxScore += 100;
      totalScore += 80; // Base score
    }
  });

  return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
}

function convertReportToCSV(report: any): string {
  // Simplified CSV conversion - would need enhancement for complex nested objects
  const headers = Object.keys(report.summary || {});
  const values = Object.values(report.summary || {});

  return `${headers.join(',')}\n${values.join(',')}`;
}
