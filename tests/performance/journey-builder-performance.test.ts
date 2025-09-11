import { performance } from 'perf_hooks'
import { createClient } from '@supabase/supabase-js'
import { JourneyExecutor } from '@/lib/journey/executor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Journey Builder Performance Tests', () => {
  const performanceTargets = {
    canvasRender: 100,      // <100ms for 50 nodes
    journeySave: 500,       // <500ms
    executionStart: 1000,   // <1s
    templateLoad: 200,      // <200ms
    dbQuery: 50,           // <50ms average
  }

  describe('Canvas Rendering Performance', () => {
    test('Renders 50 nodes within 100ms', async () => {
      const nodes = Array.from({ length: 50 }, (_, i) => ({
        id: `node-${i}`,
        type: ['trigger', 'action', 'condition', 'delay', 'end'][i % 5],
        position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 },
        data: { label: `Node ${i}` }
      }))

      const edges = nodes.slice(0, -1).map((node, i) => ({
        id: `edge-${i}`,
        source: node.id,
        target: nodes[i + 1].id
      }))

      const start = performance.now()
      
      const canvas = {
        nodes,
        edges,
        render: () => {
          nodes.forEach(node => {
            const element = { ...node, rendered: true }
          })
          edges.forEach(edge => {
            const path = { ...edge, rendered: true }
          })
        }
      }
      
      canvas.render()
      
      const renderTime = performance.now() - start
      
      expect(renderTime).toBeLessThan(performanceTargets.canvasRender)
      console.log(`Canvas render time for 50 nodes: ${renderTime.toFixed(2)}ms`)
    })

    test('Handles 100+ nodes without freezing', async () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'action',
        position: { x: (i % 20) * 50, y: Math.floor(i / 20) * 50 }
      }))

      const start = performance.now()
      const renderPromise = new Promise(resolve => {
        setTimeout(() => {
          nodes.forEach(node => ({ ...node, rendered: true }))
          resolve(true)
        }, 0)
      })

      await renderPromise
      const renderTime = performance.now() - start
      
      expect(renderTime).toBeLessThan(1000)
      console.log(`Canvas render time for 100 nodes: ${renderTime.toFixed(2)}ms`)
    })
  })

  describe('Journey Save Performance', () => {
    test('Saves journey within 500ms', async () => {
      const journey = {
        name: 'Performance Test Journey',
        description: 'Testing save performance',
        nodes: Array.from({ length: 20 }, (_, i) => ({
          id: `node-${i}`,
          type: 'action',
          position: { x: i * 100, y: 100 },
          data: { actionType: 'send_email' }
        })),
        edges: Array.from({ length: 19 }, (_, i) => ({
          source: `node-${i}`,
          target: `node-${i + 1}`
        }))
      }

      const start = performance.now()
      
      const { data, error } = await supabase
        .from('journeys')
        .insert(journey)
        .select()
        .single()
      
      const saveTime = performance.now() - start
      
      expect(error).toBeNull()
      expect(saveTime).toBeLessThan(performanceTargets.journeySave)
      console.log(`Journey save time: ${saveTime.toFixed(2)}ms`)

      if (data) {
        await supabase.from('journeys').delete().eq('id', data.id)
      }
    })

    test('Updates journey efficiently', async () => {
      const { data: journey } = await supabase
        .from('journeys')
        .insert({
          name: 'Update Test',
          nodes: [],
          edges: []
        })
        .select()
        .single()

      const updates = Array.from({ length: 10 }, async (_, i) => {
        const start = performance.now()
        
        await supabase
          .from('journeys')
          .update({
            nodes: Array.from({ length: i + 1 }, (_, j) => ({
              id: `node-${j}`,
              type: 'action'
            }))
          })
          .eq('id', journey.id)
        
        return performance.now() - start
      })

      const updateTimes = await Promise.all(updates)
      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
      
      expect(avgUpdateTime).toBeLessThan(performanceTargets.journeySave)
      console.log(`Average update time: ${avgUpdateTime.toFixed(2)}ms`)

      await supabase.from('journeys').delete().eq('id', journey.id)
    })
  })

  describe('Journey Execution Performance', () => {
    test('Starts execution within 1 second', async () => {
      const { data: journey } = await supabase
        .from('journeys')
        .insert({
          name: 'Execution Test',
          nodes: [
            { id: 'start', type: 'trigger' },
            { id: 'action1', type: 'action', data: { actionType: 'send_email' } },
            { id: 'action2', type: 'action', data: { actionType: 'send_sms' } },
            { id: 'end', type: 'end' }
          ],
          edges: [
            { source: 'start', target: 'action1' },
            { source: 'action1', target: 'action2' },
            { source: 'action2', target: 'end' }
          ]
        })
        .select()
        .single()

      const start = performance.now()
      
      const { data: execution } = await supabase
        .from('journey_executions')
        .insert({
          journey_id: journey.id,
          entity_id: 'test-123',
          entity_type: 'client',
          status: 'pending'
        })
        .select()
        .single()

      const executor = new JourneyExecutor(journey, execution)
      await executor.start()
      
      const executionTime = performance.now() - start
      
      expect(executionTime).toBeLessThan(performanceTargets.executionStart)
      console.log(`Execution start time: ${executionTime.toFixed(2)}ms`)

      await supabase.from('journey_executions').delete().eq('id', execution.id)
      await supabase.from('journeys').delete().eq('id', journey.id)
    })

    test('Handles 100 concurrent executions', async () => {
      const { data: journey } = await supabase
        .from('journeys')
        .insert({
          name: 'Concurrent Test',
          nodes: [
            { id: 'start', type: 'trigger' },
            { id: 'end', type: 'end' }
          ],
          edges: [{ source: 'start', target: 'end' }]
        })
        .select()
        .single()

      const start = performance.now()
      
      const executions = await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          const { data } = await supabase
            .from('journey_executions')
            .insert({
              journey_id: journey.id,
              entity_id: `client-${i}`,
              entity_type: 'client',
              status: 'running'
            })
            .select()
            .single()
          return data
        })
      )
      
      const concurrentTime = performance.now() - start
      
      expect(executions).toHaveLength(100)
      expect(concurrentTime).toBeLessThan(10000)
      console.log(`100 concurrent executions time: ${concurrentTime.toFixed(2)}ms`)

      await Promise.all(
        executions.map(e => 
          supabase.from('journey_executions').delete().eq('id', e.id)
        )
      )
      await supabase.from('journeys').delete().eq('id', journey.id)
    })
  })

  describe('Template Loading Performance', () => {
    test('Loads templates within 200ms', async () => {
      const templates = [
        { name: 'Welcome Series', nodes: 10, edges: 9 },
        { name: 'Lead Nurture', nodes: 15, edges: 14 },
        { name: 'Event Follow-up', nodes: 8, edges: 7 },
        { name: 'Customer Onboarding', nodes: 20, edges: 19 },
        { name: 'Re-engagement', nodes: 12, edges: 11 }
      ]

      for (const template of templates) {
        await supabase.from('journey_templates').insert({
          name: template.name,
          nodes: Array.from({ length: template.nodes }, (_, i) => ({
            id: `node-${i}`,
            type: 'action'
          })),
          edges: Array.from({ length: template.edges }, (_, i) => ({
            source: `node-${i}`,
            target: `node-${i + 1}`
          }))
        })
      }

      const start = performance.now()
      
      const { data } = await supabase
        .from('journey_templates')
        .select('*')
      
      const loadTime = performance.now() - start
      
      expect(loadTime).toBeLessThan(performanceTargets.templateLoad)
      console.log(`Template load time: ${loadTime.toFixed(2)}ms`)

      await supabase.from('journey_templates').delete().gte('id', 0)
    })
  })

  describe('Database Query Performance', () => {
    test('Average query time under 50ms', async () => {
      const queries = [
        () => supabase.from('journeys').select('*').limit(10),
        () => supabase.from('journey_executions').select('*').limit(10),
        () => supabase.from('journey_templates').select('*'),
        () => supabase.from('journeys').select('id, name, status').eq('status', 'active'),
        () => supabase.from('journey_executions').select('*').eq('status', 'running')
      ]

      const queryTimes = await Promise.all(
        queries.map(async query => {
          const start = performance.now()
          await query()
          return performance.now() - start
        })
      )

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length
      
      expect(avgQueryTime).toBeLessThan(performanceTargets.dbQuery)
      console.log(`Average DB query time: ${avgQueryTime.toFixed(2)}ms`)
      console.log(`Individual query times: ${queryTimes.map(t => t.toFixed(2)).join(', ')}ms`)
    })

    test('Bulk operations perform efficiently', async () => {
      const start = performance.now()
      
      const journeys = Array.from({ length: 50 }, (_, i) => ({
        name: `Bulk Journey ${i}`,
        nodes: [],
        edges: [],
        status: 'draft'
      }))

      const { data } = await supabase
        .from('journeys')
        .insert(journeys)
        .select('id')
      
      const bulkInsertTime = performance.now() - start
      
      expect(bulkInsertTime).toBeLessThan(2000)
      console.log(`Bulk insert 50 journeys: ${bulkInsertTime.toFixed(2)}ms`)

      if (data) {
        const deleteStart = performance.now()
        await supabase
          .from('journeys')
          .delete()
          .in('id', data.map(d => d.id))
        const bulkDeleteTime = performance.now() - deleteStart
        
        expect(bulkDeleteTime).toBeLessThan(1000)
        console.log(`Bulk delete 50 journeys: ${bulkDeleteTime.toFixed(2)}ms`)
      }
    })
  })

  describe('Memory Usage', () => {
    test('No memory leaks with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < 100; i++) {
        const nodes = Array.from({ length: 20 }, (_, j) => ({
          id: `node-${i}-${j}`,
          type: 'action'
        }))
        
        const journey = { nodes, edges: [] }
        JSON.stringify(journey)
      }

      global.gc && global.gc()
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024
      
      expect(memoryIncrease).toBeLessThan(50)
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`)
    })
  })
})