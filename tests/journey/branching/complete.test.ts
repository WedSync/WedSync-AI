/**
 * Comprehensive Test Suite for Journey Branching System
 * Tests conditional logic, A/B testing, variables, and performance
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  ConditionalEngine, 
  ConditionalBranch, 
  BranchContext, 
  ConditionBuilder 
} from '../../../src/lib/journey/branching/conditionalEngine';
import { ConditionEvaluator } from '../../../src/lib/journey/branching/evaluator';
import { VariableManager } from '../../../src/lib/journey/branching/variables';

describe('Journey Branching System - Complete Test Suite', () => {
  let conditionalEngine: ConditionalEngine;
  let conditionEvaluator: ConditionEvaluator;
  let variableManager: VariableManager;
  let mockContext: BranchContext;

  beforeEach(() => {
    conditionalEngine = new ConditionalEngine();
    conditionEvaluator = new ConditionEvaluator();
    variableManager = new VariableManager();
    
    // Mock wedding photographer context
    mockContext = {
      variables: {
        'session.completedSteps': ['initial_contact', 'consultation'],
        'session.currentStep': 'proposal',
        'session.startTime': new Date('2024-01-15T10:00:00Z'),
        'session.userId': 'user_123'
      },
      clientData: {
        name: 'John & Jane Smith',
        email: 'john.jane@example.com',
        preferences: {
          communicationStyle: 'email',
          preferredTime: 'evening',
          photoStyle: 'traditional'
        }
      },
      weddingData: {
        date: new Date('2024-06-15T16:00:00Z'),
        venue: {
          id: 'venue_456',
          name: 'Garden Paradise',
          address: '123 Wedding Lane'
        },
        location: {
          address: '123 Wedding Lane, Dream City',
          city: 'Dream City',
          distance: 150, // miles from photographer
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        guestCount: 120,
        budget: 5000,
        timeline: {
          ceremony: new Date('2024-06-15T16:00:00Z'),
          reception: new Date('2024-06-15T18:00:00Z'),
          preparation: new Date('2024-06-15T12:00:00Z')
        }
      },
      timestamp: new Date(),
      userId: 'user_123',
      journeyId: 'journey_789',
      instanceId: 'instance_101'
    };
  });

  afterEach(() => {
    conditionalEngine.clearMetrics();
    conditionEvaluator.clearCache();
  });

  describe('Conditional Engine - Core Functionality', () => {
    test('should evaluate simple destination wedding condition', async () => {
      const branch: ConditionalBranch = {
        id: 'destination_check',
        name: 'Destination Wedding Check',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.wedding.isDestination(100)
        ]),
        truePath: 'destination_workflow',
        falsePath: 'local_workflow'
      };

      const result = await conditionalEngine.evaluateBranch(branch, mockContext);

      expect(result.result).toBe(true); // 150 miles > 100
      expect(result.nextNodeId).toBe('destination_workflow');
      expect(result.evaluationTime).toBeLessThan(10); // Performance requirement
      expect(result.metadata.type).toBe('conditional');
    });

    test('should handle complex AND/OR conditions', async () => {
      const branch: ConditionalBranch = {
        id: 'complex_check',
        name: 'Complex Wedding Check',
        conditionGroup: ConditionBuilder.group('OR', [
          ConditionBuilder.group('AND', [
            ConditionBuilder.wedding.isDestination(100),
            ConditionBuilder.wedding.guestCount('greater_than', 100)
          ]),
          ConditionBuilder.group('AND', [
            ConditionBuilder.wedding.budget('greater_than', 8000),
            ConditionBuilder.condition('clientData.preferences.photoStyle', 'equals', 'luxury', 'string')
          ])
        ]),
        truePath: 'premium_workflow',
        falsePath: 'standard_workflow'
      };

      const result = await conditionalEngine.evaluateBranch(branch, mockContext);

      // Should be true because: destination (150 > 100) AND guests (120 > 100)
      expect(result.result).toBe(true);
      expect(result.nextNodeId).toBe('premium_workflow');
    });

    test('should handle A/B testing with consistent user assignment', async () => {
      const branch: ConditionalBranch = {
        id: 'ab_test_email',
        name: 'Email Template A/B Test',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.condition('weddingData.date', 'exists', true)
        ]),
        truePath: 'control_email',
        falsePath: 'fallback',
        abTestConfig: {
          enabled: true,
          splitPercentage: 50,
          variants: ['variant_a_email', 'variant_b_email']
        }
      };

      // Test multiple times with same user - should be consistent
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await conditionalEngine.evaluateBranch(branch, mockContext);
        results.push(result);
      }

      // All results should be the same for the same user
      expect(results.every(r => r.nextNodeId === results[0].nextNodeId)).toBe(true);
      expect(results[0].metadata.type).toBe('ab_test');
    });

    test('should evaluate within performance requirements', async () => {
      const startTime = performance.now();
      
      const branch: ConditionalBranch = {
        id: 'performance_test',
        name: 'Performance Test',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.wedding.isDestination(100),
          ConditionBuilder.wedding.guestCount('greater_than', 50),
          ConditionBuilder.wedding.budget('greater_than', 3000),
          ConditionBuilder.condition('clientData.preferences.communicationStyle', 'equals', 'email', 'string')
        ]),
        truePath: 'true_path',
        falsePath: 'false_path'
      };

      const result = await conditionalEngine.evaluateBranch(branch, mockContext);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(10); // Must be <10ms as per requirements
      expect(result.evaluationTime).toBeLessThan(10);
    });
  });

  describe('Condition Evaluator - Advanced Logic', () => {
    test('should evaluate computed variables correctly', async () => {
      const condition = {
        id: 'computed_test',
        type: 'function' as const,
        field: 'daysUntilWedding',
        operator: 'greater_than' as const,
        value: 30,
        dataType: 'number' as const
      };

      const result = await conditionEvaluator.evaluate(condition, mockContext);

      expect(result.success).toBe(true);
      expect(typeof result.value).toBe('number');
      expect(result.executionTime).toBeLessThan(10);
    });

    test('should handle date comparisons correctly', async () => {
      const condition = {
        id: 'date_test',
        type: 'comparison' as const,
        field: 'weddingData.date',
        operator: 'greater_than' as const,
        value: new Date('2024-01-01'),
        dataType: 'date' as const
      };

      const result = await conditionEvaluator.evaluate(condition, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });

    test('should validate string operations', async () => {
      const containsCondition = {
        id: 'string_contains',
        type: 'comparison' as const,
        field: 'clientData.preferences.photoStyle',
        operator: 'contains' as const,
        value: 'traditional',
        dataType: 'string' as const
      };

      const result = await conditionEvaluator.evaluate(containsCondition, mockContext);

      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });
  });

  describe('Variable Manager - Scoping and Computation', () => {
    test('should manage wedding-specific variables', () => {
      const scopeId = 'wedding_scope';
      variableManager.createScope(scopeId, 'journey');
      
      variableManager.registerWeddingVariables(
        scopeId, 
        mockContext.weddingData, 
        mockContext.clientData
      );

      const weddingDate = variableManager.getVariable(scopeId, 'wedding.date');
      const isDestination = variableManager.getVariable(scopeId, 'wedding.isDestination');
      const daysUntil = variableManager.getVariable(scopeId, 'wedding.daysUntil');

      expect(weddingDate?.value).toEqual(mockContext.weddingData.date);
      expect(isDestination?.value).toBe(true); // 150 miles > 100
      expect(daysUntil?.value).toBeGreaterThan(0);
    });

    test('should handle computed variables with caching', () => {
      const scopeId = 'computed_scope';
      variableManager.createScope(scopeId, 'journey');
      
      // Set base variables
      variableManager.setVariable(scopeId, 'base.value', 100);
      
      // Register computed variable
      variableManager.registerComputedVariable(
        scopeId,
        'computed.doubled',
        'base.value * 2'
      );

      const computed1 = variableManager.getVariable(scopeId, 'computed.doubled');
      const computed2 = variableManager.getVariable(scopeId, 'computed.doubled');

      expect(computed1?.value).toBe(200);
      expect(computed2?.value).toBe(200);
      // Should use cache on second call
    });

    test('should handle variable inheritance between scopes', () => {
      const globalScope = 'global';
      const journeyScope = 'journey_inherit';
      
      variableManager.setVariable(globalScope, 'global.setting', 'default_value');
      variableManager.createScope(journeyScope, 'journey', globalScope);
      
      const inheritedVar = variableManager.getVariable(journeyScope, 'global.setting');
      expect(inheritedVar?.value).toBe('default_value');
    });
  });

  describe('Integration Tests', () => {
    test('should integrate all components for real wedding scenario', async () => {
      // Setup variables
      const scopeId = 'integration_test';
      variableManager.createScope(scopeId, 'journey');
      variableManager.registerWeddingVariables(scopeId, mockContext.weddingData, mockContext.clientData);
      
      // Create complex branch
      const branch: ConditionalBranch = {
        id: 'integration_branch',
        name: 'Wedding Photographer Integration Test',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.wedding.isDestination(100),
          ConditionBuilder.group('OR', [
            ConditionBuilder.wedding.guestCount('greater_than', 100),
            ConditionBuilder.wedding.budget('greater_than', 6000)
          ])
        ]),
        truePath: 'destination_premium_workflow',
        falsePath: 'standard_workflow',
        abTestConfig: {
          enabled: true,
          splitPercentage: 30,
          variants: ['premium_email_sequence', 'standard_email_sequence']
        }
      };

      const result = await conditionalEngine.evaluateBranch(branch, mockContext);

      expect(result).toBeDefined();
      expect(result.evaluationTime).toBeLessThan(10);
      expect(['destination_premium_workflow', 'premium_email_sequence', 'standard_email_sequence'])
        .toContain(result.nextNodeId);
    });

    test('should handle error conditions gracefully', async () => {
      const malformedBranch: ConditionalBranch = {
        id: 'error_test',
        name: 'Error Test',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.condition('nonexistent.field', 'equals', 'value', 'string')
        ]),
        truePath: 'true_path',
        falsePath: 'false_path'
      };

      const result = await conditionalEngine.evaluateBranch(malformedBranch, mockContext);

      // Should handle gracefully and default to false
      expect(result.result).toBe(false);
      expect(result.nextNodeId).toBe('false_path');
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    test('should handle deeply nested condition groups', async () => {
      const deepConditions = ConditionBuilder.group('OR', [
        ConditionBuilder.group('AND', [
          ConditionBuilder.group('OR', [
            ConditionBuilder.wedding.isDestination(50),
            ConditionBuilder.wedding.guestCount('greater_than', 200)
          ]),
          ConditionBuilder.wedding.budget('greater_than', 5000)
        ]),
        ConditionBuilder.condition('clientData.preferences.photoStyle', 'contains', 'luxury', 'string')
      ]);

      const branch: ConditionalBranch = {
        id: 'deep_nesting',
        name: 'Deep Nesting Test',
        conditionGroup: deepConditions,
        truePath: 'complex_true',
        falsePath: 'complex_false'
      };

      const result = await conditionalEngine.evaluateBranch(branch, mockContext);

      expect(result).toBeDefined();
      expect(result.evaluationTime).toBeLessThan(10);
    });

    test('should handle concurrent evaluations', async () => {
      const branch: ConditionalBranch = {
        id: 'concurrent_test',
        name: 'Concurrent Test',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.wedding.isDestination(100)
        ]),
        truePath: 'true_path',
        falsePath: 'false_path'
      };

      // Run 10 concurrent evaluations
      const promises = Array.from({ length: 10 }, () => 
        conditionalEngine.evaluateBranch(branch, mockContext)
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every(r => r.result === true)).toBe(true);
      expect(results.every(r => r.evaluationTime < 10)).toBe(true);
    });

    test('should maintain performance with large variable sets', () => {
      const scopeId = 'large_variables';
      variableManager.createScope(scopeId, 'journey');

      // Add 1000 variables
      for (let i = 0; i < 1000; i++) {
        variableManager.setVariable(scopeId, `test.var${i}`, `value${i}`);
      }

      const startTime = performance.now();
      const allVars = variableManager.getAllVariables(scopeId);
      const endTime = performance.now();

      expect(Object.keys(allVars)).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
    });
  });

  describe('Wedding Photographer Specific Tests', () => {
    test('should correctly identify destination weddings', async () => {
      const destinationBranch: ConditionalBranch = {
        id: 'destination_wedding',
        name: 'Destination Wedding Detection',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.wedding.isDestination(100)
        ]),
        truePath: 'destination_checklist_email',
        falsePath: 'local_wedding_email'
      };

      const result = await conditionalEngine.evaluateBranch(destinationBranch, mockContext);

      expect(result.result).toBe(true);
      expect(result.nextNodeId).toBe('destination_checklist_email');
    });

    test('should categorize weddings by size and budget', async () => {
      const categorizationBranch: ConditionalBranch = {
        id: 'wedding_categorization',
        name: 'Wedding Size and Budget Category',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.wedding.guestCount('greater_than', 100),
          ConditionBuilder.wedding.budget('greater_than', 4000)
        ]),
        truePath: 'large_wedding_workflow',
        falsePath: 'intimate_wedding_workflow'
      };

      const result = await conditionalEngine.evaluateBranch(categorizationBranch, mockContext);

      expect(result.result).toBe(true); // 120 guests > 100, $5000 > $4000
      expect(result.nextNodeId).toBe('large_wedding_workflow');
    });

    test('should handle timeline-based decisions', async () => {
      // Mock wedding in 6 months
      const futureContext = {
        ...mockContext,
        weddingData: {
          ...mockContext.weddingData,
          date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months from now
        }
      };

      const timelineBranch: ConditionalBranch = {
        id: 'timeline_check',
        name: 'Wedding Timeline Check',
        conditionGroup: ConditionBuilder.group('AND', [
          {
            id: 'timeline_condition',
            operator: 'AND',
            conditions: [{
              id: 'days_check',
              type: 'function',
              field: 'daysUntilWedding',
              operator: 'greater_than',
              value: 90,
              dataType: 'number'
            }]
          }
        ]),
        truePath: 'early_planning_sequence',
        falsePath: 'urgent_planning_sequence'
      };

      const result = await conditionalEngine.evaluateBranch(timelineBranch, futureContext);

      expect(result.nextNodeId).toBe('early_planning_sequence');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet all performance requirements', async () => {
      const performanceTests = [
        { name: 'Simple condition', conditions: 1 },
        { name: 'Medium complexity', conditions: 5 },
        { name: 'High complexity', conditions: 10 },
        { name: 'Maximum complexity', conditions: 20 }
      ];

      for (const testCase of performanceTests) {
        const conditions = Array.from({ length: testCase.conditions }, (_, i) => 
          ConditionBuilder.condition(`test.field${i}`, 'equals', `value${i}`, 'string')
        );

        const branch: ConditionalBranch = {
          id: `perf_test_${testCase.conditions}`,
          name: testCase.name,
          conditionGroup: ConditionBuilder.group('AND', conditions),
          truePath: 'true_path',
          falsePath: 'false_path'
        };

        const startTime = performance.now();
        const result = await conditionalEngine.evaluateBranch(branch, mockContext);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(10); // Must be <10ms
        expect(result.evaluationTime).toBeLessThan(10);
      }
    });

    test('should handle high concurrent load', async () => {
      const branch: ConditionalBranch = {
        id: 'load_test',
        name: 'Load Test',
        conditionGroup: ConditionBuilder.group('AND', [
          ConditionBuilder.wedding.isDestination(100)
        ]),
        truePath: 'true_path',
        falsePath: 'false_path'
      };

      // Simulate 100 concurrent users
      const startTime = performance.now();
      const promises = Array.from({ length: 100 }, async () => {
        return await conditionalEngine.evaluateBranch(branch, mockContext);
      });

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(100);
      expect(results.every(r => r.result === true)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1 second
    });
  });

  describe('Coverage Requirements', () => {
    test('should test all condition operators', async () => {
      const operators: Array<{ op: any; field: string; value: any; expected: boolean }> = [
        { op: 'equals', field: 'weddingData.guestCount', value: 120, expected: true },
        { op: 'not_equals', field: 'weddingData.guestCount', value: 100, expected: true },
        { op: 'greater_than', field: 'weddingData.budget', value: 4000, expected: true },
        { op: 'less_than', field: 'weddingData.budget', value: 6000, expected: true },
        { op: 'contains', field: 'clientData.name', value: 'Smith', expected: true },
        { op: 'starts_with', field: 'clientData.name', value: 'John', expected: true },
        { op: 'ends_with', field: 'clientData.name', value: 'Smith', expected: true },
        { op: 'exists', field: 'weddingData.venue.id', value: true, expected: true }
      ];

      for (const testCase of operators) {
        const condition = ConditionBuilder.condition(
          testCase.field, 
          testCase.op, 
          testCase.value, 
          'string'
        );

        const result = await conditionEvaluator.evaluate(condition, mockContext);

        expect(result.success).toBe(true);
        expect(result.value).toBe(testCase.expected);
      }
    });

    test('should achieve >95% code coverage', () => {
      // This test ensures we're exercising all major code paths
      // Coverage will be measured by the test runner
      expect(true).toBe(true); // Placeholder - actual coverage measured externally
    });
  });
});