import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { 
  JourneyEngine,
  JourneyModule,
  ModuleType,
  JourneyTrigger 
} from '@/lib/journey/engine'

describe('Customer Journey Engine', () => {
  let engine: JourneyEngine
  
  beforeEach(() => {
    engine = new JourneyEngine()
    jest.clearAllMocks()
  })

  describe('Journey Execution', () => {
    it('should execute modules in sequence', async () => {
      const journey = {
        id: 'test-journey',
        name: 'Onboarding Journey',
        modules: [
          {
            id: 'welcome-email',
            type: ModuleType.EMAIL,
            trigger: { type: 'immediate' },
            config: { templateId: 'welcome' }
          },
          {
            id: 'form-request',
            type: ModuleType.FORM,
            trigger: { type: 'delay', days: 1 },
            config: { formId: 'timeline-form' }
          }
        ]
      }
      
      const result = await engine.startJourney(journey, 'client-123')
      
      expect(result.status).toBe('active')
      expect(result.currentModule).toBe('welcome-email')
      expect(result.executedModules).toHaveLength(1)
    })

    it('should handle conditional logic', async () => {
      const journey = {
        id: 'conditional-journey',
        modules: [
          {
            id: 'check-venue',
            type: ModuleType.CONDITION,
            config: {
              condition: 'venue_type === "outdoor"',
              trueBranch: 'weather-info',
              falseBranch: 'indoor-info'
            }
          }
        ]
      }
      
      const context = {
        clientId: 'client-123',
        data: { venue_type: 'outdoor' }
      }
      
      const result = await engine.executeModule(journey.modules[0], context)
      
      expect(result.nextModule).toBe('weather-info')
    })

    it('should respect timing triggers', async () => {
      const module = {
        id: 'delayed-email',
        type: ModuleType.EMAIL,
        trigger: {
          type: 'relative',
          reference: 'wedding_date',
          offset: -30, // 30 days before
          unit: 'days'
        }
      }
      
      const context = {
        wedding_date: '2025-06-15',
        current_date: '2025-05-16'
      }
      
      const shouldExecute = engine.shouldExecuteModule(module, context)
      expect(shouldExecute).toBe(true)
      
      const contextEarly = {
        wedding_date: '2025-06-15',
        current_date: '2025-04-01'
      }
      
      const shouldNotExecute = engine.shouldExecuteModule(module, contextEarly)
      expect(shouldNotExecute).toBe(false)
    })
  })

  describe('Module Validation', () => {
    it('should validate email module configuration', () => {
      const validModule = {
        type: ModuleType.EMAIL,
        config: {
          templateId: 'welcome',
          subject: 'Welcome!',
          from: 'noreply@wedsync.ai'
        }
      }
      
      expect(engine.validateModule(validModule)).toBe(true)
      
      const invalidModule = {
        type: ModuleType.EMAIL,
        config: {
          // Missing required templateId
          subject: 'Welcome!'
        }
      }
      
      expect(engine.validateModule(invalidModule)).toBe(false)
    })

    it('should validate form module dependencies', () => {
      const module = {
        type: ModuleType.FORM,
        config: {
          formId: 'timeline-form',
          required: true
        }
      }
      
      const validation = engine.validateModuleDependencies(module)
      expect(validation.valid).toBe(true)
      expect(validation.dependencies).toContain('form:timeline-form')
    })
  })
})