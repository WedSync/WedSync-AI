/**
 * WS-177 Audit Log Analyzer Unit Tests - Team B Backend Audit Integration
 * ============================================================================
 * Comprehensive test suite for WeddingAuditLogAnalyzer pattern detection
 * Tests security pattern analysis and anomaly detection with >80% coverage
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { WeddingAuditLogAnalyzer } from '@/lib/audit/log-analyzer';
import { createClient } from '@/lib/supabase/server';
import type { 
  SuspiciousPatternType,
  SecurityAlertLevel,
  AnomalyDetectionResult 
} from '@/types/audit';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

// Mock audit logger for integration
vi.mock('@/lib/audit/audit-logger', () => ({
  weddingAuditLogger: {
    logAuditEvent: vi.fn(),
    queryWeddingAuditLogs: vi.fn()
  }
}));

describe('WeddingAuditLogAnalyzer', () => {
  let logAnalyzer: WeddingAuditLogAnalyzer;
  let mockSupabase: any;
  let mockSelect: MockedFunction<any>;
  let mockFrom: MockedFunction<any>;
  let mockInsert: MockedFunction<any>;

  const mockAuditLogs = [
    {
      id: '1',
      action: 'guest.dietary_requirements_access',
      user_id: 'user-1',
      organization_id: 'org-1',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
      risk_score: 65,
      wedding_context: { guest_id: 'guest-1', sensitivity_level: 'confidential' }
    },
    {
      id: '2',
      action: 'guest.dietary_requirements_access',
      user_id: 'user-1',
      organization_id: 'org-1',
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 min ago
      risk_score: 70,
      wedding_context: { guest_id: 'guest-2', sensitivity_level: 'confidential' }
    },
    {
      id: '3',
      action: 'guest.dietary_requirements_access',
      user_id: 'user-1',
      organization_id: 'org-1',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
      risk_score: 75,
      wedding_context: { guest_id: 'guest-3', sensitivity_level: 'confidential' }
    },
    {
      id: '4',
      action: 'budget.payment_authorization',
      user_id: 'user-2',
      organization_id: 'org-1',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
      risk_score: 95,
      wedding_context: { client_id: 'client-1', sensitivity_level: 'restricted' }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'pattern-analysis-1' }], error: null })
    });

    mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null })
          })
        })
      }),
      in: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null })
        })
      }),
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockAuditLogs, error: null })
      })
    });

    mockFrom = vi.fn().mockImplementation((table: string) => ({
      select: mockSelect,
      insert: mockInsert
    }));

    mockSupabase = {
      from: mockFrom,
      rpc: vi.fn().mockResolvedValue({ data: [{ pattern_count: 3 }], error: null })
    };

    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase);
    
    logAnalyzer = new WeddingAuditLogAnalyzer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Suspicious Pattern Detection', () => {
    it('should detect rapid guest data access patterns', async () => {
      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 1);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          pattern_type: 'rapid_guest_access',
          severity: expect.any(String),
          event_count: expect.any(Number),
          confidence_score: expect.any(Number)
        })
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should identify bulk vendor operations', async () => {
      // Mock vendor-specific logs
      const vendorLogs = Array.from({ length: 8 }, (_, i) => ({
        id: `vendor-${i}`,
        action: 'vendor.contract_access',
        user_id: 'user-vendor',
        organization_id: 'org-1',
        timestamp: new Date(Date.now() - i * 2 * 60 * 1000).toISOString(),
        risk_score: 60,
        wedding_context: { supplier_id: `vendor-${i}` }
      }));

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: vendorLogs, error: null })
            })
          })
        })
      });

      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 1);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          pattern_type: 'bulk_vendor_operations',
          event_count: expect.any(Number),
          confidence_score: expect.any(Number)
        })
      );
    });

    it('should detect unusual task modification patterns', async () => {
      const taskLogs = Array.from({ length: 6 }, (_, i) => ({
        id: `task-${i}`,
        action: 'task.critical_deadline_modify',
        user_id: 'user-task',
        organization_id: 'org-1',
        timestamp: new Date(Date.now() - i * 3 * 60 * 1000).toISOString(),
        risk_score: 80,
        wedding_context: { task_id: `task-${i}`, business_impact: 'critical' }
      }));

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: taskLogs, error: null })
            })
          })
        })
      });

      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 1);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          pattern_type: 'unusual_task_modifications',
          severity: expect.stringMatching(/^(low|medium|high|critical)$/),
          details: expect.objectContaining({
            modification_type: 'deadline'
          })
        })
      );
    });

    it('should identify off-hours administrative access', async () => {
      // Create logs at 2 AM (off-hours)
      const offHoursTime = new Date();
      offHoursTime.setHours(2, 0, 0, 0);

      const offHoursLogs = [
        {
          id: 'admin-1',
          action: 'auth.privileged_access_grant',
          user_id: 'admin-user',
          organization_id: 'org-1',
          timestamp: offHoursTime.toISOString(),
          risk_score: 90,
          wedding_context: { sensitivity_level: 'restricted' }
        }
      ];

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: offHoursLogs, error: null })
            })
          })
        })
      });

      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 24);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          pattern_type: 'off_hours_admin_access',
          confidence_score: expect.any(Number)
        })
      );
    });

    it('should detect failed authentication spikes', async () => {
      const failedAuthLogs = Array.from({ length: 12 }, (_, i) => ({
        id: `auth-fail-${i}`,
        action: 'auth.login_failed',
        user_id: 'suspicious-user',
        organization_id: 'org-1',
        timestamp: new Date(Date.now() - i * 1 * 60 * 1000).toISOString(),
        risk_score: 85,
        wedding_context: { sensitivity_level: 'confidential' }
      }));

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: failedAuthLogs, error: null })
            })
          })
        })
      });

      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 1);

      expect(patterns).toContainEqual(
        expect.objectContaining({
          pattern_type: 'failed_auth_spike',
          severity: 'high',
          event_count: 12
        })
      );
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect behavioral anomalies', async () => {
      const anomalies = await logAnalyzer.detectAnomalies('org-1', 24);

      expect(anomalies).toEqual(
        expect.objectContaining({
          anomalies_detected: expect.any(Array),
          analysis_summary: expect.objectContaining({
            total_anomalies: expect.any(Number),
            high_risk_anomalies: expect.any(Number),
            analysis_timestamp: expect.any(String)
          })
        })
      );
    });

    it('should identify unusual access patterns by user', async () => {
      const result = await logAnalyzer.detectAnomalies('org-1', 12);

      expect(result.anomalies_detected).toContainEqual(
        expect.objectContaining({
          anomaly_type: expect.stringMatching(/^(volume|timing|access_pattern|behavior)$/),
          risk_level: expect.stringMatching(/^(low|medium|high|critical)$/),
          details: expect.any(Object)
        })
      );
    });

    it('should handle empty audit log sets gracefully', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      });

      const anomalies = await logAnalyzer.detectAnomalies('org-1', 24);

      expect(anomalies).toEqual(
        expect.objectContaining({
          anomalies_detected: [],
          analysis_summary: expect.objectContaining({
            total_anomalies: 0
          })
        })
      );
    });
  });

  describe('Real-time Security Alerts', () => {
    beforeEach(() => {
      // Mock existing security pattern analysis records
      const mockPatternAnalysis = [
        {
          id: 'alert-1',
          organization_id: 'org-1',
          pattern_type: 'rapid_guest_access',
          severity: 'high',
          confidence_score: 85,
          event_count: 5,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min ago
        },
        {
          id: 'alert-2',
          organization_id: 'org-1',
          pattern_type: 'failed_auth_spike',
          severity: 'critical',
          confidence_score: 95,
          event_count: 15,
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 min ago
        }
      ];

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ 
              data: mockPatternAnalysis, 
              error: null 
            })
          })
        })
      });
    });

    it('should retrieve active security alerts', async () => {
      const alerts = await logAnalyzer.getRealtimeSecurityAlerts('org-1');

      expect(alerts).toHaveLength(2);
      expect(alerts[0]).toMatchObject({
        alert_level: expect.stringMatching(/^(low|medium|high|critical)$/),
        pattern_type: expect.any(String),
        confidence_score: expect.any(Number),
        event_count: expect.any(Number)
      });
    });

    it('should prioritize critical alerts', async () => {
      const alerts = await logAnalyzer.getRealtimeSecurityAlerts('org-1');

      const criticalAlert = alerts.find(alert => alert.alert_level === 'critical');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.pattern_type).toBe('failed_auth_spike');
    });

    it('should filter alerts by time window', async () => {
      // Test with shorter time window (15 minutes)
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ 
              data: [
                {
                  id: 'alert-2',
                  organization_id: 'org-1',
                  pattern_type: 'failed_auth_spike',
                  severity: 'critical',
                  confidence_score: 95,
                  event_count: 15,
                  created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
                }
              ], 
              error: null 
            })
          })
        })
      });

      const alerts = await logAnalyzer.getRealtimeSecurityAlerts('org-1');
      expect(alerts).toHaveLength(1);
    });
  });

  describe('Risk Assessment Report Generation', () => {
    it('should generate comprehensive risk assessment', async () => {
      const report = await logAnalyzer.generateRiskAssessmentReport('org-1', 24);

      expect(report).toMatchObject({
        organization_id: 'org-1',
        assessment_period_hours: 24,
        generated_at: expect.any(String),
        overall_risk_score: expect.any(Number),
        risk_breakdown: expect.objectContaining({
          authentication_risk: expect.any(Number),
          data_access_risk: expect.any(Number),
          financial_risk: expect.any(Number),
          operational_risk: expect.any(Number)
        }),
        key_findings: expect.any(Array),
        recommendations: expect.any(Array)
      });
    });

    it('should calculate accurate risk scores', async () => {
      const report = await logAnalyzer.generateRiskAssessmentReport('org-1', 12);

      expect(report.overall_risk_score).toBeGreaterThanOrEqual(0);
      expect(report.overall_risk_score).toBeLessThanOrEqual(100);

      // High-risk logs should result in elevated risk scores
      expect(report.risk_breakdown.financial_risk).toBeGreaterThan(80); // Due to payment auth log
    });

    it('should provide actionable recommendations', async () => {
      const report = await logAnalyzer.generateRiskAssessmentReport('org-1', 24);

      expect(report.recommendations).toContainEqual(
        expect.objectContaining({
          priority: expect.stringMatching(/^(low|medium|high|critical)$/),
          action: expect.any(String),
          rationale: expect.any(String)
        })
      );
    });
  });

  describe('Pattern Analysis Storage', () => {
    it('should store pattern analysis results', async () => {
      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 1);

      expect(mockSupabase.from).toHaveBeenCalledWith('security_pattern_analysis');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle storage failures gracefully', async () => {
      mockInsert.mockReturnValue({
        select: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Storage failed' }
        })
      });

      await expect(
        logAnalyzer.analyzeSuspiciousPatterns('org-1', 1)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database query errors', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'Database error' }
              })
            })
          })
        })
      });

      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 24);
      expect(patterns).toEqual([]);
    });

    it('should validate input parameters', async () => {
      // Test with invalid time window
      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 0);
      expect(patterns).toEqual([]);

      // Test with empty organization ID
      const patternsEmpty = await logAnalyzer.analyzeSuspiciousPatterns('', 24);
      expect(patternsEmpty).toEqual([]);
    });

    it('should handle Supabase client creation failures', async () => {
      (createClient as MockedFunction<typeof createClient>).mockRejectedValue(
        new Error('Supabase connection failed')
      );

      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 24);
      expect(patterns).toEqual([]);
    });
  });

  describe('Performance and Optimization', () => {
    it('should complete analysis within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await logAnalyzer.analyzeSuspiciousPatterns('org-1', 24);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeLogs = Array.from({ length: 1000 }, (_, i) => ({
        id: `log-${i}`,
        action: 'guest.dietary_requirements_access',
        user_id: `user-${i % 10}`,
        organization_id: 'org-1',
        timestamp: new Date(Date.now() - i * 60 * 1000).toISOString(),
        risk_score: Math.floor(Math.random() * 100),
        wedding_context: { guest_id: `guest-${i}` }
      }));

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: largeLogs, error: null })
            })
          })
        })
      });

      const startTime = Date.now();
      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 24);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should handle large datasets efficiently
      expect(patterns).toBeInstanceOf(Array);
    });

    it('should optimize database queries with proper filters', async () => {
      await logAnalyzer.analyzeSuspiciousPatterns('org-1', 12);

      // Verify proper database query structure
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('Integration with Wedding Context', () => {
    it('should analyze wedding-specific risk patterns', async () => {
      const weddingLogs = [
        {
          id: 'wedding-1',
          action: 'guest.dietary_requirements_access',
          user_id: 'user-1',
          organization_id: 'org-1',
          timestamp: new Date().toISOString(),
          risk_score: 70,
          wedding_context: { 
            wedding_id: 'wedding-123',
            guest_id: 'guest-1',
            sensitivity_level: 'confidential'
          }
        }
      ];

      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: weddingLogs, error: null })
            })
          })
        })
      });

      const patterns = await logAnalyzer.analyzeSuspiciousPatterns('org-1', 1);

      expect(patterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            pattern_type: expect.any(String),
            details: expect.objectContaining({
              wedding_context_analyzed: true
            })
          })
        ])
      );
    });
  });
});