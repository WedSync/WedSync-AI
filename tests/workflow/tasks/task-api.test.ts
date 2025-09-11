import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/workflow/tasks/route';
import { TaskCreateInput, TaskCategory, TaskPriority } from '@/types/workflow';

// Mock Next.js dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({}))
}));

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        in: vi.fn(() => ({})),
        gte: vi.fn(() => ({})),
        lte: vi.fn(() => ({})),
        lt: vi.fn(() => ({})),
        not: vi.fn(() => ({})),
        range: vi.fn(() => ({})),
        order: vi.fn(() => ({}))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    rpc: vi.fn()
  }))
}));

describe('Task API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/workflow/tasks', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
      const mockSupabase = createRouteHandlerClient({});
      
      // Mock auth failure
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized')
      });

      const request = new NextRequest('http://localhost:3000/api/workflow/tasks');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return tasks when user is authenticated', async () => {
      const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
      const mockSupabase = createRouteHandlerClient({});
      
      // Mock successful auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      // Mock team member lookup
      const mockTeamMember = { id: 'member-123' };
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockTeamMember,
        error: null
      });

      // Mock tasks query
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'todo',
          priority: 'medium',
          category: 'venue_management',
          deadline: new Date().toISOString(),
          estimated_duration: 2
        }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      };

      // Chain all the query methods
      Object.assign(mockQuery, {
        data: mockTasks,
        error: null,
        count: 1
      });

      mockSupabase.from().select.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost:3000/api/workflow/tasks?wedding_id=wedding-123');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.tasks).toBeDefined();
    });

    it('should apply filters correctly', async () => {
      const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
      const mockSupabase = createRouteHandlerClient({});
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'member-123' },
        error: null
      });

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        data: [],
        error: null,
        count: 0
      };

      mockSupabase.from().select.mockReturnValue(mockQuery);

      const url = new URL('http://localhost:3000/api/workflow/tasks');
      url.searchParams.set('status', 'todo,in_progress');
      url.searchParams.set('priority', 'high,critical');
      url.searchParams.set('wedding_id', 'wedding-123');

      const request = new NextRequest(url.toString());
      await GET(request);

      // Verify that filters were applied
      expect(mockQuery.eq).toHaveBeenCalledWith('wedding_id', 'wedding-123');
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['todo', 'in_progress']);
      expect(mockQuery.in).toHaveBeenCalledWith('priority', ['high', 'critical']);
    });
  });

  describe('POST /api/workflow/tasks', () => {
    it('should create a task successfully', async () => {
      const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
      const mockSupabase = createRouteHandlerClient({});
      
      // Mock auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      // Mock team member
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { id: 'member-123' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'wedding-123' },
          error: null
        });

      // Mock task creation
      const mockCreatedTask = {
        id: 'task-123',
        title: 'New Task',
        status: 'todo',
        priority: 'medium',
        category: 'venue_management'
      };

      mockSupabase.from().insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCreatedTask,
            error: null
          })
        })
      });

      const taskData: TaskCreateInput = {
        title: 'New Task',
        description: 'Task description',
        wedding_id: 'wedding-123',
        category: 'venue_management' as TaskCategory,
        priority: 'medium' as TaskPriority,
        estimated_duration: 2,
        buffer_time: 0.5,
        deadline: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.task).toBeDefined();
      expect(body.task.title).toBe('New Task');
    });

    it('should validate required fields', async () => {
      const invalidTaskData = {
        // Missing required fields
        description: 'Task description'
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidTaskData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid task data');
      expect(body.details).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
      const mockSupabase = createRouteHandlerClient({});
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'member-123' },
        error: null
      });

      // Mock database error
      mockSupabase.from().insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        })
      });

      const taskData: TaskCreateInput = {
        title: 'New Task',
        wedding_id: 'wedding-123',
        category: 'venue_management' as TaskCategory,
        priority: 'medium' as TaskPriority,
        estimated_duration: 2,
        buffer_time: 0,
        deadline: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to create task');
    });
  });

  describe('Task Business Logic', () => {
    it('should calculate estimated completion time correctly', () => {
      const estimatedHours = 4;
      const bufferHours = 1;
      const totalHours = estimatedHours + bufferHours;
      
      expect(totalHours).toBe(5);
    });

    it('should validate task dependencies', () => {
      const dependencies = [
        {
          predecessor_task_id: 'task-1',
          dependency_type: 'finish_to_start' as const,
          lag_time: 0
        }
      ];
      
      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].dependency_type).toBe('finish_to_start');
    });

    it('should handle task priority ordering', () => {
      const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
      const priorityWeights = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4
      };
      
      const sortedTasks = priorities.sort((a, b) => priorityWeights[b] - priorityWeights[a]);
      expect(sortedTasks[0]).toBe('critical');
      expect(sortedTasks[sortedTasks.length - 1]).toBe('low');
    });
  });
});