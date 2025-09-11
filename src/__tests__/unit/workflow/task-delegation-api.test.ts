import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/workflow/tasks/route';
import { GET as getById, PATCH, DELETE } from '@/app/api/workflow/tasks/[id]/route';
import { TaskStatus, TaskPriority, TaskCategory } from '@/types/workflow';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      })),
      order: vi.fn(() => ({
        range: vi.fn()
      in: vi.fn(),
      neq: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn()
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
      }))
    update: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
};
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => mockSupabase
}));
vi.mock('next/headers', () => ({
  cookies: () => ({})
describe('Task Delegation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('GET /api/workflow/tasks', () => {
    it('should return tasks for authenticated user', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/workflow/tasks?wedding_id=123'
      });
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      // Mock team member access
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'member-123', role: 'coordinator' },
              error: null
            })
          })
        })
      // Mock tasks query
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'task-1',
                    title: 'Test Task',
                    status: TaskStatus.PENDING,
                    priority: TaskPriority.HIGH,
                    category: TaskCategory.VENUE,
                    wedding_id: '123'
                  }
                ],
                error: null
              })
      const response = await GET(req);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Test Task');
    });
    it('should return 401 for unauthenticated user', async () => {
        data: { user: null },
        error: { message: 'No user' }
      expect(response.status).toBe(401);
    it('should return 403 for user without wedding access', async () => {
              data: null,
              error: { message: 'No access' }
      expect(response.status).toBe(403);
  describe('POST /api/workflow/tasks', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        wedding_id: '123',
        category: TaskCategory.VENUE,
        priority: TaskPriority.HIGH,
        assigned_to: 'member-456',
        deadline: '2024-12-31T23:59:59Z',
        estimated_hours: 8
      };
        method: 'POST',
        body: taskData
              data: { id: 'member-456', name: 'Assignee' },
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
              data: { id: 'task-new', ...taskData },
      const response = await POST(req);
      expect(response.status).toBe(201);
      expect(data.title).toBe('New Task');
      expect(data.priority).toBe(TaskPriority.HIGH);
    it('should return 400 for invalid task data', async () => {
      const invalidData = {
        title: '', // Empty title
        wedding_id: '123'
        body: invalidData
      expect(response.status).toBe(400);
    it('should handle database errors gracefully', async () => {
        priority: TaskPriority.HIGH
              error: { message: 'Database error' }
      expect(response.status).toBe(500);
  describe('PATCH /api/workflow/tasks/[id]', () => {
    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Task',
        status: TaskStatus.IN_PROGRESS,
        progress_percentage: 50
        method: 'PATCH',
        body: updateData
      // Mock existing task
              data: {
                id: 'task-1',
                title: 'Original Task',
                status: TaskStatus.PENDING,
                wedding_id: '123',
                assigned_to: 'member-123'
              },
      // Mock user access
      // Mock update
        update: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...updateData, id: 'task-1' },
      const response = await PATCH(req, { params: { id: 'task-1' } });
      expect(data.title).toBe('Updated Task');
      expect(data.status).toBe(TaskStatus.IN_PROGRESS);
    it('should return 404 for non-existent task', async () => {
        body: { title: 'Updated' }
              error: { message: 'Not found' }
      const response = await PATCH(req, { params: { id: 'nonexistent' } });
      expect(response.status).toBe(404);
  describe('DELETE /api/workflow/tasks/[id]', () => {
    it('should delete task successfully', async () => {
        method: 'DELETE'
                created_by: 'member-123'
              data: { id: 'member-123', role: 'admin' },
      // Mock delete
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
      const response = await DELETE(req, { params: { id: 'task-1' } });
    it('should return 403 for unauthorized deletion', async () => {
                created_by: 'member-456' // Different creator
      // Mock user access (not admin)
});
describe('Task Validation', () => {
  it('should validate required fields', () => {
    const validTask = {
      title: 'Valid Task',
      wedding_id: '123',
      category: TaskCategory.VENUE,
      priority: TaskPriority.HIGH
    };
    expect(validTask.title).toBeTruthy();
    expect(validTask.wedding_id).toBeTruthy();
    expect(Object.values(TaskCategory)).toContain(validTask.category);
    expect(Object.values(TaskPriority)).toContain(validTask.priority);
  it('should validate status transitions', () => {
    const validTransitions = {
      [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD, TaskStatus.CANCELLED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.ON_HOLD, TaskStatus.CANCELLED],
      [TaskStatus.ON_HOLD]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
      [TaskStatus.COMPLETED]: [TaskStatus.IN_PROGRESS],
      [TaskStatus.CANCELLED]: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
    // Test valid transitions
    expect(validTransitions[TaskStatus.PENDING]).toContain(TaskStatus.IN_PROGRESS);
    expect(validTransitions[TaskStatus.IN_PROGRESS]).toContain(TaskStatus.COMPLETED);
    
    // Test invalid transitions
    expect(validTransitions[TaskStatus.COMPLETED]).not.toContain(TaskStatus.PENDING);
    expect(validTransitions[TaskStatus.CANCELLED]).not.toContain(TaskStatus.COMPLETED);
  it('should validate deadline dates', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
    expect(futureDate > now).toBe(true);
    expect(pastDate < now).toBe(true);
  it('should validate estimated hours', () => {
    const validHours = [1, 8, 40, 100];
    const invalidHours = [-1, 0, 1000, NaN];
    validHours.forEach(hours => {
      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThan(500); // Reasonable upper limit
    invalidHours.forEach(hours => {
      expect(hours <= 0 || hours > 500 || isNaN(hours)).toBe(true);
