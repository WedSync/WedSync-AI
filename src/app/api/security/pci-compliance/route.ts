/**
 * PCI DSS Compliance Management API
 *
 * Provides endpoints for PCI DSS compliance monitoring, reporting,
 * and incident management for enterprise payment security.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pciDSSManager } from '@/lib/security/pci-dss-compliance';
import { withHighSecurity } from '@/lib/comprehensive-security-middleware';
import { z } from 'zod';

// Schema for compliance assessment request
const assessmentRequestSchema = z.object({
  assessmentType: z.enum(['full', 'targeted', 'self_assessment']),
  requirements: z.array(z.string()).optional(),
  includeRecommendations: z.boolean().default(true),
});

// Schema for incident reporting
const incidentReportSchema = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  affectedSystems: z.array(z.string()),
  cardholderDataInvolved: z.boolean(),
  discoveredAt: z.string().optional(),
  reportedBy: z.string().optional(),
});

async function handleComplianceGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'report':
      return handleComplianceReport();

    case 'assessment':
      return handleSecurityAssessment();

    case 'metrics':
      return handleComplianceMetrics();

    default:
      return NextResponse.json(
        { error: 'Invalid action parameter' },
        { status: 400 },
      );
  }
}

async function handleCompliancePost(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'assess':
      return handleCustomAssessment(request);

    case 'incident':
      return handleIncidentReport(request);

    default:
      return NextResponse.json(
        { error: 'Invalid action parameter' },
        { status: 400 },
      );
  }
}

async function handleComplianceReport() {
  try {
    const report = await pciDSSManager.generateComplianceReport();

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to generate report',
      },
      { status: 500 },
    );
  }
}

async function handleSecurityAssessment() {
  try {
    const assessment = await pciDSSManager.performSecurityAssessment();

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to perform assessment',
      },
      { status: 500 },
    );
  }
}

async function handleComplianceMetrics() {
  try {
    // Get current compliance status and metrics
    const report = await pciDSSManager.generateComplianceReport();

    const metrics = {
      overallComplianceScore: report.overallScore,
      complianceStatus: report.status,
      compliantRequirements: report.summary.compliantRequirements,
      totalRequirements: report.summary.totalRequirements,
      criticalIssues: report.summary.criticalIssues,
      compliancePercentage: Math.round(
        (report.summary.compliantRequirements /
          report.summary.totalRequirements) *
          100,
      ),
      lastAssessment: report.summary.lastAssessment,
      trendData: {
        // Would be populated from historical data in production
        monthlyScores: [],
        improvementAreas: report.recommendations.slice(0, 3),
      },
    };

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metrics',
      },
      { status: 500 },
    );
  }
}

async function handleCustomAssessment(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentType, requirements, includeRecommendations } =
      assessmentRequestSchema.parse(body);

    // Perform targeted or full assessment
    const assessment = await pciDSSManager.performSecurityAssessment();

    let filteredResults = assessment;

    // Filter by specific requirements if requested
    if (requirements && requirements.length > 0) {
      filteredResults = {
        ...assessment,
        findings: assessment.findings.filter((finding) =>
          requirements.includes(finding.requirement),
        ),
      };
    }

    const response: any = {
      success: true,
      assessmentId: assessment.assessmentId,
      timestamp: assessment.timestamp,
      findings: filteredResults.findings,
      overallRisk: assessment.overallRisk,
    };

    if (includeRecommendations) {
      const report = await pciDSSManager.generateComplianceReport();
      response.recommendations = report.recommendations;
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Assessment failed',
      },
      { status: 500 },
    );
  }
}

async function handleIncidentReport(request: NextRequest) {
  try {
    const body = await request.json();
    const incident = incidentReportSchema.parse(body);

    const response = await pciDSSManager.handleSecurityIncident(incident);

    return NextResponse.json({
      success: true,
      incidentResponse: response,
      message: 'Security incident has been logged and response initiated',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid incident report data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process incident report',
      },
      { status: 500 },
    );
  }
}

// Apply high security middleware
export const GET = withHighSecurity(handleComplianceGet);
export const POST = withHighSecurity(handleCompliancePost);
