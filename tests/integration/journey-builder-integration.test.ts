import { createClient } from '@supabase/supabase-js'
import { JourneyExecutor } from '@/lib/journey/executor'
import { EmailService } from '@/lib/email/service'
import { SMSService } from '@/lib/sms/service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Journey Builder Integration Tests', () => {
  let journeyId: string
  let executionId: string

  beforeEach(async () => {
    const { data: journey } = await supabase
      .from('journeys')
      .insert({
        name: 'Test Journey',
        description: 'Integration test journey',
        nodes: [
          { id: 'start', type: 'trigger', position: { x: 100, y: 100 } },
          { id: 'email', type: 'action', data: { actionType: 'send_email' }, position: { x: 300, y: 100 } },
          { id: 'end', type: 'end', position: { x: 500, y: 100 } }
        ],
        edges: [
          { source: 'start', target: 'email' },
          { source: 'email', target: 'end' }
        ],
        status: 'draft'
      })
      .select()
      .single()

    journeyId = journey.id
  })

  afterEach(async () => {
    if (executionId) {
      await supabase.from('journey_executions').delete().eq('id', executionId)
    }
    if (journeyId) {
      await supabase.from('journeys').delete().eq('id', journeyId)
    }
  })

  describe('Database Persistence', () => {
    test('Journey saves to database correctly', async () => {
      const { data } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', journeyId)
        .single()

      expect(data).toBeDefined()
      expect(data.name).toBe('Test Journey')
      expect(data.nodes).toHaveLength(3)
      expect(data.edges).toHaveLength(2)
    })

    test('Journey execution creates database record', async () => {
      const { data: execution } = await supabase
        .from('journey_executions')
        .insert({
          journey_id: journeyId,
          entity_id: 'test-entity-123',
          entity_type: 'client',
          status: 'pending'
        })
        .select()
        .single()

      executionId = execution.id
      expect(execution).toBeDefined()
      expect(execution.journey_id).toBe(journeyId)
      expect(execution.status).toBe('pending')
    })

    test('Journey state updates persist', async () => {
      const { data: execution } = await supabase
        .from('journey_executions')
        .insert({
          journey_id: journeyId,
          entity_id: 'test-entity-123',
          entity_type: 'client',
          status: 'pending',
          current_node_id: 'start'
        })
        .select()
        .single()

      executionId = execution.id

      await supabase
        .from('journey_executions')
        .update({ 
          current_node_id: 'email',
          status: 'running'
        })
        .eq('id', executionId)

      const { data: updated } = await supabase
        .from('journey_executions')
        .select('*')
        .eq('id', executionId)
        .single()

      expect(updated.current_node_id).toBe('email')
      expect(updated.status).toBe('running')
    })
  })

  describe('Email Service Integration', () => {
    test('Email node triggers email service', async () => {
      const emailSpy = jest.spyOn(EmailService.prototype, 'send')
        .mockResolvedValue({ success: true, messageId: 'test-123' })

      const journey = {
        id: journeyId,
        nodes: [
          { id: 'start', type: 'trigger' },
          { 
            id: 'email', 
            type: 'action', 
            data: { 
              actionType: 'send_email',
              to: 'test@example.com',
              subject: 'Test Email',
              body: 'Test content'
            }
          },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { source: 'start', target: 'email' },
          { source: 'email', target: 'end' }
        ]
      }

      const execution = {
        id: 'exec-123',
        journey_id: journeyId,
        status: 'pending'
      }

      const executor = new JourneyExecutor(journey, execution)
      await executor.start()

      expect(emailSpy).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'Test content'
      })
    })

    test('Email failure handled gracefully', async () => {
      jest.spyOn(EmailService.prototype, 'send')
        .mockRejectedValue(new Error('Email service unavailable'))

      const journey = {
        id: journeyId,
        nodes: [
          { id: 'start', type: 'trigger' },
          { id: 'email', type: 'action', data: { actionType: 'send_email' } },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { source: 'start', target: 'email' },
          { source: 'email', target: 'end' }
        ]
      }

      const execution = {
        id: 'exec-123',
        journey_id: journeyId,
        status: 'pending'
      }

      const executor = new JourneyExecutor(journey, execution)
      
      await expect(executor.start()).rejects.toThrow('Email service unavailable')
      
      const { data } = await supabase
        .from('journey_executions')
        .select('status')
        .eq('id', 'exec-123')
        .single()
      
      expect(data?.status).toBe('failed')
    })
  })

  describe('SMS Service Integration', () => {
    test('SMS node triggers SMS service', async () => {
      const smsSpy = jest.spyOn(SMSService.prototype, 'send')
        .mockResolvedValue({ success: true, messageId: 'sms-123' })

      const journey = {
        id: journeyId,
        nodes: [
          { id: 'start', type: 'trigger' },
          { 
            id: 'sms', 
            type: 'action', 
            data: { 
              actionType: 'send_sms',
              to: '+1234567890',
              message: 'Test SMS'
            }
          },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { source: 'start', target: 'sms' },
          { source: 'sms', target: 'end' }
        ]
      }

      const execution = {
        id: 'exec-123',
        journey_id: journeyId,
        status: 'pending'
      }

      const executor = new JourneyExecutor(journey, execution)
      await executor.start()

      expect(smsSpy).toHaveBeenCalledWith({
        to: '+1234567890',
        message: 'Test SMS'
      })
    })
  })

  describe('Form Assignment Integration', () => {
    test('Form assignment node creates form assignment', async () => {
      const { data: form } = await supabase
        .from('forms')
        .insert({
          name: 'Test Form',
          slug: 'test-form',
          fields: []
        })
        .select()
        .single()

      const journey = {
        id: journeyId,
        nodes: [
          { id: 'start', type: 'trigger' },
          { 
            id: 'form', 
            type: 'action', 
            data: { 
              actionType: 'assign_form',
              formId: form.id,
              clientId: 'client-123'
            }
          },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { source: 'start', target: 'form' },
          { source: 'form', target: 'end' }
        ]
      }

      const execution = {
        id: 'exec-123',
        journey_id: journeyId,
        status: 'pending'
      }

      const executor = new JourneyExecutor(journey, execution)
      await executor.start()

      const { data: assignment } = await supabase
        .from('form_assignments')
        .select('*')
        .eq('form_id', form.id)
        .eq('client_id', 'client-123')
        .single()

      expect(assignment).toBeDefined()
      expect(assignment.status).toBe('pending')

      await supabase.from('forms').delete().eq('id', form.id)
    })
  })

  describe('WedMe API Integration', () => {
    test('Journey execution syncs with WedMe view', async () => {
      const { data: client } = await supabase
        .from('clients')
        .insert({
          name: 'Test Client',
          email: 'client@example.com',
          journey_status: {}
        })
        .select()
        .single()

      const { data: execution } = await supabase
        .from('journey_executions')
        .insert({
          journey_id: journeyId,
          entity_id: client.id,
          entity_type: 'client',
          status: 'running',
          current_node_id: 'email'
        })
        .select()
        .single()

      executionId = execution.id

      const response = await fetch(`/api/clients/${client.id}/journey-status`)
      const data = await response.json()

      expect(data.journeyExecutions).toHaveLength(1)
      expect(data.journeyExecutions[0].status).toBe('running')
      expect(data.journeyExecutions[0].current_node_id).toBe('email')

      await supabase.from('clients').delete().eq('id', client.id)
    })

    test('Multiple journey executions tracked per client', async () => {
      const { data: client } = await supabase
        .from('clients')
        .insert({
          name: 'Test Client',
          email: 'client@example.com'
        })
        .select()
        .single()

      const executions = []
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from('journey_executions')
          .insert({
            journey_id: journeyId,
            entity_id: client.id,
            entity_type: 'client',
            status: i === 0 ? 'completed' : 'running'
          })
          .select()
          .single()
        executions.push(data.id)
      }

      const response = await fetch(`/api/clients/${client.id}/journey-status`)
      const data = await response.json()

      expect(data.journeyExecutions).toHaveLength(3)
      expect(data.journeyExecutions.filter(e => e.status === 'running')).toHaveLength(2)
      expect(data.journeyExecutions.filter(e => e.status === 'completed')).toHaveLength(1)

      for (const id of executions) {
        await supabase.from('journey_executions').delete().eq('id', id)
      }
      await supabase.from('clients').delete().eq('id', client.id)
    })
  })

  describe('Conditional Logic', () => {
    test('Condition node evaluates correctly', async () => {
      const journey = {
        id: journeyId,
        nodes: [
          { id: 'start', type: 'trigger' },
          { 
            id: 'condition', 
            type: 'condition',
            data: {
              field: 'score',
              operator: 'greater_than',
              value: 50
            }
          },
          { id: 'high_score', type: 'action', data: { actionType: 'send_email' } },
          { id: 'low_score', type: 'action', data: { actionType: 'send_sms' } },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { source: 'start', target: 'condition' },
          { source: 'condition', target: 'high_score', sourceHandle: 'yes' },
          { source: 'condition', target: 'low_score', sourceHandle: 'no' },
          { source: 'high_score', target: 'end' },
          { source: 'low_score', target: 'end' }
        ]
      }

      const execution = {
        id: 'exec-123',
        journey_id: journeyId,
        status: 'pending',
        context: { score: 75 }
      }

      const executor = new JourneyExecutor(journey, execution)
      const emailSpy = jest.spyOn(EmailService.prototype, 'send').mockResolvedValue({ success: true })
      const smsSpy = jest.spyOn(SMSService.prototype, 'send').mockResolvedValue({ success: true })

      await executor.start()

      expect(emailSpy).toHaveBeenCalled()
      expect(smsSpy).not.toHaveBeenCalled()
    })
  })

  describe('Delay Nodes', () => {
    test('Delay node pauses execution', async () => {
      const journey = {
        id: journeyId,
        nodes: [
          { id: 'start', type: 'trigger' },
          { id: 'delay', type: 'delay', data: { delay: 1000 } },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { source: 'start', target: 'delay' },
          { source: 'delay', target: 'end' }
        ]
      }

      const execution = {
        id: 'exec-123',
        journey_id: journeyId,
        status: 'pending'
      }

      const executor = new JourneyExecutor(journey, execution)
      const startTime = Date.now()
      await executor.start()
      const endTime = Date.now()

      expect(endTime - startTime).toBeGreaterThanOrEqual(1000)
    })
  })
})