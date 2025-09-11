import { describe, it, expect, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/forms/route'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } }
      })
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: { id: 'form-123' }, error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null })
    }))
  }))
}))

describe('Forms API', () => {
  describe('POST /api/forms', () => {
    it('should create a new form', async () => {
      const formData = {
        name: 'Test Form',
        fields: [
          { key: 'name', type: 'text', label: 'Name' }
        ]
      }
      
      const request = new NextRequest('http://localhost:3000/api/forms', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.id).toBe('form-123')
    })

    it('should validate form data', async () => {
      const invalidData = {
        // Missing required fields
        fields: []
      }
      
      const request = new NextRequest('http://localhost:3000/api/forms', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const error = await response.json()
      expect(error.message).toContain('validation')
    })
  })

  describe('GET /api/forms', () => {
    it('should retrieve user forms', async () => {
      const request = new NextRequest('http://localhost:3000/api/forms', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/forms')
      
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })
  })
})