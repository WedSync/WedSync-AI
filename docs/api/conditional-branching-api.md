# Conditional Branching API Documentation

## Overview

The Conditional Branching API provides powerful IF/THEN logic, A/B testing, and variable-based decision making for journey automation. This system is specifically designed for wedding photographers to automate complex workflows based on wedding characteristics, client preferences, and timeline requirements.

## Core Components

### ConditionalEngine

The main engine for evaluating conditional branches and determining journey paths.

#### `evaluateBranch(branch: ConditionalBranch, context: BranchContext): Promise<BranchResult>`

Evaluates a conditional branch and returns the next node to execute.

**Parameters:**
- `branch`: The conditional branch configuration
- `context`: Execution context with variables, client data, and wedding information

**Returns:**
```typescript
{
  result: boolean;           // Condition evaluation result
  nextNodeId: string;        // Next node to execute
  evaluationTime: number;    // Performance metric (ms)
  metadata: Record<string, any>; // Additional execution data
}
```

**Example:**
```typescript
const engine = new ConditionalEngine();

const branch: ConditionalBranch = {
  id: 'destination_check',
  name: 'Destination Wedding Check',
  conditionGroup: ConditionBuilder.group('AND', [
    ConditionBuilder.wedding.isDestination(100)
  ]),
  truePath: 'destination_workflow',
  falsePath: 'local_workflow'
};

const context: BranchContext = {
  variables: {},
  clientData: { name: 'John & Jane Smith' },
  weddingData: {
    location: { distance: 150 },
    guestCount: 120,
    budget: 5000
  },
  timestamp: new Date(),
  userId: 'user_123',
  journeyId: 'journey_789',
  instanceId: 'instance_101'
};

const result = await engine.evaluateBranch(branch, context);
// Result: { result: true, nextNodeId: 'destination_workflow', ... }
```

### ConditionBuilder

Utility class for building complex conditions with wedding-specific helpers.

#### Basic Conditions

```typescript
// Simple field comparison
ConditionBuilder.condition(field, operator, value, dataType)

// Wedding-specific helpers
ConditionBuilder.wedding.isDestination(distanceThreshold)
ConditionBuilder.wedding.isLocal(distanceThreshold) 
ConditionBuilder.wedding.guestCount(operator, count)
ConditionBuilder.wedding.budget(operator, amount)
ConditionBuilder.wedding.hasVenue()
```

#### Complex Logic

```typescript
// AND/OR groups
ConditionBuilder.group('AND', [condition1, condition2])
ConditionBuilder.group('OR', [condition1, condition2])

// Nested conditions
ConditionBuilder.group('OR', [
  ConditionBuilder.group('AND', [
    ConditionBuilder.wedding.isDestination(100),
    ConditionBuilder.wedding.guestCount('greater_than', 100)
  ]),
  ConditionBuilder.wedding.budget('greater_than', 8000)
])
```

### VariableManager

Manages dynamic variables with scoping and computed values.

#### `createScope(id: string, type: 'global' | 'journey' | 'instance', parentId?: string): VariableScope`

Creates a new variable scope with optional inheritance.

#### `setVariable(scopeId: string, name: string, value: any, options?: VariableOptions): void`

Sets a variable in a specific scope.

#### `getVariable(scopeId: string, name: string): Variable | undefined`

Retrieves a variable from the scope hierarchy.

#### `registerWeddingVariables(scopeId: string, weddingData: any, clientData: any): void`

Registers standard wedding photographer variables.

**Example:**
```typescript
const variableManager = new VariableManager();
const scopeId = 'wedding_session';

// Create journey scope
variableManager.createScope(scopeId, 'journey');

// Register wedding-specific variables
variableManager.registerWeddingVariables(scopeId, weddingData, clientData);

// Access computed variables
const daysUntil = variableManager.getVariable(scopeId, 'wedding.daysUntil');
const isDestination = variableManager.getVariable(scopeId, 'wedding.isDestination');
```

### BranchAnalytics

Comprehensive analytics for monitoring branch performance and A/B test results.

#### `recordExecution(execution: BranchExecution): void`

Records a branch execution for analytics.

#### `getBranchMetrics(branchId: string): BranchPerformanceMetrics | null`

Gets performance metrics for a specific branch.

#### `getABTestResults(branchId: string): ABTestResults | null`

Retrieves A/B test performance data.

**Example:**
```typescript
const analytics = new BranchAnalytics();

// Record execution
analytics.recordExecution({
  id: 'exec_123',
  branchId: 'destination_check',
  journeyId: 'journey_789',
  userId: 'user_123',
  executionTime: 5.2,
  result: true,
  pathTaken: 'destination_workflow',
  conditions: { total: 2, evaluated: 2, passed: 2 },
  timestamp: new Date()
});

// Get metrics
const metrics = analytics.getBranchMetrics('destination_check');
// Returns: performance stats, conversion rates, A/B test results
```

## Wedding Photographer Use Cases

### 1. Destination Wedding Detection

```typescript
const destinationBranch: ConditionalBranch = {
  id: 'destination_detection',
  name: 'Destination Wedding Detection',
  conditionGroup: ConditionBuilder.group('OR', [
    ConditionBuilder.wedding.isDestination(100), // >100 miles
    ConditionBuilder.condition('weddingData.venue.requiresTravel', 'equals', true)
  ]),
  truePath: 'destination_email_sequence',
  falsePath: 'local_email_sequence'
};
```

### 2. Premium Package Qualification

```typescript
const premiumQualification: ConditionalBranch = {
  id: 'premium_qualification',
  name: 'Premium Package Qualification',
  conditionGroup: ConditionBuilder.group('AND', [
    ConditionBuilder.group('OR', [
      ConditionBuilder.wedding.budget('greater_than', 8000),
      ConditionBuilder.wedding.guestCount('greater_than', 200)
    ]),
    ConditionBuilder.condition('clientData.preferences.photoStyle', 'contains', 'luxury')
  ]),
  truePath: 'premium_package_offer',
  falsePath: 'standard_package_offer'
};
```

### 3. Timeline-Based Communication

```typescript
const timelineBasedCommunication: ConditionalBranch = {
  id: 'timeline_communication',
  name: 'Timeline-Based Communication',
  conditionGroup: ConditionBuilder.group('AND', [
    {
      id: 'timeline_condition',
      operator: 'AND',
      conditions: [{
        id: 'days_until_wedding',
        type: 'function',
        field: 'daysUntilWedding',
        operator: 'less_than',
        value: 30,
        dataType: 'number'
      }]
    }
  ]),
  truePath: 'urgent_timeline_checklist',
  falsePath: 'standard_timeline_checklist'
};
```

### 4. A/B Test Email Templates

```typescript
const emailABTest: ConditionalBranch = {
  id: 'email_template_test',
  name: 'Email Template A/B Test',
  conditionGroup: ConditionBuilder.group('AND', [
    ConditionBuilder.condition('clientData.preferences.communicationStyle', 'equals', 'email')
  ]),
  truePath: 'control_email',
  falsePath: 'fallback_email',
  abTestConfig: {
    enabled: true,
    splitPercentage: 50,
    variants: ['formal_email_template', 'casual_email_template']
  }
};
```

## A/B Testing

### Configuration

A/B tests are configured within conditional branches:

```typescript
interface ABTestConfig {
  enabled: boolean;
  splitPercentage: number;    // 0-100, percentage to include in test
  variants: string[];         // Array of variant node IDs
}
```

### User Assignment

- Users are consistently assigned to the same variant based on their user ID
- Assignment uses a hash function for even distribution
- Test results are tracked automatically via BranchAnalytics

### Statistical Analysis

```typescript
const abResults = analytics.getABTestResults('email_template_test');
console.log('A/B Test Results:', {
  winner: abResults.winner,
  confidence: abResults.confidence,
  significance: abResults.significance,
  variants: abResults.variants
});
```

## Performance Requirements

### Execution Time

- **Target**: <10ms per condition evaluation
- **Monitoring**: Automatic performance tracking
- **Alerting**: Alerts when execution time exceeds threshold

### Memory Usage

- **Efficient**: Variable caching with TTL
- **Scalable**: Designed for high concurrent usage
- **Monitoring**: Real-time memory usage tracking

### Error Handling

- **Graceful**: Failed conditions default to false path
- **Logging**: Comprehensive error tracking
- **Recovery**: Automatic fallback mechanisms

## Integration Guide

### 1. Basic Setup

```typescript
import { 
  ConditionalEngine, 
  ConditionBuilder, 
  VariableManager, 
  BranchAnalytics 
} from '@/lib/journey/branching';

// Initialize components
const engine = new ConditionalEngine();
const variableManager = new VariableManager();
const analytics = new BranchAnalytics();
```

### 2. Journey Integration

```typescript
// In your journey executor
class JourneyExecutor {
  async executeConditionalNode(nodeId: string, context: BranchContext): Promise<string> {
    const branch = await this.getBranch(nodeId);
    const result = await this.conditionalEngine.evaluateBranch(branch, context);
    
    // Record for analytics
    this.analytics.recordExecution({
      id: generateId(),
      branchId: branch.id,
      journeyId: context.journeyId,
      userId: context.userId,
      executionTime: result.evaluationTime,
      result: result.result,
      pathTaken: result.nextNodeId,
      conditions: { /* condition details */ },
      timestamp: new Date()
    });
    
    return result.nextNodeId;
  }
}
```

### 3. Variable Setup

```typescript
// Initialize wedding context
const setupWeddingContext = (weddingData: any, clientData: any): BranchContext => {
  const scopeId = `journey_${journeyId}`;
  
  variableManager.createScope(scopeId, 'journey');
  variableManager.registerWeddingVariables(scopeId, weddingData, clientData);
  
  return {
    variables: variableManager.getAllVariables(scopeId),
    clientData,
    weddingData,
    timestamp: new Date(),
    userId: context.userId,
    journeyId: context.journeyId,
    instanceId: context.instanceId
  };
};
```

## Error Handling

### Common Error Types

1. **Invalid Conditions**: Malformed condition syntax
2. **Missing Variables**: Referenced variables don't exist
3. **Type Mismatches**: Data type conflicts in comparisons
4. **Performance Issues**: Execution time exceeds limits

### Error Response Format

```typescript
interface BranchError {
  type: 'condition' | 'variable' | 'performance' | 'system';
  message: string;
  branchId: string;
  conditionId?: string;
  timestamp: Date;
  context?: Record<string, any>;
}
```

### Best Practices

1. **Validate Conditions**: Use proper data types
2. **Default Paths**: Always provide fallback routes
3. **Monitor Performance**: Track execution times
4. **Test Thoroughly**: Validate all condition combinations

## Security Considerations

### Input Validation

- All condition values are validated for type safety
- Variable names are sanitized to prevent injection
- Expression evaluation is sandboxed

### Access Control

- Variable scoping prevents unauthorized access
- Context isolation between journey instances
- Audit logging for all evaluations

### Data Privacy

- Personal data is encrypted in transit and at rest
- Variables can be marked as sensitive
- Automatic cleanup of expired data

## Monitoring and Observability

### Real-Time Metrics

```typescript
const monitoring = new BranchMonitoring(monitoringConfig);

// Monitor execution
monitoring.monitorExecution(execution);

// Health checks
const health = monitoring.performHealthCheck();

// Business metrics
const businessMetrics = monitoring.monitorWeddingBusiness();
```

### Dashboard Integration

The system provides metrics for:

- Execution performance
- Conversion rates  
- A/B test results
- Error rates
- Business KPIs

### Alerting

Automatic alerts for:

- Slow execution times (>10ms)
- High error rates (>1%)
- Low conversion rates
- System resource issues

## Testing

### Unit Testing

```typescript
import { ConditionalEngine, ConditionBuilder } from '@/lib/journey/branching';

describe('Destination Wedding Detection', () => {
  test('should identify destination wedding', async () => {
    const engine = new ConditionalEngine();
    const branch = /* branch configuration */;
    const context = /* test context */;
    
    const result = await engine.evaluateBranch(branch, context);
    
    expect(result.result).toBe(true);
    expect(result.nextNodeId).toBe('destination_workflow');
    expect(result.evaluationTime).toBeLessThan(10);
  });
});
```

### Integration Testing

```typescript
describe('Wedding Photographer Journey Integration', () => {
  test('should complete destination wedding flow', async () => {
    // Test full journey execution with conditional branching
    const journeyResult = await executeJourney(destinationWeddingData);
    expect(journeyResult.completedNodes).toContain('destination_checklist');
  });
});
```

### E2E Testing

Use Playwright for browser-based testing of the visual components:

```typescript
test('should configure conditional node in UI', async ({ page }) => {
  await page.goto('/dashboard/journeys');
  await page.click('[data-testid="add-conditional-node"]');
  await page.fill('[data-testid="condition-field"]', 'wedding.location.distance');
  // ... test configuration UI
});
```

## Migration Guide

### From Simple Routing

```typescript
// Before: Simple routing
if (weddingData.location.distance > 100) {
  return 'destination_workflow';
} else {
  return 'local_workflow';
}

// After: Conditional branching
const branch: ConditionalBranch = {
  id: 'destination_check',
  name: 'Destination Check',
  conditionGroup: ConditionBuilder.wedding.isDestination(100),
  truePath: 'destination_workflow',
  falsePath: 'local_workflow'
};

const result = await engine.evaluateBranch(branch, context);
return result.nextNodeId;
```

### Adding Analytics

```typescript
// Record execution for analytics
analytics.recordExecution({
  id: generateId(),
  branchId: branch.id,
  // ... other execution details
});

// Track conversions
analytics.recordConversion({
  id: generateId(),
  executionId: execution.id,
  branchId: branch.id,
  eventType: 'booking_completed',
  eventValue: bookingAmount,
  timestamp: new Date()
});
```

## Troubleshooting

### Common Issues

**1. Slow Execution Times**
- Check condition complexity
- Verify variable caching
- Monitor system resources

**2. Incorrect Routing**
- Validate condition logic
- Check variable values
- Review operator usage

**3. A/B Test Issues**
- Verify user assignment consistency
- Check variant configuration
- Monitor sample sizes

### Debug Mode

Enable debug logging:

```typescript
const engine = new ConditionalEngine({ debug: true });
```

### Performance Analysis

```typescript
const metrics = analytics.getBranchMetrics(branchId);
console.log('Performance Analysis:', {
  avgExecutionTime: metrics.averageExecutionTime,
  p95: metrics.performanceStats.p95,
  p99: metrics.performanceStats.p99
});
```

---

This documentation provides comprehensive coverage of the Conditional Branching API designed specifically for wedding photographers. The system enables sophisticated journey automation while maintaining high performance and providing detailed analytics.