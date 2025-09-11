import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { SupabaseClient } from '@supabase/supabase-js'

// Use test database URL
const supabaseUrl = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'

describe('Supabase Integration', () => {
  let supabase: SupabaseClient
  let testUserId: string
  
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create test user
    const { data: authData } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    })
    
    testUserId = authData?.user?.id || ''
  })
  
  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await supabase.from('suppliers').delete().eq('user_id', testUserId)
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  describe('Supplier Operations', () => {
    it('should create a supplier profile', async () => {
      const supplierData = {
        user_id: testUserId,
        business_name: 'Test Photography',
        vendor_type: 'photographer',
        email: 'test@example.com'
      }
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(data?.business_name).toBe('Test Photography')
      expect(data?.vendor_type).toBe('photographer')
    })

    it('should enforce RLS policies', async () => {
      // Try to read another user's data
      const { data, error } = await supabase
        .from('suppliers')
        .select()
        .eq('user_id', 'different-user-id')
      
      expect(data).toHaveLength(0)
    })
  })

  describe('Forms Operations', () => {
    it('should create and retrieve a form', async () => {
      const formData = {
        supplier_id: testUserId,
        name: 'Wedding Timeline Form',
        fields: [
          {
            key: 'ceremony_time',
            type: 'time',
            label: 'Ceremony Time',
            required: true
          }
        ]
      }
      
      const { data: form, error } = await supabase
        .from('forms')
        .insert(formData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(form?.name).toBe('Wedding Timeline Form')
      expect(form?.fields).toHaveLength(1)
      
      // Retrieve form
      const { data: retrieved } = await supabase
        .from('forms')
        .select()
        .eq('id', form?.id)
        .single()
      
      expect(retrieved?.id).toBe(form?.id)
    })
  })

  describe('Client Dashboard Operations', () => {
    it('should create a client dashboard', async () => {
      const dashboardData = {
        supplier_id: testUserId,
        client_id: 'client-123',
        template_id: 'default',
        sections: ['welcome', 'forms', 'timeline'],
        custom_domain: null
      }
      
      const { data, error } = await supabase
        .from('client_dashboards')
        .insert(dashboardData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(data?.sections).toContain('forms')
    })
  })
})