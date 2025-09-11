import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * End-to-End Test Suite for Journey Analytics Pipeline
 * Tests the complete flow from journey creation to analytics display
 */

describe('Journey Analytics End-to-End Flow', () => {
  let supabase: any
  let testJourneyId: string
  let testInstanceId: string
  let testClientId: string
  let testSupplierId: string

  beforeAll(async () => {
    // Initialize Supabase client
    const cookieStore = cookies()
    supabase = createClient(cookieStore)
    
    // Create test supplier
    const { data: supplier } = await supabase
      .from('suppliers')
      .insert({
        name: 'Test Wedding Photography',
        email: 'test@photography.com',
        type: 'photographer'
      })
      .select()
      .single()
    
    testSupplierId = supplier.id
    
    // Create test client
    const { data: client } = await supabase
      .from('clients')
      .insert({
        name: 'Test Client',
        email: 'client@test.com',
        company: 'Test Wedding'
      })
      .select()
      .single()
    
    testClientId = client.id
  })

  afterAll(async () => {
    // Cleanup test data
    if (testJourneyId) {
      await supabase.from('journey_canvases').delete().eq('id', testJourneyId)
    }
    if (testClientId) {
      await supabase.from('clients').delete().eq('id', testClientId)
    }
    if (testSupplierId) {
      await supabase.from('suppliers').delete().eq('id', testSupplierId)
    }
  })

  describe('Session A: Journey Creation', () => {
    it('should create a journey canvas with nodes', async () => {
      // Create journey canvas
      const { data: journey, error } = await supabase
        .from('journey_canvases')
        .insert({
          name: 'Test Photography Journey',
          supplier_id: testSupplierId,
          status: 'active',
          config: {
            description: 'Automated journey for wedding photography',
            trigger: 'form_submission'
          }
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(journey).toBeDefined()
      expect(journey.name).toBe('Test Photography Journey')
      
      testJourneyId = journey.id
      
      // Add nodes to journey
      const nodes = [
        {
          journey_id: testJourneyId,
          type: 'email',
          position: 0,
          config: {
            name: 'Welcome Email',
            subject: 'Welcome to Our Photography Services',
            template: 'welcome'
          }
        },
        {
          journey_id: testJourneyId,
          type: 'wait',
          position: 1,
          config: {
            name: 'Wait 2 Days',
            duration: 48,
            unit: 'hours'
          }
        },
        {
          journey_id: testJourneyId,
          type: 'form',
          position: 2,
          config: {
            name: 'Style Questionnaire',
            form_id: 'style-questionnaire'
          }
        },
        {
          journey_id: testJourneyId,
          type: 'condition',
          position: 3,
          config: {
            name: 'Check Response',
            condition: 'form_submitted'
          }
        },
        {
          journey_id: testJourneyId,
          type: 'action',
          position: 4,
          config: {
            name: 'Book Meeting',
            action: 'schedule_meeting'
          }
        }
      ]
      
      const { data: createdNodes, error: nodesError } = await supabase
        .from('journey_nodes')
        .insert(nodes)
        .select()
      
      expect(nodesError).toBeNull()
      expect(createdNodes).toHaveLength(5)
    })
  })

  describe('Session B: Journey Execution', () => {
    it('should execute journey for test client', async () => {
      // Start journey instance
      const { data: instance, error } = await supabase
        .from('journey_instances')
        .insert({
          journey_id: testJourneyId,
          client_id: testClientId,
          status: 'active',
          current_node_id: null,
          progress_percentage: 0,
          context: {
            source: 'test_suite',
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(instance).toBeDefined()
      expect(instance.status).toBe('active')
      
      testInstanceId = instance.id
      
      // Simulate node executions
      const nodes = await supabase
        .from('journey_nodes')
        .select('*')
        .eq('journey_id', testJourneyId)
        .order('position')
      
      for (const node of nodes.data || []) {
        // Execute node
        const { error: execError } = await supabase
          .from('node_executions')
          .insert({
            instance_id: testInstanceId,
            node_id: node.id,
            journey_id: testJourneyId,
            status: 'completed',
            execution_time_ms: Math.floor(Math.random() * 1000) + 100,
            result: {
              success: true,
              output: `Node ${node.config.name} executed`
            }
          })
        
        expect(execError).toBeNull()
        
        // Update instance progress
        const progress = ((node.position + 1) / nodes.data.length) * 100
        await supabase
          .from('journey_instances')
          .update({
            current_node_id: node.id,
            progress_percentage: progress,
            status: node.position === nodes.data.length - 1 ? 'completed' : 'active',
            completed_at: node.position === nodes.data.length - 1 ? new Date().toISOString() : null
          })
          .eq('id', testInstanceId)
        
        // Add delay to simulate real execution
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Verify final state
      const { data: finalInstance } = await supabase
        .from('journey_instances')
        .select('*')
        .eq('id', testInstanceId)
        .single()
      
      expect(finalInstance.status).toBe('completed')
      expect(finalInstance.progress_percentage).toBe(100)
    })
    
    it('should update client journey progress', async () => {
      // Check if progress was tracked
      const { data: progress } = await supabase
        .from('client_journey_progress')
        .select('*')
        .eq('instance_id', testInstanceId)
        .single()
      
      expect(progress).toBeDefined()
      expect(progress.completion_percentage).toBeGreaterThanOrEqual(100)
      expect(progress.engagement_level).toBe('high')
    })
  })

  describe('Session C: Analytics Dashboard', () => {
    it('should fetch analytics dashboard data', async () => {
      // Call dashboard API
      const response = await fetch('/api/analytics/dashboard?timeframe=7d', {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      
      // Verify dashboard data structure
      expect(data).toHaveProperty('overview')
      expect(data).toHaveProperty('funnel')
      expect(data).toHaveProperty('revenue')
      expect(data).toHaveProperty('active_journeys')
      expect(data).toHaveProperty('performance_history')
      
      // Verify our test journey is included
      expect(data.overview.total_journeys).toBeGreaterThanOrEqual(1)
      expect(data.overview.total_instances).toBeGreaterThanOrEqual(1)
    })
    
    it('should show journey in performance metrics', async () => {
      // Fetch journey-specific analytics
      const response = await fetch(`/api/analytics/journeys/${testJourneyId}`)
      
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      
      // Verify journey analytics
      expect(data.journey.id).toBe(testJourneyId)
      expect(data.journey.name).toBe('Test Photography Journey')
      
      // Verify performance metrics
      expect(data.performance).toBeDefined()
      expect(data.node_analytics).toBeDefined()
      expect(data.client_progress).toBeDefined()
      expect(data.conversion_funnel).toBeDefined()
      
      // Check node analytics
      expect(data.node_analytics).toHaveLength(5)
      data.node_analytics.forEach((node: any) => {
        expect(node.executions).toBeGreaterThanOrEqual(1)
        expect(node.success_rate).toBe(100)
      })
    })
    
    it('should update materialized views', async () => {
      // Trigger view refresh
      const { error } = await supabase.rpc('refresh_journey_dashboard')
      
      expect(error).toBeNull()
      
      // Check materialized view data
      const { data: summary } = await supabase
        .from('journey_performance_summary')
        .select('*')
        .eq('id', testJourneyId)
        .single()
      
      expect(summary).toBeDefined()
      expect(summary.total_instances).toBeGreaterThanOrEqual(1)
      expect(summary.completed_instances).toBeGreaterThanOrEqual(1)
      expect(summary.completion_rate).toBeGreaterThan(0)
    })
    
    it('should calculate conversion funnel correctly', async () => {
      // Get funnel analysis
      const { data: funnel } = await supabase
        .from('journey_funnel_analysis')
        .select('*')
        .eq('journey_id', testJourneyId)
        .order('sequence_order')
      
      expect(funnel).toBeDefined()
      expect(funnel.length).toBe(5)
      
      // Verify funnel progression
      let previousReached = Infinity
      funnel.forEach((stage: any) => {
        expect(stage.instances_reached).toBeLessThanOrEqual(previousReached)
        previousReached = stage.instances_reached
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should receive real-time analytics updates', async (done) => {
      // Subscribe to analytics updates
      const channel = supabase
        .channel(`test-analytics-${testJourneyId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'journey_analytics',
            filter: `journey_id=eq.${testJourneyId}`
          },
          (payload: any) => {
            expect(payload.new).toBeDefined()
            expect(payload.new.journey_id).toBe(testJourneyId)
            done()
          }
        )
        .subscribe()
      
      // Trigger an update
      await supabase
        .from('journey_analytics')
        .update({ updated_at: new Date().toISOString() })
        .eq('journey_id', testJourneyId)
      
      // Cleanup
      setTimeout(() => {
        supabase.removeChannel(channel)
        done()
      }, 2000)
    })
  })

  describe('Performance Metrics', () => {
    it('should load dashboard in under 2 seconds', async () => {
      const startTime = Date.now()
      
      const response = await fetch('/api/analytics/dashboard?timeframe=30d')
      const data = await response.json()
      
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(2000)
      expect(data).toBeDefined()
    })
    
    it('should use cached data for repeated requests', async () => {
      // First request (cache miss)
      const firstStart = Date.now()
      await fetch('/api/analytics/dashboard?timeframe=30d')
      const firstTime = Date.now() - firstStart
      
      // Second request (cache hit)
      const secondStart = Date.now()
      await fetch('/api/analytics/dashboard?timeframe=30d')
      const secondTime = Date.now() - secondStart
      
      // Cached request should be significantly faster
      expect(secondTime).toBeLessThan(firstTime / 2)
    })
  })
})

describe('Integration Test: All Sessions', () => {
  it('should complete full journey lifecycle', async () => {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Session A: Create journey
    const journey = await createJourney(supabase, {
      name: 'Integration Test Journey',
      nodes: 3
    })
    
    // Session B: Execute journey
    const execution = await executeJourney(supabase, {
      journeyId: journey.id,
      clientId: 'test-client-integration'
    })
    
    // Session C: Verify analytics
    const analytics = await verifyAnalytics(supabase, {
      journeyId: journey.id,
      instanceId: execution.id
    })
    
    expect(analytics.success).toBe(true)
    expect(analytics.metrics.completion_rate).toBeGreaterThan(0)
    
    // Cleanup
    await cleanupTestData(supabase, {
      journeyId: journey.id,
      instanceId: execution.id
    })
  })
})

// Helper functions
async function createJourney(supabase: any, config: any) {
  const { data } = await supabase
    .from('journey_canvases')
    .insert({
      name: config.name,
      status: 'active',
      config: { nodes: config.nodes }
    })
    .select()
    .single()
  
  return data
}

async function executeJourney(supabase: any, config: any) {
  const { data } = await supabase
    .from('journey_instances')
    .insert({
      journey_id: config.journeyId,
      client_id: config.clientId,
      status: 'active'
    })
    .select()
    .single()
  
  // Simulate execution
  await supabase
    .from('journey_instances')
    .update({
      status: 'completed',
      progress_percentage: 100,
      completed_at: new Date().toISOString()
    })
    .eq('id', data.id)
  
  return data
}

async function verifyAnalytics(supabase: any, config: any) {
  const { data: metrics } = await supabase
    .from('journey_performance_summary')
    .select('*')
    .eq('id', config.journeyId)
    .single()
  
  return {
    success: metrics !== null,
    metrics
  }
}

async function cleanupTestData(supabase: any, config: any) {
  await supabase.from('journey_instances').delete().eq('id', config.instanceId)
  await supabase.from('journey_canvases').delete().eq('id', config.journeyId)
}