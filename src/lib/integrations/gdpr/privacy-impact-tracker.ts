import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export interface PrivacyImpactLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  requiresAssessment: boolean;
}

export interface PrivacyOperation {
  id: string;
  operation: string;
  dataTypes: string[];
  sensitivityLevel: 'personal' | 'sensitive' | 'special_category';
  processingPurpose: string;
  dataSubjects: number;
  retentionPeriod?: number;
  thirdPartySharing: boolean;
  crossBorderTransfer: boolean;
  automatedDecisionMaking: boolean;
}

export interface PrivacyImpactAssessment {
  operationId: string;
  impactLevel: PrivacyImpactLevel;
  riskFactors: string[];
  mitigationMeasures: string[];
  complianceRequirements: string[];
  lastReviewed: Date;
  reviewedBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_review';
}

export interface PrivacyRiskIndicator {
  type:
    | 'data_volume'
    | 'sensitivity'
    | 'third_party'
    | 'cross_border'
    | 'automation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  threshold: number;
  currentValue: number;
}

const privacyOperationSchema = z.object({
  id: z.string(),
  operation: z.string(),
  dataTypes: z.array(z.string()),
  sensitivityLevel: z.enum(['personal', 'sensitive', 'special_category']),
  processingPurpose: z.string(),
  dataSubjects: z.number(),
  retentionPeriod: z.number().optional(),
  thirdPartySharing: z.boolean(),
  crossBorderTransfer: z.boolean(),
  automatedDecisionMaking: z.boolean(),
});

export class PrivacyImpactTracker {
  private supabase;
  private riskThresholds = {
    data_volume: { low: 100, medium: 1000, high: 10000 },
    retention_days: { low: 30, medium: 365, high: 1095 },
    third_party_count: { low: 1, medium: 3, high: 5 },
  };

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async trackOperation(
    operation: PrivacyOperation,
  ): Promise<PrivacyImpactLevel> {
    // SENIOR CODE REVIEWER FIX: Ensure all required properties are present
    const operationWithDefaults: PrivacyOperation = {
      id: operation.id || crypto.randomUUID(),
      operation: operation.operation || 'unknown',
      dataTypes: operation.dataTypes || [],
      sensitivityLevel: operation.sensitivityLevel || 'personal',
      processingPurpose: operation.processingPurpose || 'not_specified',
      dataSubjects: operation.dataSubjects || 0,
      retentionPeriod: operation.retentionPeriod,
      thirdPartySharing: operation.thirdPartySharing || false,
      crossBorderTransfer: operation.crossBorderTransfer || false,
      automatedDecisionMaking: operation.automatedDecisionMaking || false,
    };

    // SENIOR CODE REVIEWER FIX: Cast validated operation to ensure type compliance
    const validatedOperation = privacyOperationSchema.parse(
      operationWithDefaults,
    ) as PrivacyOperation;

    const impactLevel = this.calculateImpactLevel(validatedOperation);

    await this.storeOperationTracking({
      ...validatedOperation,
      impactLevel,
      timestamp: new Date(),
    });

    if (impactLevel.requiresAssessment) {
      await this.initiatePrivacyImpactAssessment(
        validatedOperation,
        impactLevel,
      );
    }

    return impactLevel;
  }

  async identifyHighRiskOperations(): Promise<{
    operations: Array<PrivacyOperation & { impactLevel: PrivacyImpactLevel }>;
    totalRiskScore: number;
    criticalCount: number;
    assessmentsPending: number;
  }> {
    const { data: operations } = await this.supabase
      .from('privacy_operations_tracking')
      .select('*')
      .gte('impact_score', 7)
      .order('impact_score', { ascending: false });

    const operationsWithImpact =
      operations?.map((op) => ({
        ...this.mapFromDatabase(op),
        impactLevel: {
          level: op.impact_level as 'low' | 'medium' | 'high' | 'critical',
          score: op.impact_score,
          description: op.impact_description,
          requiresAssessment: op.requires_assessment,
        },
      })) || [];

    const totalRiskScore = operationsWithImpact.reduce(
      (sum, op) => sum + op.impactLevel.score,
      0,
    );

    const criticalCount = operationsWithImpact.filter(
      (op) => op.impactLevel.level === 'critical',
    ).length;

    const { data: pendingAssessments } = await this.supabase
      .from('privacy_impact_assessments')
      .select('id')
      .eq('status', 'pending');

    return {
      operations: operationsWithImpact,
      totalRiskScore,
      criticalCount,
      assessmentsPending: pendingAssessments?.length || 0,
    };
  }

  async generateRiskIndicators(
    operationId: string,
  ): Promise<PrivacyRiskIndicator[]> {
    const { data: operation } = await this.supabase
      .from('privacy_operations_tracking')
      .select('*')
      .eq('id', operationId)
      .single();

    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    const indicators: PrivacyRiskIndicator[] = [];

    // Data volume risk
    const volumeRisk = this.assessDataVolumeRisk(operation.data_subjects);
    indicators.push({
      type: 'data_volume',
      severity: volumeRisk.severity,
      description: `Processing data for ${operation.data_subjects} data subjects`,
      threshold: volumeRisk.threshold,
      currentValue: operation.data_subjects,
    });

    // Data sensitivity risk
    const sensitivityRisk = this.assessSensitivityRisk(
      operation.sensitivity_level,
    );
    indicators.push({
      type: 'sensitivity',
      severity: sensitivityRisk.severity,
      description: `Processing ${operation.sensitivity_level} category data`,
      threshold: sensitivityRisk.threshold,
      currentValue: sensitivityRisk.score,
    });

    // Third-party sharing risk
    if (operation.third_party_sharing) {
      indicators.push({
        type: 'third_party',
        severity: 'medium',
        description: 'Data shared with third parties',
        threshold: 1,
        currentValue: 1,
      });
    }

    // Cross-border transfer risk
    if (operation.cross_border_transfer) {
      indicators.push({
        type: 'cross_border',
        severity: 'high',
        description: 'Cross-border data transfers involved',
        threshold: 1,
        currentValue: 1,
      });
    }

    // Automated decision-making risk
    if (operation.automated_decision_making) {
      indicators.push({
        type: 'automation',
        severity: 'high',
        description: 'Automated decision-making affecting individuals',
        threshold: 1,
        currentValue: 1,
      });
    }

    return indicators;
  }

  async monitorPrivacyCompliance(): Promise<{
    complianceScore: number;
    violations: Array<{
      operationId: string;
      violation: string;
      severity: string;
      detectedAt: Date;
    }>;
    recommendations: string[];
    assessmentsDue: Array<{
      operationId: string;
      dueDate: Date;
      riskLevel: string;
    }>;
  }> {
    const { data: operations } = await this.supabase
      .from('privacy_operations_tracking')
      .select('*')
      .order('created_at', { ascending: false });

    const violations: Array<{
      operationId: string;
      violation: string;
      severity: string;
      detectedAt: Date;
    }> = [];

    const recommendations: Set<string> = new Set();
    const assessmentsDue: Array<{
      operationId: string;
      dueDate: Date;
      riskLevel: string;
    }> = [];

    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const operation of operations || []) {
      const complianceChecks = await this.performComplianceChecks(operation);
      totalScore += complianceChecks.score;
      maxPossibleScore += 10; // Each operation has max 10 points

      violations.push(...complianceChecks.violations);
      complianceChecks.recommendations.forEach((rec) =>
        recommendations.add(rec),
      );

      // Check if assessment is due
      if (
        operation.requires_assessment &&
        operation.impact_level === 'critical'
      ) {
        const lastReviewed = new Date(
          operation.last_reviewed || operation.created_at,
        );
        const reviewDue = new Date(lastReviewed);
        reviewDue.setDate(reviewDue.getDate() + 90); // 90-day review cycle

        if (reviewDue <= new Date()) {
          assessmentsDue.push({
            operationId: operation.id,
            dueDate: reviewDue,
            riskLevel: operation.impact_level,
          });
        }
      }
    }

    const complianceScore =
      maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 100;

    return {
      complianceScore,
      violations,
      recommendations: Array.from(recommendations),
      assessmentsDue,
    };
  }

  async generatePrivacyImpactReport(operationId: string): Promise<{
    operation: PrivacyOperation;
    impactAssessment: PrivacyImpactAssessment;
    riskIndicators: PrivacyRiskIndicator[];
    complianceStatus: string;
    recommendedActions: string[];
  }> {
    const { data: operationData } = await this.supabase
      .from('privacy_operations_tracking')
      .select('*')
      .eq('id', operationId)
      .single();

    if (!operationData) {
      throw new Error(`Operation ${operationId} not found`);
    }

    const operation = this.mapFromDatabase(operationData);

    const { data: assessmentData } = await this.supabase
      .from('privacy_impact_assessments')
      .select('*')
      .eq('operation_id', operationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const impactAssessment: PrivacyImpactAssessment = assessmentData
      ? {
          operationId: assessmentData.operation_id,
          impactLevel: {
            level: assessmentData.impact_level,
            score: assessmentData.impact_score,
            description: assessmentData.impact_description,
            requiresAssessment: assessmentData.requires_assessment,
          },
          riskFactors: assessmentData.risk_factors || [],
          mitigationMeasures: assessmentData.mitigation_measures || [],
          complianceRequirements: assessmentData.compliance_requirements || [],
          lastReviewed: new Date(assessmentData.last_reviewed),
          reviewedBy: assessmentData.reviewed_by,
          status: assessmentData.status,
        }
      : await this.createDefaultAssessment(operation);

    const riskIndicators = await this.generateRiskIndicators(operationId);

    const complianceChecks = await this.performComplianceChecks(operationData);
    const complianceStatus =
      complianceChecks.score >= 8 ? 'compliant' : 'non_compliant';

    const recommendedActions = this.generateRecommendations(
      operation,
      riskIndicators,
      complianceChecks.violations,
    );

    return {
      operation,
      impactAssessment,
      riskIndicators,
      complianceStatus,
      recommendedActions,
    };
  }

  private calculateImpactLevel(
    operation: PrivacyOperation,
  ): PrivacyImpactLevel {
    let score = 0;

    // Base score from data sensitivity
    const sensitivityScores = {
      personal: 2,
      sensitive: 5,
      special_category: 8,
    };
    score += sensitivityScores[operation.sensitivityLevel];

    // Data volume impact
    if (operation.dataSubjects > 10000) score += 3;
    else if (operation.dataSubjects > 1000) score += 2;
    else if (operation.dataSubjects > 100) score += 1;

    // Third-party sharing
    if (operation.thirdPartySharing) score += 2;

    // Cross-border transfers
    if (operation.crossBorderTransfer) score += 2;

    // Automated decision-making
    if (operation.automatedDecisionMaking) score += 3;

    // Long retention periods
    if (operation.retentionPeriod && operation.retentionPeriod > 365)
      score += 1;

    let level: 'low' | 'medium' | 'high' | 'critical';
    let requiresAssessment = false;

    if (score >= 10) {
      level = 'critical';
      requiresAssessment = true;
    } else if (score >= 7) {
      level = 'high';
      requiresAssessment = true;
    } else if (score >= 4) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return {
      level,
      score,
      description: this.generateImpactDescription(level, score),
      requiresAssessment,
    };
  }

  private generateImpactDescription(level: string, score: number): string {
    const descriptions = {
      low: `Low privacy impact (score: ${score}). Standard data protection measures apply.`,
      medium: `Medium privacy impact (score: ${score}). Enhanced protection measures recommended.`,
      high: `High privacy impact (score: ${score}). Comprehensive privacy assessment required.`,
      critical: `Critical privacy impact (score: ${score}). Immediate privacy impact assessment mandatory.`,
    };

    return descriptions[level as keyof typeof descriptions];
  }

  private async storeOperationTracking(operation: any): Promise<void> {
    await this.supabase.from('privacy_operations_tracking').insert({
      id: operation.id,
      operation: operation.operation,
      data_types: operation.dataTypes,
      sensitivity_level: operation.sensitivityLevel,
      processing_purpose: operation.processingPurpose,
      data_subjects: operation.dataSubjects,
      retention_period: operation.retentionPeriod,
      third_party_sharing: operation.thirdPartySharing,
      cross_border_transfer: operation.crossBorderTransfer,
      automated_decision_making: operation.automatedDecisionMaking,
      impact_level: operation.impactLevel.level,
      impact_score: operation.impactLevel.score,
      impact_description: operation.impactLevel.description,
      requires_assessment: operation.impactLevel.requiresAssessment,
      created_at: operation.timestamp.toISOString(),
    });
  }

  private async initiatePrivacyImpactAssessment(
    operation: PrivacyOperation,
    impactLevel: PrivacyImpactLevel,
  ): Promise<void> {
    await this.supabase.from('privacy_impact_assessments').insert({
      operation_id: operation.id,
      impact_level: impactLevel.level,
      impact_score: impactLevel.score,
      impact_description: impactLevel.description,
      requires_assessment: impactLevel.requiresAssessment,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  private assessDataVolumeRisk(dataSubjects: number): {
    severity: 'low' | 'medium' | 'high';
    threshold: number;
  } {
    if (dataSubjects > this.riskThresholds.data_volume.high) {
      return {
        severity: 'high',
        threshold: this.riskThresholds.data_volume.high,
      };
    }
    if (dataSubjects > this.riskThresholds.data_volume.medium) {
      return {
        severity: 'medium',
        threshold: this.riskThresholds.data_volume.medium,
      };
    }
    return { severity: 'low', threshold: this.riskThresholds.data_volume.low };
  }

  private assessSensitivityRisk(sensitivityLevel: string): {
    severity: 'low' | 'medium' | 'high';
    threshold: number;
    score: number;
  } {
    const levels = {
      personal: { severity: 'low' as const, score: 1, threshold: 1 },
      sensitive: { severity: 'medium' as const, score: 2, threshold: 2 },
      special_category: { severity: 'high' as const, score: 3, threshold: 3 },
    };

    return levels[sensitivityLevel as keyof typeof levels] || levels.personal;
  }

  private async performComplianceChecks(operation: any): Promise<{
    score: number;
    violations: Array<{
      operationId: string;
      violation: string;
      severity: string;
      detectedAt: Date;
    }>;
    recommendations: string[];
  }> {
    let score = 10;
    const violations: Array<{
      operationId: string;
      violation: string;
      severity: string;
      detectedAt: Date;
    }> = [];
    const recommendations: string[] = [];

    // Check retention period compliance
    if (operation.retention_period && operation.retention_period > 2555) {
      // 7 years
      violations.push({
        operationId: operation.id,
        violation: 'Retention period exceeds recommended maximum',
        severity: 'medium',
        detectedAt: new Date(),
      });
      score -= 2;
      recommendations.push('Review and reduce data retention period');
    }

    // Check for proper consent tracking
    if (
      operation.sensitivity_level === 'special_category' &&
      !operation.explicit_consent
    ) {
      violations.push({
        operationId: operation.id,
        violation: 'Special category data processed without explicit consent',
        severity: 'high',
        detectedAt: new Date(),
      });
      score -= 4;
      recommendations.push(
        'Implement explicit consent mechanism for special category data',
      );
    }

    return { score, violations, recommendations };
  }

  private generateRecommendations(
    operation: PrivacyOperation,
    riskIndicators: PrivacyRiskIndicator[],
    violations: any[],
  ): string[] {
    const recommendations: Set<string> = new Set();

    // High-risk indicators recommendations
    riskIndicators.forEach((indicator) => {
      if (indicator.severity === 'high') {
        switch (indicator.type) {
          case 'data_volume':
            recommendations.add(
              'Consider data minimization techniques to reduce the volume of personal data processed',
            );
            break;
          case 'cross_border':
            recommendations.add(
              'Implement appropriate safeguards for cross-border data transfers',
            );
            break;
          case 'automation':
            recommendations.add(
              'Provide meaningful human review for automated decisions',
            );
            break;
        }
      }
    });

    // Violation-specific recommendations
    violations.forEach((violation) => {
      if (violation.severity === 'high') {
        recommendations.add(
          'Address high-severity compliance violations immediately',
        );
      }
    });

    return Array.from(recommendations);
  }

  private mapFromDatabase(dbOperation: any): PrivacyOperation {
    return {
      id: dbOperation.id,
      operation: dbOperation.operation,
      dataTypes: dbOperation.data_types,
      sensitivityLevel: dbOperation.sensitivity_level,
      processingPurpose: dbOperation.processing_purpose,
      dataSubjects: dbOperation.data_subjects,
      retentionPeriod: dbOperation.retention_period,
      thirdPartySharing: dbOperation.third_party_sharing,
      crossBorderTransfer: dbOperation.cross_border_transfer,
      automatedDecisionMaking: dbOperation.automated_decision_making,
    };
  }

  private async createDefaultAssessment(
    operation: PrivacyOperation,
  ): Promise<PrivacyImpactAssessment> {
    const impactLevel = this.calculateImpactLevel(operation);

    return {
      operationId: operation.id,
      impactLevel,
      riskFactors: ['Pending assessment'],
      mitigationMeasures: ['Assessment required'],
      complianceRequirements: ['GDPR compliance review needed'],
      lastReviewed: new Date(),
      reviewedBy: 'System',
      status: 'pending',
    };
  }
}

export const privacyImpactTracker = new PrivacyImpactTracker();

export async function withPrivacyImpactTracking<T>(
  operation: PrivacyOperation,
  callback: () => Promise<T>,
): Promise<{ result: T; impactLevel: PrivacyImpactLevel }> {
  const impactLevel = await privacyImpactTracker.trackOperation(operation);
  const result = await callback();

  return { result, impactLevel };
}
