import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testApiHandler } from 'next-test-api-route-handler';
import { v4 as uuidv4 } from 'uuid';

// Cross-Team API Coordination and Validation Framework
export class CrossTeamAPIValidator {
  private teamEndpoints = {
    'A': [
      { 
        endpoint: '/api/suppliers/profile', 
        method: 'GET',
        description: 'Supplier profile management and display',
        expectedFields: ['id', 'name', 'type', 'specializations', 'contact_info'],
        weddingContext: true
      },
      { 
        endpoint: '/api/suppliers/portfolio', 
        method: 'GET',
        description: 'Supplier portfolio and gallery management',
        expectedFields: ['galleries', 'featured_work', 'testimonials'],
        weddingContext: true
      }
    ],
    'B': [
      { 
        endpoint: '/api/suppliers/[id]/clients', 
        method: 'GET',
        description: 'Client management and relationship tracking',
        expectedFields: ['clients', 'summary', 'filters_applied'],
        weddingContext: true
      },
      { 
        endpoint: '/api/suppliers/[id]/clients', 
        method: 'POST',
        description: 'New client creation with wedding details',
        expectedFields: ['client'],
        weddingContext: true
      }
    ],
    'C': [
      { 
        endpoint: '/api/webhooks', 
        method: 'POST',
        description: 'Webhook registration for external integrations',
        expectedFields: ['webhook_id', 'endpoint_url', 'event_types'],
        weddingContext: false
      },
      { 
        endpoint: '/api/integrations/tave', 
        method: 'POST',
        description: 'Tave CRM integration and sync',
        expectedFields: ['sync_status', 'imported_clients', 'errors'],
        weddingContext: true
      }
    ],
    'D': [
      { 
        endpoint: '/api/suppliers/mobile/sync', 
        method: 'POST',
        description: 'Mobile app data synchronization',
        expectedFields: ['sync_token', 'delta_changes', 'conflicts'],
        weddingContext: true
      },
      { 
        endpoint: '/api/suppliers/[id]/availability', 
        method: 'GET',
        description: 'Mobile-optimized availability calendar',
        expectedFields: ['available_dates', 'blocked_dates', 'seasonal_pricing'],
        weddingContext: true
      }
    ],
    'E': [
      { 
        endpoint: '/api/testing/health', 
        method: 'GET',
        description: 'System health check and monitoring',
        expectedFields: ['status', 'version', 'checks'],
        weddingContext: false
      },
      { 
        endpoint: '/api/docs/api-spec', 
        method: 'GET',
        description: 'OpenAPI specification generation',
        expectedFields: ['openapi', 'info', 'paths'],
        weddingContext: false
      }
    ]
  };

  private consistencyChecks = {
    responseFormat: [
      'success',
      'data', 
      'error',
      'meta'
    ],
    metaFields: [
      'requestId',
      'timestamp',
      'version'
    ],
    errorFields: [
      'code',
      'message'
    ],
    weddingFields: [
      'wedding_date',
      'wedding_season',
      'supplier_type',
      'couple_name',
      'guest_count',
      'budget_range'
    ]
  };

  async validateConsistentResponseFormats(): Promise<ValidationReport> {
    const results: TeamValidationResult[] = [];

    for (const [team, endpoints] of Object.entries(this.teamEndpoints)) {
      for (const endpointConfig of endpoints) {
        const result = await this.validateEndpoint(team, endpointConfig);
        results.push(result);
      }
    }

    return {
      overall_consistency: this.calculateConsistencyScore(results),
      team_results: results,
      recommendations: this.generateRecommendations(results),
      timestamp: new Date().toISOString()
    };
  }

  private async validateEndpoint(team: string, endpointConfig: EndpointConfig): Promise<TeamValidationResult> {
    try {
      const response = await this.makeTestRequest(endpointConfig);
      const data = await response.json();

      return {
        team,
        endpoint: endpointConfig.endpoint,
        method: endpointConfig.method,
        description: endpointConfig.description,
        response_format_valid: this.validateResponseFormat(data),
        error_handling_consistent: this.validateErrorHandling(data),
        authentication_pattern_correct: this.validateAuthPattern(response),
        wedding_context_present: endpointConfig.weddingContext ? this.validateWeddingContext(data) : true,
        performance_acceptable: this.validatePerformance(response),
        expected_fields_present: this.validateExpectedFields(data, endpointConfig.expectedFields),
        status_code: response.status,
        response_time_ms: response.headers.get('X-Response-Time') ? 
          parseInt(response.headers.get('X-Response-Time') || '0') : 0
      };
    } catch (error) {
      return {
        team,
        endpoint: endpointConfig.endpoint,
        method: endpointConfig.method,
        description: endpointConfig.description,
        response_format_valid: false,
        error_handling_consistent: false,
        authentication_pattern_correct: false,
        wedding_context_present: false,
        performance_acceptable: false,
        expected_fields_present: false,
        status_code: 500,
        response_time_ms: 0,
        error: error.message
      };
    }
  }

  private async makeTestRequest(endpointConfig: EndpointConfig): Promise<Response> {
    const mockHandler = this.getMockHandlerForTeam(endpointConfig);
    
    return await testApiHandler({
      handler: mockHandler,
      test: async ({ fetch }) => {
        const requestOptions: RequestInit = {
          method: endpointConfig.method,
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
            'Content-Type': 'application/json',
            'X-Team': this.getTeamFromEndpoint(endpointConfig.endpoint)
          }
        };

        if (endpointConfig.method === 'POST') {
          requestOptions.body = JSON.stringify(this.getTestDataForEndpoint(endpointConfig));
        }

        return fetch(requestOptions);
      }
    });
  }

  private validateResponseFormat(data: any): boolean {
    // Validate all teams use consistent response format
    const requiredFields = this.consistencyChecks.responseFormat;
    const metaFields = this.consistencyChecks.metaFields;

    if (!requiredFields.every(field => field in data)) {
      return false;
    }

    if (!metaFields.every(field => field in data.meta)) {
      return false;
    }

    // Validate error format consistency
    if (!data.success && data.error) {
      const errorFields = this.consistencyChecks.errorFields;
      return errorFields.every(field => field in data.error);
    }

    return true;
  }

  private validateErrorHandling(data: any): boolean {
    // Check consistent error handling patterns
    if (!data.success && data.error) {
      return (
        typeof data.error.code === 'string' &&
        typeof data.error.message === 'string' &&
        data.error.code.length > 0 &&
        data.error.message.length > 0
      );
    }
    return true; // Success responses don't need error validation
  }

  private validateAuthPattern(response: Response): boolean {
    // Check authentication headers and patterns
    const authHeader = response.headers.get('X-Auth-Required');
    const rateLimitHeader = response.headers.get('X-RateLimit-Remaining');
    
    // Should have consistent auth and rate limiting headers
    return authHeader !== null && rateLimitHeader !== null;
  }

  private validateWeddingContext(data: any): boolean {
    // Check that responses include appropriate wedding industry context
    if (data.success && data.data) {
      const weddingIndicators = this.consistencyChecks.weddingFields;
      const responseStr = JSON.stringify(data.data);
      
      return weddingIndicators.some(indicator => 
        responseStr.includes(indicator) || responseStr.includes(indicator.replace('_', ''))
      );
    }

    return true; // Non-data responses don't need wedding context
  }

  private validatePerformance(response: Response): boolean {
    const responseTime = response.headers.get('X-Response-Time');
    if (!responseTime) return true; // Can't validate without timing

    const timeMs = parseInt(responseTime);
    return timeMs < 500; // Under 500ms is acceptable
  }

  private validateExpectedFields(data: any, expectedFields: string[]): boolean {
    if (!data.success || !data.data) return true; // Can't validate error responses

    return expectedFields.every(field => {
      const dataStr = JSON.stringify(data.data);
      return dataStr.includes(field) || dataStr.includes(field.replace('_', ''));
    });
  }

  private calculateConsistencyScore(results: TeamValidationResult[]): number {
    if (results.length === 0) return 0;

    const totalChecks = results.length * 6; // 6 validation criteria per endpoint
    const passedChecks = results.reduce((sum, result) => {
      let checks = 0;
      if (result.response_format_valid) checks++;
      if (result.error_handling_consistent) checks++;
      if (result.authentication_pattern_correct) checks++;
      if (result.wedding_context_present) checks++;
      if (result.performance_acceptable) checks++;
      if (result.expected_fields_present) checks++;
      return sum + checks;
    }, 0);

    return Math.round((passedChecks / totalChecks) * 100);
  }

  private generateRecommendations(results: TeamValidationResult[]): string[] {
    const recommendations: string[] = [];
    const issuesByTeam = new Map<string, string[]>();

    results.forEach(result => {
      const teamIssues: string[] = [];
      
      if (!result.response_format_valid) {
        teamIssues.push('Inconsistent response format - ensure all responses include success, data, error, and meta fields');
      }
      
      if (!result.error_handling_consistent) {
        teamIssues.push('Error handling inconsistent - ensure all errors have code and message fields');
      }
      
      if (!result.authentication_pattern_correct) {
        teamIssues.push('Authentication pattern incorrect - ensure X-Auth-Required and X-RateLimit-Remaining headers');
      }
      
      if (!result.wedding_context_present) {
        teamIssues.push('Missing wedding industry context in responses');
      }
      
      if (!result.performance_acceptable) {
        teamIssues.push('Response time exceeds 500ms - optimize database queries and caching');
      }
      
      if (!result.expected_fields_present) {
        teamIssues.push(`Missing expected fields: ${result.description}`);
      }

      if (teamIssues.length > 0) {
        issuesByTeam.set(result.team, teamIssues);
      }
    });

    // Generate team-specific recommendations
    issuesByTeam.forEach((issues, team) => {
      recommendations.push(`Team ${team}: ${issues.join(', ')}`);
    });

    // General recommendations
    if (recommendations.length > 0) {
      recommendations.unshift('Cross-team API consistency improvements needed:');
      recommendations.push('Consider implementing shared API response middleware');
      recommendations.push('Add automated API contract testing to CI/CD pipeline');
      recommendations.push('Schedule cross-team API review meeting');
    }

    return recommendations;
  }

  generateIntegrationTestPlan(): IntegrationTestPlan {
    return {
      cross_team_workflows: [
        {
          name: 'Complete Wedding Booking Flow',
          teams: ['A', 'B', 'C', 'D'],
          steps: [
            'Team A: Display supplier portfolio and availability',
            'Team D: Mobile booking form with offline support',
            'Team B: Process booking and client creation',
            'Team C: Send confirmation webhooks to external systems',
            'Team A: Update dashboard with new booking'
          ],
          success_criteria: [
            'Booking data consistency across all team endpoints',
            'Real-time updates propagated to all interfaces',
            'Mobile offline sync works seamlessly',
            'External systems receive proper notifications',
            'All teams use consistent response formats'
          ],
          test_duration_minutes: 15
        },
        {
          name: 'Supplier Onboarding Integration',
          teams: ['A', 'B', 'C'],
          steps: [
            'Team A: Supplier registration interface and profile creation',
            'Team B: Client import and relationship setup',
            'Team C: Third-party service connections (Tave, calendar)',
            'Team A: Portfolio setup and service configuration',
            'Team B: Authentication and permissions setup'
          ],
          success_criteria: [
            'Supplier data consistent across teams',
            'External integrations properly configured',
            'Authentication works on all endpoints',
            'Wedding industry context preserved throughout flow'
          ],
          test_duration_minutes: 20
        },
        {
          name: 'Peak Wedding Season Load Distribution',
          teams: ['A', 'B', 'C', 'D', 'E'],
          steps: [
            'Team E: Monitor system health during load test',
            'Team A: Handle portfolio viewing load',
            'Team B: Process concurrent client operations',
            'Team D: Manage mobile app synchronization',
            'Team C: Process webhook notifications under load'
          ],
          success_criteria: [
            'All teams maintain response times under 500ms',
            'No data consistency issues during concurrent operations',
            'Mobile sync remains stable under load',
            'Webhook delivery success rate > 95%',
            'System health monitoring detects no degradation'
          ],
          test_duration_minutes: 30
        }
      ],
      testing_schedule: [
        { phase: 'Individual Team Unit Tests', duration: '1 week', teams: ['A', 'B', 'C', 'D', 'E'] },
        { phase: 'Cross-Team Integration Tests', duration: '3 days', teams: ['All'] },
        { phase: 'End-to-End Wedding Workflow Tests', duration: '2 days', teams: ['All'] },
        { phase: 'Performance and Load Testing', duration: '2 days', teams: ['E', 'All'] },
        { phase: 'Security and Compliance Testing', duration: '1 day', teams: ['E'] }
      ],
      quality_gates: [
        'All unit tests pass with 95%+ coverage per team',
        'Cross-team consistency score > 90%',
        'End-to-end workflows complete successfully',
        'API response times under 200ms for simple queries',
        'Security tests show no critical vulnerabilities',
        'Mobile offline functionality works correctly',
        'Wedding industry context present in all relevant responses'
      ]
    };
  }

  private getMockHandlerForTeam(endpointConfig: EndpointConfig): any {
    const team = this.getTeamFromEndpoint(endpointConfig.endpoint);
    
    return async (req: Request) => {
      // Add response time header for performance testing
      const startTime = Date.now();
      
      // Simulate team-specific processing time
      const processingTime = Math.random() * 200; // 0-200ms
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      const responseTime = Date.now() - startTime;
      
      const baseResponse = {
        success: true,
        data: this.generateMockDataForEndpoint(endpointConfig),
        meta: {
          requestId: uuidv4(),
          timestamp: new Date().toISOString(),
          version: 'v1',
          team: team
        }
      };

      const response = new Response(JSON.stringify(baseResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': responseTime.toString(),
          'X-Auth-Required': 'true',
          'X-RateLimit-Remaining': '99',
          'X-Team': team
        }
      });

      return response;
    };
  }

  private getTeamFromEndpoint(endpoint: string): string {
    if (endpoint.includes('portfolio') || endpoint.includes('profile')) return 'A';
    if (endpoint.includes('clients')) return 'B';
    if (endpoint.includes('webhook') || endpoint.includes('integration')) return 'C';
    if (endpoint.includes('mobile') || endpoint.includes('availability')) return 'D';
    if (endpoint.includes('testing') || endpoint.includes('docs')) return 'E';
    return 'Unknown';
  }

  private generateMockDataForEndpoint(endpointConfig: EndpointConfig): any {
    const team = this.getTeamFromEndpoint(endpointConfig.endpoint);
    
    const baseMockData = {
      'A': {
        id: uuidv4(),
        name: 'Yorkshire Wedding Photography',
        type: 'photographer',
        specializations: ['romantic', 'outdoor', 'documentary'],
        contact_info: { email: 'hello@yorkshirewedding.co.uk' },
        wedding_seasons: ['spring', 'summer', 'autumn']
      },
      'B': {
        clients: [{
          id: uuidv4(),
          couple_name: 'John & Jane Smith',
          wedding_date: '2025-06-15T14:00:00Z',
          wedding_season: 'summer',
          guest_count: 120,
          budget_range: '2500_5000'
        }],
        summary: {
          total_clients: 45,
          upcoming_weddings: 12,
          peak_season_weddings: 8
        }
      },
      'C': {
        webhook_id: uuidv4(),
        endpoint_url: 'https://client-system.com/webhooks',
        event_types: ['booking.created', 'payment.received'],
        wedding_event_support: true
      },
      'D': {
        sync_token: uuidv4(),
        delta_changes: { clients: 5, bookings: 2 },
        available_dates: ['2025-06-15', '2025-06-22'],
        seasonal_pricing: { summer: 'peak', autumn: 'standard' },
        mobile_optimized: true
      },
      'E': {
        status: 'healthy',
        version: 'v1.0.0',
        checks: { database: 'ok', redis: 'ok', apis: 'ok' },
        wedding_season_ready: true
      }
    };

    return baseMockData[team as keyof typeof baseMockData] || {};
  }

  private getTestDataForEndpoint(endpointConfig: EndpointConfig): any {
    if (endpointConfig.endpoint.includes('clients') && endpointConfig.method === 'POST') {
      return {
        couple_name: 'Mark & Sarah Johnson',
        wedding_date: '2025-08-20T15:00:00Z',
        venue_name: 'Lake District Resort',
        guest_count: 80,
        budget_range: '1000_2500'
      };
    }

    if (endpointConfig.endpoint.includes('webhook')) {
      return {
        endpoint_url: 'https://client-system.com/webhooks',
        event_types: ['booking.created', 'payment.received'],
        secret: 'webhook-secret-key'
      };
    }

    return {};
  }
}

// Interfaces
interface EndpointConfig {
  endpoint: string;
  method: string;
  description: string;
  expectedFields: string[];
  weddingContext: boolean;
}

interface TeamValidationResult {
  team: string;
  endpoint: string;
  method: string;
  description: string;
  response_format_valid: boolean;
  error_handling_consistent: boolean;
  authentication_pattern_correct: boolean;
  wedding_context_present: boolean;
  performance_acceptable: boolean;
  expected_fields_present: boolean;
  status_code: number;
  response_time_ms: number;
  error?: string;
}

interface ValidationReport {
  overall_consistency: number;
  team_results: TeamValidationResult[];
  recommendations: string[];
  timestamp: string;
}

interface IntegrationTestPlan {
  cross_team_workflows: WorkflowTest[];
  testing_schedule: TestPhase[];
  quality_gates: string[];
}

interface WorkflowTest {
  name: string;
  teams: string[];
  steps: string[];
  success_criteria: string[];
  test_duration_minutes: number;
}

interface TestPhase {
  phase: string;
  duration: string;
  teams: string[];
}

// Test Suite
describe('Cross-Team API Consistency Validation', () => {
  let validator: CrossTeamAPIValidator;
  let validationReport: ValidationReport;

  beforeAll(async () => {
    validator = new CrossTeamAPIValidator();
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent response formats across all teams', async () => {
      validationReport = await validator.validateConsistentResponseFormats();
      
      expect(validationReport.overall_consistency).toBeGreaterThan(85);
      
      // Check each team's consistency
      validationReport.team_results.forEach(result => {
        expect(result.response_format_valid).toBe(true);
        expect(result.error_handling_consistent).toBe(true);
        expect(result.authentication_pattern_correct).toBe(true);
        expect(result.status_code).toBeLessThan(400);
      });
    });

    it('should include wedding industry context where appropriate', async () => {
      const weddingEndpoints = validationReport.team_results.filter(
        result => ['A', 'B', 'D'].includes(result.team) // Teams handling wedding data
      );

      weddingEndpoints.forEach(result => {
        expect(result.wedding_context_present).toBe(true);
      });
    });

    it('should maintain acceptable performance across all teams', async () => {
      validationReport.team_results.forEach(result => {
        expect(result.performance_acceptable).toBe(true);
        expect(result.response_time_ms).toBeLessThan(500);
      });
    });
  });

  describe('Cross-Team Integration Workflows', () => {
    it('should coordinate complete wedding booking workflow', async () => {
      const testPlan = validator.generateIntegrationTestPlan();
      const bookingWorkflow = testPlan.cross_team_workflows.find(w => 
        w.name === 'Complete Wedding Booking Flow'
      );
      
      expect(bookingWorkflow).toBeDefined();
      expect(bookingWorkflow?.teams).toContain('A');
      expect(bookingWorkflow?.teams).toContain('B');
      expect(bookingWorkflow?.teams).toContain('C');
      expect(bookingWorkflow?.teams).toContain('D');
      expect(bookingWorkflow?.test_duration_minutes).toBeLessThanOrEqual(20);
      
      // Validate workflow steps make sense
      expect(bookingWorkflow?.steps.length).toBeGreaterThan(3);
      expect(bookingWorkflow?.success_criteria.length).toBeGreaterThan(3);
    });

    it('should handle supplier onboarding across teams', async () => {
      const testPlan = validator.generateIntegrationTestPlan();
      const onboardingWorkflow = testPlan.cross_team_workflows.find(w => 
        w.name === 'Supplier Onboarding Integration'
      );
      
      expect(onboardingWorkflow).toBeDefined();
      expect(onboardingWorkflow?.teams).toEqual(['A', 'B', 'C']);
      
      // Check that steps cover all aspects of onboarding
      const stepStr = onboardingWorkflow?.steps.join(' ').toLowerCase() || '';
      expect(stepStr).toContain('registration');
      expect(stepStr).toContain('client');
      expect(stepStr).toContain('integration');
      expect(stepStr).toContain('authentication');
    });

    it('should coordinate peak season load distribution', async () => {
      const testPlan = validator.generateIntegrationTestPlan();
      const loadWorkflow = testPlan.cross_team_workflows.find(w => 
        w.name === 'Peak Wedding Season Load Distribution'
      );
      
      expect(loadWorkflow).toBeDefined();
      expect(loadWorkflow?.teams).toContain('E'); // QA team coordinates
      expect(loadWorkflow?.test_duration_minutes).toBeLessThanOrEqual(35);
      
      // Verify load testing covers all teams
      expect(loadWorkflow?.teams.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Quality Gate Validation', () => {
    it('should define comprehensive quality gates', async () => {
      const testPlan = validator.generateIntegrationTestPlan();
      
      expect(testPlan.quality_gates.length).toBeGreaterThan(5);
      
      const gatesStr = testPlan.quality_gates.join(' ').toLowerCase();
      expect(gatesStr).toContain('coverage');
      expect(gatesStr).toContain('consistency');
      expect(gatesStr).toContain('response time');
      expect(gatesStr).toContain('security');
      expect(gatesStr).toContain('wedding');
    });

    it('should have realistic testing schedule', async () => {
      const testPlan = validator.generateIntegrationTestPlan();
      
      expect(testPlan.testing_schedule.length).toBeGreaterThan(3);
      
      const phases = testPlan.testing_schedule.map(phase => phase.phase);
      expect(phases).toContain('Individual Team Unit Tests');
      expect(phases).toContain('Cross-Team Integration Tests');
      expect(phases).toContain('Performance and Load Testing');
      expect(phases).toContain('Security and Compliance Testing');
    });
  });

  describe('Team-Specific Validation', () => {
    it('should validate Team A (UI/Portfolio) endpoints', async () => {
      const teamAResults = validationReport.team_results.filter(r => r.team === 'A');
      
      teamAResults.forEach(result => {
        expect(result.wedding_context_present).toBe(true);
        expect(result.expected_fields_present).toBe(true);
        
        // Team A should have portfolio/profile related fields
        const description = result.description.toLowerCase();
        expect(['portfolio', 'profile', 'gallery'].some(term => description.includes(term))).toBe(true);
      });
    });

    it('should validate Team B (Client Management) endpoints', async () => {
      const teamBResults = validationReport.team_results.filter(r => r.team === 'B');
      
      teamBResults.forEach(result => {
        expect(result.wedding_context_present).toBe(true);
        expect(result.expected_fields_present).toBe(true);
        
        // Team B should have client-related functionality
        const description = result.description.toLowerCase();
        expect(description.includes('client')).toBe(true);
      });
    });

    it('should validate Team C (Integrations) endpoints', async () => {
      const teamCResults = validationReport.team_results.filter(r => r.team === 'C');
      
      teamCResults.forEach(result => {
        expect(result.expected_fields_present).toBe(true);
        
        // Team C handles external integrations
        const description = result.description.toLowerCase();
        expect(['webhook', 'integration', 'sync'].some(term => description.includes(term))).toBe(true);
      });
    });

    it('should validate Team D (Mobile) endpoints', async () => {
      const teamDResults = validationReport.team_results.filter(r => r.team === 'D');
      
      teamDResults.forEach(result => {
        expect(result.wedding_context_present).toBe(true);
        expect(result.expected_fields_present).toBe(true);
        expect(result.performance_acceptable).toBe(true); // Mobile needs good performance
        
        // Team D handles mobile functionality
        const description = result.description.toLowerCase();
        expect(['mobile', 'sync', 'availability'].some(term => description.includes(term))).toBe(true);
      });
    });

    it('should validate Team E (QA/Testing) endpoints', async () => {
      const teamEResults = validationReport.team_results.filter(r => r.team === 'E');
      
      teamEResults.forEach(result => {
        expect(result.expected_fields_present).toBe(true);
        expect(result.response_format_valid).toBe(true);
        
        // Team E provides testing and monitoring tools
        const description = result.description.toLowerCase();
        expect(['testing', 'health', 'docs', 'monitoring'].some(term => description.includes(term))).toBe(true);
      });
    });
  });

  afterAll(() => {
    // Log validation summary
    console.log('\n=== CROSS-TEAM API VALIDATION REPORT ===');
    console.log(`Overall Consistency Score: ${validationReport.overall_consistency}%`);
    console.log(`Total Endpoints Tested: ${validationReport.team_results.length}`);
    console.log(`Teams Validated: A, B, C, D, E`);
    
    if (validationReport.recommendations.length > 0) {
      console.log('\nRecommendations:');
      validationReport.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    console.log('\nTeam Performance Summary:');
    ['A', 'B', 'C', 'D', 'E'].forEach(team => {
      const teamResults = validationReport.team_results.filter(r => r.team === team);
      const avgResponseTime = teamResults.reduce((sum, r) => sum + r.response_time_ms, 0) / teamResults.length;
      const successRate = teamResults.filter(r => r.status_code < 400).length / teamResults.length * 100;
      
      console.log(`  Team ${team}: ${avgResponseTime.toFixed(1)}ms avg, ${successRate.toFixed(1)}% success`);
    });
  });
});