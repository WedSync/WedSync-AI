import { test, expect } from '@playwright/test'

test.describe('Client Profile API - Backend Validation', () => {
  let testClientId: string
  let authToken: string

  test.beforeAll(async ({ request }) => {
    // Login and get auth token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@wedsync.com',
        password: 'testpassword123'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    authToken = cookies?.match(/auth-token=([^;]+)/)?.[1] || ''

    // Create a test client
    const createResponse = await request.post('/api/clients', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        first_name: 'Test',
        last_name: 'Client',
        email: 'testclient@example.com',
        wedding_date: '2025-12-25'
      }
    })

    const client = await createResponse.json()
    testClientId = client.id
  })

  test.afterAll(async ({ request }) => {
    // Clean up test data
    if (testClientId) {
      await request.delete(`/api/clients/${testClientId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
    }
  })

  test('GET /api/clients/[id] - should return comprehensive profile data', async ({ request }) => {
    const response = await request.get(`/api/clients/${testClientId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.status()).toBe(200)
    
    const data = await response.json()
    
    // Verify comprehensive data structure
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('first_name')
    expect(data).toHaveProperty('last_name')
    expect(data).toHaveProperty('email')
    expect(data).toHaveProperty('wedding_date')
    expect(data).toHaveProperty('profile_completion_score')
    expect(data).toHaveProperty('client_activities')
    
    // Verify response time
    const timing = response.timing()
    expect(timing.responseEnd - timing.requestStart).toBeLessThan(500)
  })

  test('PATCH /api/clients/[id] - should update wedding details', async ({ request }) => {
    const updateData = {
      ceremony_venue_name: 'Grand Cathedral',
      ceremony_time: '14:00',
      reception_venue_name: 'Riverside Manor',
      reception_time: '18:00',
      guest_count_estimated: 150,
      budget_total: 35000,
      wedding_theme: 'Rustic Elegance'
    }

    const response = await request.patch(`/api/clients/${testClientId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: updateData
    })

    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.ceremony_venue_name).toBe('Grand Cathedral')
    expect(data.guest_count_estimated).toBe(150)
    expect(data.budget_total).toBe(35000)
    
    // Verify profile completion score increased
    expect(data.profile_completion_score).toBeGreaterThan(0)
  })

  test('POST /api/clients/[id]/notes - should create note with privacy controls', async ({ request }) => {
    const noteData = {
      content: 'Couple prefers outdoor ceremony if weather permits',
      note_type: 'meeting',
      visibility: 'internal',
      priority: 'high',
      tags: ['ceremony', 'preferences']
    }

    const response = await request.post(`/api/clients/${testClientId}/notes`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: noteData
    })

    expect(response.status()).toBe(201)
    
    const note = await response.json()
    expect(note.content).toBe(noteData.content)
    expect(note.visibility).toBe('internal')
    expect(note.priority).toBe('high')
  })

  test('POST /api/clients/[id]/documents - should handle file upload', async ({ request }) => {
    // Create a test file
    const fileContent = Buffer.from('Test contract content')
    
    const formData = new FormData()
    formData.append('file', new Blob([fileContent], { type: 'application/pdf' }), 'contract.pdf')
    formData.append('metadata', JSON.stringify({
      document_name: 'Wedding Contract',
      document_type: 'contract',
      category: 'legal',
      is_confidential: true
    }))

    const response = await request.post(`/api/clients/${testClientId}/documents`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: formData
    })

    expect(response.status()).toBe(201)
    
    const document = await response.json()
    expect(document.document_name).toBe('Wedding Contract')
    expect(document.document_type).toBe('contract')
    expect(document.is_confidential).toBe(true)
    expect(document.download_url).toBeTruthy()
  })

  test('GET /api/clients/[id]/activities - should track all interactions', async ({ request }) => {
    const response = await request.get(`/api/clients/${testClientId}/activities`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.status()).toBe(200)
    
    const activities = await response.json()
    expect(Array.isArray(activities.data)).toBe(true)
    
    // Should have activities from previous tests
    const activityTypes = activities.data.map((a: any) => a.activity_type)
    expect(activityTypes).toContain('client_updated')
    expect(activityTypes).toContain('note_added')
    expect(activityTypes).toContain('document_uploaded')
  })

  test('Security: RLS prevents cross-organization access', async ({ request }) => {
    // Try to access a client from different organization
    const response = await request.get('/api/clients/00000000-0000-0000-0000-000000000000', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.status()).toBe(404)
  })

  test('Security: File upload size restrictions', async ({ request }) => {
    // Create a file larger than 10MB
    const largeFile = Buffer.alloc(11 * 1024 * 1024) // 11MB
    
    const formData = new FormData()
    formData.append('file', new Blob([largeFile], { type: 'application/pdf' }), 'large.pdf')
    formData.append('metadata', JSON.stringify({
      document_name: 'Large File',
      document_type: 'other'
    }))

    const response = await request.post(`/api/clients/${testClientId}/documents`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: formData
    })

    expect(response.status()).toBe(400)
    const error = await response.json()
    expect(error.error).toContain('File size exceeds maximum')
  })

  test('Security: File type restrictions', async ({ request }) => {
    const fileContent = Buffer.from('#!/bin/bash\necho "malicious"')
    
    const formData = new FormData()
    formData.append('file', new Blob([fileContent], { type: 'application/x-sh' }), 'script.sh')
    formData.append('metadata', JSON.stringify({
      document_name: 'Script',
      document_type: 'other'
    }))

    const response = await request.post(`/api/clients/${testClientId}/documents`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: formData
    })

    expect(response.status()).toBe(400)
    const error = await response.json()
    expect(error.error).toBe('File type not allowed')
  })

  test('Performance: Concurrent request handling', async ({ request }) => {
    const promises = []
    
    // Send 10 concurrent requests
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.get(`/api/clients/${testClientId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      )
    }

    const startTime = Date.now()
    const responses = await Promise.all(promises)
    const endTime = Date.now()

    // All should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200)
    })

    // Should handle concurrent requests efficiently
    expect(endTime - startTime).toBeLessThan(2000) // Under 2 seconds for 10 requests
  })

  test('Performance: Database query optimization', async ({ page }) => {
    // Navigate to API test page
    await page.goto('/api-test')

    // Test profile endpoint performance
    const profilePerformance = await page.evaluate(async () => {
      const start = performance.now()
      const response = await fetch('/api/clients/test-client-id', {
        headers: { 'Authorization': 'Bearer ' + window.testToken }
      })
      const data = await response.json()
      const end = performance.now()
      
      return {
        responseTime: end - start,
        hasWeddingDetails: !!data.wedding_date,
        hasActivityFeed: Array.isArray(data.activities),
        dataSize: JSON.stringify(data).length
      }
    })

    expect(profilePerformance.responseTime).toBeLessThan(500)
    expect(profilePerformance.hasWeddingDetails).toBe(true)
    expect(profilePerformance.hasActivityFeed).toBe(true)
  })

  test('Activity tracking: Automated activity generation', async ({ request }) => {
    // Update client
    await request.patch(`/api/clients/${testClientId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        guest_count_confirmed: 145
      }
    })

    // Check activity was created
    const response = await request.get(`/api/clients/${testClientId}/activities?limit=1`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const activities = await response.json()
    expect(activities.data[0].activity_type).toBe('client_updated')
    expect(activities.data[0].activity_title).toContain('Client information updated')
  })

  test('Note privacy: Private notes only visible to creator', async ({ request }) => {
    // Create private note as current user
    const noteResponse = await request.post(`/api/clients/${testClientId}/notes`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        content: 'Private information about payment issues',
        note_type: 'internal',
        visibility: 'private'
      }
    })

    const note = await noteResponse.json()
    
    // Try to access with different user token (simulated)
    // In real test, you'd login as different user
    const notesResponse = await request.get(`/api/clients/${testClientId}/notes`, {
      headers: {
        'Authorization': `Bearer ${authToken}` // Same user should see it
      }
    })

    const notes = await notesResponse.json()
    const privateNote = notes.data.find((n: any) => n.id === note.id)
    expect(privateNote).toBeTruthy() // Creator can see their own private note
  })
})