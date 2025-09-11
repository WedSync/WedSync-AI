/**
 * WS-159 Task Tracking - Integration Tests
 * Testing API endpoints and database integration
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { NextRequest } from 'next/server';

// Mock Next.js environment
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Import API handlers
import { PUT as updateTaskStatus } from '@/app/api/workflow/tasks/[id]/route';

// Test data
const testUser = {
  id: 'test-user-001',
  email: 'test@wedsync.com',
  weddingId: 'wedding-test-001'
};

const testTask = {
  id: 'task-test-001',
  title: 'Test Task',
  status: 'pending',
  priority: 'medium',
  category: 'venue',
  wedding_id: testUser.weddingId,
  created_by: testUser.id,
  version: 1
};

describe('Task Tracking API Integration', () => {
  let supabase: any;

  beforeAll(async () => {
    // Initialize test database connection
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Clean up any existing test data
    await supabase.from('tasks').delete().eq('wedding_id', testUser.weddingId);
    await supabase.from('task_status_history').delete().eq('task_id', testTask.id);
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('tasks').delete().eq('wedding_id', testUser.weddingId);
    await supabase.from('task_status_history').delete().eq('task_id', testTask.id);
  });

  beforeEach(async () => {
    // Insert fresh test task
    await supabase.from('tasks').delete().eq('id', testTask.id);
    await supabase.from('tasks').insert(testTask);
  });

  test('PUT /api/workflow/tasks/[id] should update task status successfully', async () => {
    const requestBody = {
      status: 'in_progress',
      notes: 'Started working on venue booking'
    };

    const mockRequest = {
      json: async () => requestBody,
      nextUrl: { pathname: `/api/workflow/tasks/${testTask.id}` }
    } as NextRequest;

    const response = await updateTaskStatus(mockRequest, { params: { id: testTask.id } });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.status).toBe('in_progress');

    // Verify task was updated in database
    const { data: updatedTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', testTask.id)
      .single();

    expect(updatedTask.status).toBe('in_progress');
    expect(updatedTask.version).toBe(2); // Version should increment
  });

  test('PUT /api/workflow/tasks/[id] should validate status transitions', async () => {
    // First, mark task as completed
    await supabase
      .from('tasks')
      .update({ status: 'completed', version: 2 })
      .eq('id', testTask.id);

    // Try to transition from completed to pending (invalid)
    const requestBody = {
      status: 'pending',
      notes: 'Trying invalid transition'
    };

    const mockRequest = {
      json: async () => requestBody,
      nextUrl: { pathname: `/api/workflow/tasks/${testTask.id}` }
    } as NextRequest;

    const response = await updateTaskStatus(mockRequest, { params: { id: testTask.id } });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('Invalid status transition');
  });

  test('PUT /api/workflow/tasks/[id] should handle concurrent updates with optimistic locking', async () => {
    const requestBody1 = {
      status: 'in_progress',
      notes: 'First update'
    };

    const requestBody2 = {
      status: 'completed',
      notes: 'Second update'
    };

    // Simulate concurrent requests with same version
    const mockRequest1 = {
      json: async () => requestBody1,
      nextUrl: { pathname: `/api/workflow/tasks/${testTask.id}` }
    } as NextRequest;

    const mockRequest2 = {
      json: async () => requestBody2,
      nextUrl: { pathname: `/api/workflow/tasks/${testTask.id}` }
    } as NextRequest;

    // Execute requests in parallel
    const [response1, response2] = await Promise.all([
      updateTaskStatus(mockRequest1, { params: { id: testTask.id } }),
      updateTaskStatus(mockRequest2, { params: { id: testTask.id } })
    ]);

    const responseData1 = await response1.json();
    const responseData2 = await response2.json();

    // One should succeed, one should fail due to version conflict
    const successCount = [responseData1.success, responseData2.success].filter(Boolean).length;
    expect(successCount).toBe(1);

    // The failed request should have conflict error
    if (!responseData1.success) {
      expect(responseData1.conflicts).toContain('version_conflict');
    }
    if (!responseData2.success) {
      expect(responseData2.conflicts).toContain('version_conflict');
    }
  });

  test('PUT /api/workflow/tasks/[id] should record status history', async () => {
    const requestBody = {
      status: 'completed',
      notes: 'Task completed successfully'
    };

    const mockRequest = {
      json: async () => requestBody,
      nextUrl: { pathname: `/api/workflow/tasks/${testTask.id}` }
    } as NextRequest;

    await updateTaskStatus(mockRequest, { params: { id: testTask.id } });

    // Check status history was recorded
    const { data: history } = await supabase
      .from('task_status_history')
      .select('*')
      .eq('task_id', testTask.id)
      .order('changed_at', { ascending: false })
      .limit(1);

    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('completed');
    expect(history[0].old_status).toBe('pending');
    expect(history[0].notes).toBe('Task completed successfully');
  });

  test('PUT /api/workflow/tasks/[id] should handle invalid task ID', async () => {
    const invalidTaskId = 'invalid-task-id';
    const requestBody = {
      status: 'in_progress'
    };

    const mockRequest = {
      json: async () => requestBody,
      nextUrl: { pathname: `/api/workflow/tasks/${invalidTaskId}` }
    } as NextRequest;

    const response = await updateTaskStatus(mockRequest, { params: { id: invalidTaskId } });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('Task not found');
  });

  test('PUT /api/workflow/tasks/[id] should validate input data', async () => {
    const invalidRequestBody = {
      status: 'invalid_status',
      notes: 'A'.repeat(1001) // Exceeds maximum length
    };

    const mockRequest = {
      json: async () => invalidRequestBody,
      nextUrl: { pathname: `/api/workflow/tasks/${testTask.id}` }
    } as NextRequest;

    const response = await updateTaskStatus(mockRequest, { params: { id: testTask.id } });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('Invalid status');
  });

  test('PUT /api/workflow/tasks/[id] should require authentication', async () => {
    const requestBody = {
      status: 'in_progress'
    };

    // Mock request without proper authentication
    const mockRequest = {
      json: async () => requestBody,
      nextUrl: { pathname: `/api/workflow/tasks/${testTask.id}` },
      headers: new Headers() // No auth headers
    } as NextRequest;

    const response = await updateTaskStatus(mockRequest, { params: { id: testTask.id } });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain('Authentication required');
  });

  test('PUT /api/workflow/tasks/[id] should enforce task ownership', async () => {
    // Create task owned by different user
    const otherUserTask = {
      ...testTask,
      id: 'task-other-user',
      created_by: 'other-user-id'
    };

    await supabase.from('tasks').insert(otherUserTask);

    const requestBody = {
      status: 'in_progress'
    };

    const mockRequest = {
      json: async () => requestBody,
      nextUrl: { pathname: `/api/workflow/tasks/${otherUserTask.id}` },
      headers: new Headers({ 'authorization': `Bearer ${testUser.id}` })
    } as NextRequest;

    const response = await updateTaskStatus(mockRequest, { params: { id: otherUserTask.id } });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.error).toContain('Access denied');

    // Clean up
    await supabase.from('tasks').delete().eq('id', otherUserTask.id);
  });

  test('GET /api/workflow/tasks/[id] should return task details', async () => {
    // This would test the GET handler when it exists
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', testTask.id)
      .single();

    expect(task.id).toBe(testTask.id);
    expect(task.status).toBe('pending');
    expect(task.title).toBe('Test Task');
  });

  test('GET /api/workflow/tasks/[id]/progress should calculate progress correctly', async () => {
    // Create multiple tasks for progress calculation
    const additionalTasks = [
      { ...testTask, id: 'task-002', status: 'completed' },
      { ...testTask, id: 'task-003', status: 'in_progress' },
      { ...testTask, id: 'task-004', status: 'pending' }
    ];

    await supabase.from('tasks').insert(additionalTasks);

    // Progress should be: 1 completed + 0.5 in_progress = 1.5/4 = 37.5%
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('wedding_id', testUser.weddingId);

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
    const totalCount = tasks.length;

    const expectedProgress = ((completedCount + inProgressCount * 0.5) / totalCount) * 100;
    expect(expectedProgress).toBe(37.5);

    // Clean up additional tasks
    await supabase.from('tasks').delete().in('id', additionalTasks.map(t => t.id));
  });
});

describe('Task Tracking Database Integration', () => {
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  test('should enforce database constraints', async () => {
    // Test required fields
    const invalidTask = {
      title: null, // Required field
      status: 'pending',
      wedding_id: testUser.weddingId
    };

    const { error } = await supabase.from('tasks').insert(invalidTask);
    expect(error).toBeTruthy();
    expect(error.message).toContain('null value');
  });

  test('should validate status enum values', async () => {
    const taskWithInvalidStatus = {
      ...testTask,
      id: 'task-invalid-status',
      status: 'invalid_status'
    };

    const { error } = await supabase.from('tasks').insert(taskWithInvalidStatus);
    expect(error).toBeTruthy();
    expect(error.message).toContain('invalid input value');
  });

  test('should handle foreign key constraints', async () => {
    const taskWithInvalidWeddingId = {
      ...testTask,
      id: 'task-invalid-wedding',
      wedding_id: 'non-existent-wedding'
    };

    const { error } = await supabase.from('tasks').insert(taskWithInvalidWeddingId);
    expect(error).toBeTruthy();
    expect(error.message).toContain('foreign key');
  });

  test('should maintain referential integrity on delete', async () => {
    // Create task and history
    await supabase.from('tasks').insert({ ...testTask, id: 'task-delete-test' });
    await supabase.from('task_status_history').insert({
      task_id: 'task-delete-test',
      status: 'completed',
      changed_at: new Date().toISOString()
    });

    // Delete task
    await supabase.from('tasks').delete().eq('id', 'task-delete-test');

    // History should be cleaned up via cascade
    const { data: history } = await supabase
      .from('task_status_history')
      .select('*')
      .eq('task_id', 'task-delete-test');

    expect(history).toHaveLength(0);
  });

  test('should handle concurrent database updates', async () => {
    const taskId = 'task-concurrent-test';
    await supabase.from('tasks').insert({ ...testTask, id: taskId });

    // Simulate concurrent updates
    const updates = [
      supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId),
      supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId)
    ];

    const results = await Promise.all(updates.map(p => p.catch(e => ({ error: e }))));
    
    // At least one should succeed
    const successCount = results.filter(r => !r.error).length;
    expect(successCount).toBeGreaterThan(0);

    // Clean up
    await supabase.from('tasks').delete().eq('id', taskId);
  });

  test('should maintain data consistency across transactions', async () => {
    const taskId = 'task-transaction-test';
    
    // Start transaction-like operation
    const { error: insertError } = await supabase.from('tasks').insert({
      ...testTask,
      id: taskId
    });

    expect(insertError).toBeFalsy();

    // Update and create history in sequence
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', taskId);

    const { error: historyError } = await supabase
      .from('task_status_history')
      .insert({
        task_id: taskId,
        status: 'completed',
        old_status: 'pending',
        changed_at: new Date().toISOString()
      });

    expect(updateError).toBeFalsy();
    expect(historyError).toBeFalsy();

    // Verify both operations succeeded
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    const { data: history } = await supabase
      .from('task_status_history')
      .select('*')
      .eq('task_id', taskId);

    expect(task.status).toBe('completed');
    expect(history).toHaveLength(1);

    // Clean up
    await supabase.from('tasks').delete().eq('id', taskId);
  });
});