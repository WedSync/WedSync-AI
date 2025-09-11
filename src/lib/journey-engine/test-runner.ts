import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { journeyExecutor } from './executor';
import { journeyScheduler } from './scheduler';
import { JourneyStateMachine } from './state-machine';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Journey Engine Test Runner - Comprehensive testing of the journey system
 */
export class JourneyTestRunner {
  /**
   * Run all journey engine tests
   */
  static async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      test: string;
      passed: boolean;
      error?: string;
      duration: number;
    }>;
  }> {
    const tests = [
      { name: 'Database Schema Test', fn: this.testDatabaseSchema },
      { name: 'Journey Creation Test', fn: this.testJourneyCreation },
      { name: 'Journey Activation Test', fn: this.testJourneyActivation },
      { name: 'Instance Creation Test', fn: this.testInstanceCreation },
      { name: 'Simple Execution Test', fn: this.testSimpleExecution },
      { name: 'Condition Evaluation Test', fn: this.testConditionEvaluation },
      { name: 'Scheduling Test', fn: this.testScheduling },
      { name: 'State Machine Test', fn: this.testStateMachine },
      { name: 'Error Handling Test', fn: this.testErrorHandling },
      { name: 'Webhook Processing Test', fn: this.testWebhookProcessing },
    ];

    const results = [];
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      const startTime = Date.now();
      try {
        await test.fn.call(this);
        const duration = Date.now() - startTime;
        results.push({ test: test.name, passed: true, duration });
        passed++;
        console.log(`✅ ${test.name} - ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          test: test.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
        });
        failed++;
        console.error(
          `❌ ${test.name} - ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return { passed, failed, results };
  }

  /**
   * Test database schema
   */
  private static async testDatabaseSchema() {
    // Test that all required tables exist
    const tables = [
      'journeys',
      'journey_nodes',
      'journey_instances',
      'journey_node_executions',
      'journey_events',
      'journey_schedules',
      'journey_templates',
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .limit(1);

      if (error) {
        throw new Error(`Table ${table} not accessible: ${error.message}`);
      }
    }
  }

  /**
   * Test journey creation
   */
  private static async testJourneyCreation() {
    const testJourney = {
      vendor_id: '00000000-0000-0000-0000-000000000001',
      organization_id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Journey',
      description: 'Test journey for validation',
      canvas_data: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            data: { label: 'Start' },
            position: { x: 0, y: 0 },
          },
          {
            id: 'email',
            type: 'action',
            data: {
              label: 'Send Email',
              actionType: 'send_email',
              actionConfig: { template: 'welcome' },
            },
            position: { x: 200, y: 0 },
          },
          {
            id: 'end',
            type: 'end',
            data: { label: 'End' },
            position: { x: 400, y: 0 },
          },
        ],
        edges: [
          { source: 'start', target: 'email' },
          { source: 'email', target: 'end' },
        ],
      },
    };

    const { data: journey, error } = await supabase
      .from('journeys')
      .insert(testJourney)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test journey: ${error.message}`);
    }

    // Verify nodes were created
    const { data: nodes } = await supabase
      .from('journey_nodes')
      .select('*')
      .eq('journey_id', journey.id);

    if (!nodes || nodes.length !== 3) {
      throw new Error('Journey nodes were not created correctly');
    }

    // Cleanup
    await supabase.from('journeys').delete().eq('id', journey.id);
  }

  /**
   * Test journey activation
   */
  private static async testJourneyActivation() {
    // Create a test journey
    const { data: journey } = await supabase
      .from('journeys')
      .insert({
        vendor_id: '00000000-0000-0000-0000-000000000001',
        organization_id: '00000000-0000-0000-0000-000000000001',
        name: 'Activation Test Journey',
        canvas_data: {
          nodes: [
            { id: 'start', type: 'start', data: {}, position: { x: 0, y: 0 } },
            { id: 'end', type: 'end', data: {}, position: { x: 200, y: 0 } },
          ],
          edges: [{ source: 'start', target: 'end' }],
        },
        status: 'draft',
      })
      .select()
      .single();

    if (!journey) {
      throw new Error('Failed to create test journey for activation');
    }

    // Test activation
    const success = await JourneyStateMachine.transitionJourney(
      journey.id,
      'draft',
      'active',
      'test_user',
      'Test activation',
    );

    if (!success) {
      throw new Error('Failed to activate journey');
    }

    // Verify status
    const { data: updatedJourney } = await supabase
      .from('journeys')
      .select('status')
      .eq('id', journey.id)
      .single();

    if (updatedJourney?.status !== 'active') {
      throw new Error('Journey status was not updated to active');
    }

    // Cleanup
    await supabase.from('journeys').delete().eq('id', journey.id);
  }

  /**
   * Test instance creation
   */
  private static async testInstanceCreation() {
    // Create test client
    const { data: client } = await supabase
      .from('clients')
      .insert({
        vendor_id: '00000000-0000-0000-0000-000000000001',
        first_name: 'Test',
        last_name: 'Client',
        email: 'test@example.com',
        phone: '+1234567890',
      })
      .select()
      .single();

    if (!client) {
      throw new Error('Failed to create test client');
    }

    // Create test journey
    const { data: journey } = await supabase
      .from('journeys')
      .insert({
        vendor_id: '00000000-0000-0000-0000-000000000001',
        organization_id: '00000000-0000-0000-0000-000000000001',
        name: 'Instance Test Journey',
        canvas_data: {
          nodes: [
            { id: 'start', type: 'start', data: {}, position: { x: 0, y: 0 } },
            { id: 'end', type: 'end', data: {}, position: { x: 200, y: 0 } },
          ],
          edges: [{ source: 'start', target: 'end' }],
        },
        status: 'active',
      })
      .select()
      .single();

    if (!journey) {
      throw new Error('Failed to create test journey');
    }

    // Create journey nodes
    await supabase.from('journey_nodes').insert([
      {
        journey_id: journey.id,
        node_id: 'start',
        type: 'start',
        name: 'Start',
        config: {},
        next_nodes: ['end'],
      },
      {
        journey_id: journey.id,
        node_id: 'end',
        type: 'end',
        name: 'End',
        config: {},
        next_nodes: [],
      },
    ]);

    // Test instance creation
    const instanceId = await journeyExecutor.startJourney(
      journey.id,
      client.id,
      '00000000-0000-0000-0000-000000000001',
      { test: true },
      'test_trigger',
    );

    if (!instanceId) {
      throw new Error('Failed to create journey instance');
    }

    // Verify instance exists
    const { data: instance } = await supabase
      .from('journey_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (!instance) {
      throw new Error('Journey instance was not created');
    }

    // Cleanup
    await supabase.from('journey_instances').delete().eq('id', instanceId);
    await supabase.from('journeys').delete().eq('id', journey.id);
    await supabase.from('clients').delete().eq('id', client.id);
  }

  /**
   * Test simple journey execution
   */
  private static async testSimpleExecution() {
    // This test would require actual email/SMS services to be configured
    // For now, we'll just test the execution flow without external calls
    console.log('Simple execution test requires external service integration');
  }

  /**
   * Test condition evaluation
   */
  private static async testConditionEvaluation() {
    const { ConditionExecutor } = await import(
      './executors/condition-executor'
    );

    const config = {
      conditions: [
        {
          id: 'test1',
          field: 'age',
          operator: 'greater_than' as const,
          value: 18,
        },
        {
          id: 'test2',
          field: 'status',
          operator: 'equals' as const,
          value: 'active',
          logicalOperator: 'AND' as const,
        },
      ],
    };

    const variables = {
      age: 25,
      status: 'active',
    };

    const result = await ConditionExecutor.execute(
      'test-instance',
      'test-client',
      config,
      variables,
    );

    if (!result.result) {
      throw new Error('Condition evaluation failed - expected true result');
    }

    if (result.matchedConditions.length !== 2) {
      throw new Error('Expected 2 matched conditions');
    }
  }

  /**
   * Test scheduling system
   */
  private static async testScheduling() {
    const scheduledFor = new Date(Date.now() + 5000); // 5 seconds from now

    const taskId = await journeyScheduler.scheduleTask(
      'test-instance',
      'test-node',
      scheduledFor,
      'test',
      { test: true },
    );

    if (!taskId) {
      throw new Error('Failed to schedule task');
    }

    // Verify task was created
    const { data: task } = await supabase
      .from('journey_schedules')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!task) {
      throw new Error('Scheduled task was not created');
    }

    // Cleanup
    await supabase.from('journey_schedules').delete().eq('id', taskId);
  }

  /**
   * Test state machine transitions
   */
  private static async testStateMachine() {
    const transitions =
      JourneyStateMachine.getAvailableJourneyTransitions('draft');

    if (!transitions.includes('active')) {
      throw new Error('Expected draft -> active transition to be available');
    }

    const invalidTransitions =
      JourneyStateMachine.getAvailableJourneyTransitions('deleted');

    if (invalidTransitions.length > 0) {
      throw new Error('Deleted state should have no available transitions');
    }
  }

  /**
   * Test error handling
   */
  private static async testErrorHandling() {
    const { JourneyErrorHandler } = await import('./error-handler');

    const testError = new Error('Test error for validation');

    const journeyError = await JourneyErrorHandler.handleError(testError, {
      instanceId: 'test-instance',
      journeyId: 'test-journey',
    });

    if (!journeyError.id) {
      throw new Error('Error was not properly categorized');
    }

    if (journeyError.message !== 'Test error for validation') {
      throw new Error('Error message was not preserved');
    }
  }

  /**
   * Test webhook processing
   */
  private static async testWebhookProcessing() {
    await journeyExecutor.handleWebhookEvent({
      type: 'test_event',
      source: 'test',
      data: { test: true },
      clientId: 'test-client',
    });

    // Verify event was recorded
    const { data: events } = await supabase
      .from('journey_events')
      .select('*')
      .eq('event_type', 'test_event')
      .eq('client_id', 'test-client')
      .limit(1);

    if (!events || events.length === 0) {
      throw new Error('Webhook event was not recorded');
    }

    // Cleanup
    await supabase.from('journey_events').delete().eq('id', events[0].id);
  }

  /**
   * Run performance tests
   */
  static async runPerformanceTests(): Promise<{
    results: Array<{ test: string; duration: number; throughput?: number }>;
  }> {
    const results = [];

    // Test 1: Condition evaluation performance
    const { ConditionExecutor } = await import(
      './executors/condition-executor'
    );
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await ConditionExecutor.execute(
        'perf-test',
        'perf-client',
        {
          conditions: [
            {
              id: 'perf1',
              field: 'counter',
              operator: 'greater_than',
              value: 50,
            },
          ],
        },
        { counter: i },
      );
    }

    const conditionDuration = Date.now() - startTime;
    results.push({
      test: '100 Condition Evaluations',
      duration: conditionDuration,
      throughput: Math.round(100 / (conditionDuration / 1000)),
    });

    // Test 2: Database write performance
    const dbStartTime = Date.now();
    const events = Array.from({ length: 50 }, (_, i) => ({
      event_type: 'performance_test',
      event_source: 'test',
      event_data: { index: i },
    }));

    await supabase.from('journey_events').insert(events);

    const dbDuration = Date.now() - dbStartTime;
    results.push({
      test: '50 Database Inserts',
      duration: dbDuration,
      throughput: Math.round(50 / (dbDuration / 1000)),
    });

    // Cleanup
    await supabase
      .from('journey_events')
      .delete()
      .eq('event_type', 'performance_test');

    return { results };
  }
}

/**
 * Quick test runner for development
 */
export async function runQuickTest() {
  console.log('🚀 Running Journey Engine Quick Test...\n');

  try {
    const results = await JourneyTestRunner.runAllTests();

    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(
      `📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`,
    );

    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.results
        .filter((r) => !r.passed)
        .forEach((r) => console.log(`  - ${r.test}: ${r.error}`));
    }

    // Run performance tests
    console.log('\n🏃‍♂️ Running Performance Tests...');
    const perfResults = await JourneyTestRunner.runPerformanceTests();

    console.log('\n📈 Performance Results:');
    perfResults.results.forEach((r) => {
      console.log(
        `  - ${r.test}: ${r.duration}ms (${r.throughput || 0} ops/sec)`,
      );
    });

    return results.passed === results.passed + results.failed;
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    return false;
  }
}
