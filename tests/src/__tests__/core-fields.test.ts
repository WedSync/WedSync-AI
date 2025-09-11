import { describe, it, expect, beforeEach } from '@jest/globals'
import { 
  CoreFieldsManager, 
  CoreFieldState,
  CoreFieldType 
} from '@/lib/core-fields'

describe('Core Fields System', () => {
  let manager: CoreFieldsManager
  
  beforeEach(() => {
    manager = new CoreFieldsManager()
  })

  describe('Field State Management', () => {
    it('should initialize fields with pending state', () => {
      const field = manager.getField('wedding_date')
      expect(field).toBeUndefined()
      expect(manager.getFieldState()).toBe(CoreFieldState.PENDING)
    })

    it('should update field state to completed when value is set', () => {
      manager.setField(CoreFieldType.WEDDING_DATE, '2025-06-15')
      manager.setField(CoreFieldType.VENUE_NAME, 'The Barn at Grimsby')
      manager.setField(CoreFieldType.GUEST_COUNT, 150)
      manager.setField(CoreFieldType.EMAIL, 'couple@example.com')
      manager.setField(CoreFieldType.COUPLE_NAME_1, 'John Smith')
      manager.setField(CoreFieldType.COUPLE_NAME_2, 'Jane Doe')
      
      expect(manager.getFieldState()).toBe(CoreFieldState.COMPLETED)
      expect(manager.getField(CoreFieldType.WEDDING_DATE)).toBe('2025-06-15')
    })

    it('should mark field as partial when incomplete', () => {
      manager.setField(CoreFieldType.GUEST_COUNT, 100)
      manager.setField(CoreFieldType.VENUE_NAME, 'Test Venue')
      
      expect(manager.getFieldState()).toBe(CoreFieldState.PARTIAL)
    })

    it('should propagate core fields to connected forms', () => {
      const formId = 'test-form-123'
      let propagatedValue: any = null
      let propagatedField: any = null
      
      manager.connectForm({
        formId,
        fields: [CoreFieldType.VENUE_NAME],
        callback: (field, value) => {
          propagatedField = field
          propagatedValue = value
        }
      })
      
      manager.setField(CoreFieldType.VENUE_NAME, 'The Barn at Grimsby')
      
      expect(propagatedField).toBe(CoreFieldType.VENUE_NAME)
      expect(propagatedValue).toBe('The Barn at Grimsby')
    })
  })

  describe('Field Validation', () => {
    it('should validate email format', () => {
      const invalidResult = manager.validateField(CoreFieldType.EMAIL, 'not-an-email')
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.error).toContain('Invalid email')
      
      const validResult = manager.validateField(CoreFieldType.EMAIL, 'couple@example.com')
      expect(validResult.isValid).toBe(true)
    })

    it('should validate date format', () => {
      const invalidResult = manager.validateField(CoreFieldType.WEDDING_DATE, '2025-13-45')
      expect(invalidResult.isValid).toBe(false)
      
      const validResult = manager.validateField(CoreFieldType.WEDDING_DATE, '2025-06-15')
      expect(validResult.isValid).toBe(true)
    })

    it('should validate guest count ranges', () => {
      const validResult = manager.validateField(CoreFieldType.GUEST_COUNT, 150)
      expect(validResult.isValid).toBe(true)
      
      const invalidResult = manager.validateField(CoreFieldType.GUEST_COUNT, -5)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.error).toContain('at least 1')
    })

    it('should reject invalid guest count types', () => {
      const result = manager.setField(CoreFieldType.GUEST_COUNT, 'not a number' as any)
      expect(result).toBe(false)
      
      const errors = manager.getValidationErrors()
      expect(errors.has(CoreFieldType.GUEST_COUNT)).toBe(true)
    })
  })

  describe('Form Connection Management', () => {
    it('should connect and disconnect forms', () => {
      const formId = 'test-form'
      const callback = jest.fn()
      
      manager.connectForm({
        formId,
        fields: [CoreFieldType.WEDDING_DATE, CoreFieldType.VENUE_NAME],
        callback
      })
      
      const connectedForms = manager.getConnectedForms()
      expect(connectedForms.has(formId)).toBe(true)
      
      const disconnected = manager.disconnectForm(formId)
      expect(disconnected).toBe(true)
      
      const afterDisconnect = manager.getConnectedForms()
      expect(afterDisconnect.has(formId)).toBe(false)
    })

    it('should handle multiple form connections with priority', () => {
      const callOrder: string[] = []
      
      manager.connectForm({
        formId: 'form-low',
        fields: [CoreFieldType.WEDDING_DATE],
        callback: () => callOrder.push('low'),
        priority: 1
      })
      
      manager.connectForm({
        formId: 'form-high',
        fields: [CoreFieldType.WEDDING_DATE],
        callback: () => callOrder.push('high'),
        priority: 10
      })
      
      manager.setField(CoreFieldType.WEDDING_DATE, '2025-06-15')
      
      expect(callOrder).toEqual(['high', 'low'])
    })

    it('should throw error for invalid form connection', () => {
      expect(() => {
        manager.connectForm({
          formId: '',
          fields: [],
          callback: jest.fn()
        })
      }).toThrow('Form ID is required')
    })
  })

  describe('Bulk Operations', () => {
    it('should update multiple fields at once', () => {
      const updates = {
        wedding_date: '2025-06-15',
        venue_name: 'Test Venue',
        guest_count: 100
      }
      
      const results = manager.updateFields(updates)
      
      expect(results.get(CoreFieldType.WEDDING_DATE)).toBe(true)
      expect(results.get(CoreFieldType.VENUE_NAME)).toBe(true)
      expect(results.get(CoreFieldType.GUEST_COUNT)).toBe(true)
      
      expect(manager.getField(CoreFieldType.WEDDING_DATE)).toBe('2025-06-15')
      expect(manager.getField(CoreFieldType.VENUE_NAME)).toBe('Test Venue')
      expect(manager.getField(CoreFieldType.GUEST_COUNT)).toBe(100)
    })

    it('should clear all fields', () => {
      manager.setField(CoreFieldType.WEDDING_DATE, '2025-06-15')
      manager.setField(CoreFieldType.VENUE_NAME, 'Test Venue')
      
      manager.clearAllFields()
      
      expect(manager.getField(CoreFieldType.WEDDING_DATE)).toBeUndefined()
      expect(manager.getField(CoreFieldType.VENUE_NAME)).toBeUndefined()
      expect(manager.getFieldState()).toBe(CoreFieldState.PENDING)
    })
  })

  describe('Data Import/Export', () => {
    it('should export and import data correctly', () => {
      manager.setField(CoreFieldType.WEDDING_DATE, '2025-06-15')
      manager.setField(CoreFieldType.VENUE_NAME, 'Test Venue')
      
      const exported = manager.exportData()
      
      expect(exported.fields.wedding_date).toBe('2025-06-15')
      expect(exported.fields.venue_name).toBe('Test Venue')
      expect(exported.state).toBe(CoreFieldState.PARTIAL)
      
      const newManager = new CoreFieldsManager()
      const imported = newManager.importData({
        fields: exported.fields
      })
      
      expect(imported).toBe(true)
      expect(newManager.getField(CoreFieldType.WEDDING_DATE)).toBe('2025-06-15')
      expect(newManager.getField(CoreFieldType.VENUE_NAME)).toBe('Test Venue')
    })

    it('should handle invalid import data', () => {
      const result = manager.importData({
        fields: {
          wedding_date: 'invalid-date-format-that-will-fail-parse',
          guest_count: -1000 as any
        }
      })
      
      expect(result).toBe(false)
    })
  })
})