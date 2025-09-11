/**
 * WS-159: Task Tracking API Test Suite
 * Comprehensive testing for task status and progress tracking endpoints
 * Using Playwright MCP for real request validation
 * Target: >80% test coverage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { 
  TaskStatusUpdateRequest,
  TaskProgressUpdateRequest,
  TaskStatusUpdateResponse,
  TaskProgressUpdateResponse
} from '@/types/task-tracking';

// Test data setup
const testWeddingId = 'test-wedding-uuid-001';
const testTaskId = 'test-task-uuid-001';
const testAssignmentId = 'test-assignment-uuid-001';
const testUserId = 'test-user-uuid-001';
const testTeamMemberId = 'test-team-member-uuid-001';

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

describe('WS-159: Task Status Update API', () => {
  let authToken: string;
  let supabase: any;

  beforeAll(async () => {
    // Setup test authentication and database records
    supabase = createRouteHandlerClient({ cookies });
    
    // Create test user and team member
    await setupTestData();
    authToken = await getTestAuthToken();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  describe('POST /api/tasks/[id]/status', () => {
    it('should successfully update task status with valid data', async () => {
      const updateRequest: TaskStatusUpdateRequest = {
        assignment_id: testAssignmentId,
        new_status: 'in_progress',
        progress_percentage: 25,
        notes: 'Starting work on this task',
        verification_required: false
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Cookie': `auth-token=${authToken}`
        },
        body: JSON.stringify(updateRequest)
      });

      expect(response.status).toBe(200);
      
      const result: TaskStatusUpdateResponse = await response.json();
      expect(result.success).toBe(true);
      expect(result.task.status).toBe('in_progress');
      expect(result.task.progress_percentage).toBe(25);
      expect(result.notifications_sent).toBeGreaterThan(0);
      expect(result.status_history_id).toBeDefined();
      expect(result.real_time_events_triggered).toContain('task_status_changed');
    });

    it('should reject invalid status transitions', async () => {
      const updateRequest: TaskStatusUpdateRequest = {
        assignment_id: testAssignmentId,
        new_status: 'completed', // Invalid transition from pending
        progress_percentage: 100
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(updateRequest)
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('INVALID_TRANSITION');
      expect(result.valid_transitions).toBeDefined();
    });

    it('should require authentication', async () => {
      const updateRequest: TaskStatusUpdateRequest = {
        assignment_id: testAssignmentId,
        new_status: 'in_progress'
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateRequest)
      });

      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.error).toBe('UNAUTHORIZED');
    });

    it('should validate request body with Zod schema', async () => {
      const invalidRequest = {
        assignment_id: 'invalid-uuid',
        new_status: 'invalid_status',
        progress_percentage: 150 // Invalid: > 100
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(invalidRequest)
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('VALIDATION_ERROR');
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should prevent SQL injection attacks', async () => {
      const maliciousRequest = {
        assignment_id: testAssignmentId,
        new_status: 'in_progress',
        notes: "'; DROP TABLE workflow_tasks; --"
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(maliciousRequest)
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('VALIDATION_ERROR');
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/dangerous SQL patterns/)
        ])
      );
    });

    it('should prevent XSS attacks', async () => {
      const maliciousRequest = {
        assignment_id: testAssignmentId,
        new_status: 'in_progress',
        notes: '<script>alert("XSS")</script>'
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(maliciousRequest)
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('VALIDATION_ERROR');
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/dangerous XSS patterns/)
        ])
      );
    });

    it('should enforce task assignment permissions', async () => {
      const unauthorizedRequest: TaskStatusUpdateRequest = {
        assignment_id: 'unauthorized-assignment-id',
        new_status: 'in_progress'
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(unauthorizedRequest)
      });

      expect(response.status).toBe(403);
      
      const result = await response.json();
      expect(result.error).toBe('FORBIDDEN');
    });

    it('should handle photo evidence upload', async () => {
      const updateRequest: TaskStatusUpdateRequest = {
        assignment_id: testAssignmentId,
        new_status: 'completed',
        progress_percentage: 100,
        completion_photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg'
        ],
        verification_required: true
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(updateRequest)
      });

      expect(response.status).toBe(200);
      
      const result: TaskStatusUpdateResponse = await response.json();
      expect(result.success).toBe(true);
      expect(result.task.status).toBe('completed');
      expect(result.task.progress_percentage).toBe(100);
    });
  });

  describe('GET /api/tasks/[id]/status', () => {
    it('should retrieve task status and history', async () => {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.task_id).toBe(testTaskId);
      expect(result.current_status).toBeDefined();
      expect(result.progress_percentage).toBeGreaterThanOrEqual(0);
      expect(result.status_history).toBeInstanceOf(Array);
    });

    it('should require authentication for status retrieval', async () => {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
      
      const result = await response.json();
      expect(result.error).toBe('UNAUTHORIZED');
    });

    it('should return 404 for non-existent tasks', async () => {
      const response = await fetch(`${API_BASE_URL}/api/tasks/non-existent-task/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(404);
      
      const result = await response.json();
      expect(result.error).toBe('TASK_NOT_FOUND');
    });
  });
});

describe('WS-159: Task Progress Update API', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await getTestAuthToken();
  });

  describe('POST /api/tasks/[id]/progress', () => {
    it('should successfully update task progress', async () => {
      const progressRequest: TaskProgressUpdateRequest = {
        assignment_id: testAssignmentId,
        progress_percentage: 75,
        status_notes: 'Making good progress, almost done',
        milestone_reached: 'Phase 2 completed',
        estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(progressRequest)
      });

      expect(response.status).toBe(200);
      
      const result: TaskProgressUpdateResponse = await response.json();
      expect(result.success).toBe(true);
      expect(result.task.progress_percentage).toBe(75);
      expect(result.progress_history).toBeInstanceOf(Array);
      expect(result.completion_estimate).toBeDefined();
      expect(result.bottleneck_analysis).toBeDefined();
    });

    it('should auto-complete task at 100% progress', async () => {
      const progressRequest: TaskProgressUpdateRequest = {
        assignment_id: testAssignmentId,
        progress_percentage: 100,
        status_notes: 'Task completed successfully'
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(progressRequest)
      });

      expect(response.status).toBe(200);
      
      const result: TaskProgressUpdateResponse = await response.json();
      expect(result.success).toBe(true);
      expect(result.task.progress_percentage).toBe(100);
      expect(result.task.status).toBe('completed');
    });

    it('should validate progress percentage bounds', async () => {
      const invalidRequest = {
        assignment_id: testAssignmentId,
        progress_percentage: 150 // Invalid: > 100
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(invalidRequest)
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('VALIDATION_ERROR');
    });

    it('should prevent progress updates on completed tasks', async () => {
      // First complete the task
      await supabase
        .from('workflow_tasks')
        .update({ status: 'completed', progress_percentage: 100 })
        .eq('id', testTaskId);

      const progressRequest: TaskProgressUpdateRequest = {
        assignment_id: testAssignmentId,
        progress_percentage: 90
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(progressRequest)
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('INVALID_OPERATION');
    });

    it('should detect blocking issues', async () => {
      const progressRequest: TaskProgressUpdateRequest = {
        assignment_id: testAssignmentId,
        progress_percentage: 30,
        blocking_issues: 'Waiting for vendor response'
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(progressRequest)
      });

      expect(response.status).toBe(200);
      
      const result: TaskProgressUpdateResponse = await response.json();
      expect(result.success).toBe(true);
      expect(result.bottleneck_analysis.is_bottleneck).toBeDefined();
    });
  });

  describe('GET /api/tasks/[id]/progress', () => {
    it('should retrieve task progress and analytics', async () => {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/progress`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.task_id).toBe(testTaskId);
      expect(result.current_progress).toBeGreaterThanOrEqual(0);
      expect(result.progress_history).toBeInstanceOf(Array);
      expect(result.completion_estimate).toBeDefined();
      expect(result.bottleneck_analysis).toBeDefined();
    });

    it('should calculate completion estimates', async () => {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/progress`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const result = await response.json();
      expect(result.completion_estimate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

describe('WS-159: Security and Performance Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await getTestAuthToken();
  });

  it('should enforce rate limiting', async () => {
    const requests = Array(15).fill(0).map(() => 
      fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          assignment_id: testAssignmentId,
          new_status: 'in_progress'
        })
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    
    expect(rateLimited).toBe(true);
  });

  it('should respond within performance requirements (<200ms)', async () => {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(200);
  });

  it('should handle concurrent updates safely', async () => {
    const concurrentUpdates = Array(5).fill(0).map((_, index) => 
      fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          assignment_id: testAssignmentId,
          progress_percentage: 10 + index * 10
        })
      })
    );

    const responses = await Promise.all(concurrentUpdates);
    const successCount = responses.filter(r => r.status === 200).length;
    
    expect(successCount).toBeGreaterThan(0);
  });
});

describe('WS-159: Real-time Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await getTestAuthToken();
  });

  it('should trigger real-time events on status updates', async () => {
    // Setup Supabase Realtime listener
    const realtimeEvents: any[] = [];
    
    const channel = supabase
      .channel(`wedding:${testWeddingId}`)
      .on('broadcast', { event: 'task_status_updated' }, (payload: any) => {
        realtimeEvents.push(payload);
      })
      .subscribe();

    // Update task status
    await fetch(`${API_BASE_URL}/api/tasks/${testTaskId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        assignment_id: testAssignmentId,
        new_status: 'in_progress',
        progress_percentage: 50
      })
    });

    // Wait for real-time event
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(realtimeEvents.length).toBeGreaterThan(0);
    expect(realtimeEvents[0].payload.type).toBe('task_status_changed');
    expect(realtimeEvents[0].payload.task_id).toBe(testTaskId);

    await channel.unsubscribe();
  });
});

// Test helper functions
async function setupTestData() {
  // Create test wedding
  await supabase
    .from('weddings')
    .upsert({
      id: testWeddingId,
      couple_name: 'Test Couple',
      wedding_date: '2024-06-01',
      status: 'active'
    }, { onConflict: 'id' });

  // Create test team member
  await supabase
    .from('team_members')
    .upsert({
      id: testTeamMemberId,
      user_id: testUserId,
      name: 'Test User',
      email: 'test@example.com',
      role: 'coordinator'
    }, { onConflict: 'id' });

  // Create test task
  await supabase
    .from('workflow_tasks')
    .upsert({
      id: testTaskId,
      title: 'Test Task',
      wedding_id: testWeddingId,
      category: 'venue_management',
      priority: 'medium',
      status: 'pending',
      assigned_to: testTeamMemberId,
      created_by: testTeamMemberId,
      assigned_by: testTeamMemberId,
      estimated_duration: 8,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      progress_percentage: 0
    }, { onConflict: 'id' });

  // Create test assignment
  await supabase
    .from('task_assignments')
    .upsert({
      id: testAssignmentId,
      task_id: testTaskId,
      assigned_to: testTeamMemberId,
      assigned_by: testTeamMemberId,
      is_primary: true
    }, { onConflict: 'id' });
}

async function cleanupTestData() {
  await supabase.from('task_assignments').delete().eq('id', testAssignmentId);
  await supabase.from('task_progress_history').delete().eq('task_id', testTaskId);
  await supabase.from('task_photo_evidence').delete().eq('task_id', testTaskId);
  await supabase.from('task_status_history').delete().eq('task_id', testTaskId);
  await supabase.from('workflow_tasks').delete().eq('id', testTaskId);
  await supabase.from('team_members').delete().eq('id', testTeamMemberId);
  await supabase.from('weddings').delete().eq('id', testWeddingId);
}

async function getTestAuthToken(): Promise<string> {
  // In a real test environment, this would authenticate with Supabase
  // For now, return a mock token
  return 'mock-auth-token-for-testing';
}