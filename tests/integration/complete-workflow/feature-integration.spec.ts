import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mock environment for integration tests
const TEST_ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key',
  testOrgId: 'test-org-123',
  testClientId: 'test-client-456'
};

describe('WS-156/157/158 Feature Integration Tests', () => {
  let supabase: SupabaseClient;
  let testTaskIds: string[] = [];
  let testHelperIds: string[] = [];

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(TEST_ENV.supabaseUrl, TEST_ENV.supabaseKey);
    
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await cleanupTestData();
  });

  async function cleanupTestData() {
    // Clean up test tasks
    if (testTaskIds.length > 0) {
      await supabase
        .from('tasks')
        .delete()
        .in('id', testTaskIds);
    }

    // Clean up test helpers
    if (testHelperIds.length > 0) {
      await supabase
        .from('helpers')
        .delete()
        .in('id', testHelperIds);
    }
  }

  describe('Complete Task Creation Workflow (WS-156)', () => {
    it('should create task with all required fields and metadata', async () => {
      const taskData = {
        organization_id: TEST_ENV.testOrgId,
        client_id: TEST_ENV.testClientId,
        title: 'Setup wedding arch',
        description: 'Position and decorate the ceremony arch',
        priority: 'high',
        category: 'setup',
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        estimated_duration: 60, // minutes
        location: 'Main ceremony area',
        created_by: 'test-user-id'
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe(taskData.title);
      expect(data.category).toBe('setup');
      expect(data.priority).toBe('high');

      if (data) {
        testTaskIds.push(data.id);
      }
    });

    it('should validate required fields on task creation', async () => {
      const invalidTask = {
        organization_id: TEST_ENV.testOrgId,
        // Missing required fields
        description: 'Invalid task without title'
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(invalidTask)
        .select('*')
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should handle task dependencies correctly', async () => {
      // Create parent task
      const parentTask = {
        organization_id: TEST_ENV.testOrgId,
        client_id: TEST_ENV.testClientId,
        title: 'Parent: Venue setup',
        category: 'setup',
        created_by: 'test-user-id'
      };

      const { data: parent } = await supabase
        .from('tasks')
        .insert(parentTask)
        .select('*')
        .single();

      if (parent) {
        testTaskIds.push(parent.id);

        // Create dependent task
        const dependentTask = {
          organization_id: TEST_ENV.testOrgId,
          client_id: TEST_ENV.testClientId,
          title: 'Child: Chair arrangement',
          category: 'setup',
          parent_task_id: parent.id,
          created_by: 'test-user-id'
        };

        const { data: child } = await supabase
          .from('tasks')
          .insert(dependentTask)
          .select('*')
          .single();

        expect(child).toBeDefined();
        expect(child?.parent_task_id).toBe(parent.id);

        if (child) {
          testTaskIds.push(child.id);
        }
      }
    });
  });

  describe('Helper Assignment System (WS-157)', () => {
    it('should create and assign helpers to tasks', async () => {
      // Create a helper
      const helperData = {
        organization_id: TEST_ENV.testOrgId,
        name: 'John Helper',
        email: 'john@helper.com',
        phone: '+1234567890',
        assigned_phases: ['setup', 'ceremony'],
        max_tasks: 5,
        created_by: 'test-user-id'
      };

      const { data: helper, error: helperError } = await supabase
        .from('helpers')
        .insert(helperData)
        .select('*')
        .single();

      expect(helperError).toBeNull();
      expect(helper).toBeDefined();
      expect(helper?.assigned_phases).toContain('setup');

      if (helper) {
        testHelperIds.push(helper.id);

        // Create a task to assign
        const task = {
          organization_id: TEST_ENV.testOrgId,
          client_id: TEST_ENV.testClientId,
          title: 'Task for helper assignment',
          category: 'setup',
          created_by: 'test-user-id'
        };

        const { data: createdTask } = await supabase
          .from('tasks')
          .insert(task)
          .select('*')
          .single();

        if (createdTask) {
          testTaskIds.push(createdTask.id);

          // Assign helper to task
          const assignment = {
            task_id: createdTask.id,
            helper_id: helper.id,
            assigned_at: new Date().toISOString(),
            assigned_by: 'test-user-id'
          };

          const { data: assignmentData, error: assignmentError } = await supabase
            .from('task_assignments')
            .insert(assignment)
            .select('*')
            .single();

          expect(assignmentError).toBeNull();
          expect(assignmentData).toBeDefined();
          expect(assignmentData?.helper_id).toBe(helper.id);
        }
      }
    });

    it('should enforce helper task limits', async () => {
      // Create helper with limit of 2 tasks
      const limitedHelper = {
        organization_id: TEST_ENV.testOrgId,
        name: 'Limited Helper',
        email: 'limited@helper.com',
        max_tasks: 2,
        created_by: 'test-user-id'
      };

      const { data: helper } = await supabase
        .from('helpers')
        .insert(limitedHelper)
        .select('*')
        .single();

      if (helper) {
        testHelperIds.push(helper.id);

        // Create and assign tasks up to the limit
        const taskPromises = [];
        for (let i = 0; i < 3; i++) {
          const task = {
            organization_id: TEST_ENV.testOrgId,
            client_id: TEST_ENV.testClientId,
            title: `Task ${i + 1} for limited helper`,
            category: 'ceremony',
            created_by: 'test-user-id'
          };

          taskPromises.push(
            supabase
              .from('tasks')
              .insert(task)
              .select('*')
              .single()
          );
        }

        const tasks = await Promise.all(taskPromises);
        const taskIds = tasks.map(t => t.data?.id).filter(Boolean);
        testTaskIds.push(...taskIds);

        // Try to assign all tasks
        let successfulAssignments = 0;
        for (const taskId of taskIds) {
          const { error } = await supabase
            .from('task_assignments')
            .insert({
              task_id: taskId,
              helper_id: helper.id,
              assigned_at: new Date().toISOString(),
              assigned_by: 'test-user-id'
            });

          if (!error) {
            successfulAssignments++;
          }
        }

        // Should only allow 2 assignments due to limit
        expect(successfulAssignments).toBeLessThanOrEqual(2);
      }
    });

    it('should track helper availability and status', async () => {
      const helper = {
        organization_id: TEST_ENV.testOrgId,
        name: 'Status Helper',
        email: 'status@helper.com',
        availability_status: 'available',
        created_by: 'test-user-id'
      };

      const { data: createdHelper } = await supabase
        .from('helpers')
        .insert(helper)
        .select('*')
        .single();

      if (createdHelper) {
        testHelperIds.push(createdHelper.id);

        // Update availability status
        const { data: updated, error } = await supabase
          .from('helpers')
          .update({ availability_status: 'busy' })
          .eq('id', createdHelper.id)
          .select('*')
          .single();

        expect(error).toBeNull();
        expect(updated?.availability_status).toBe('busy');
      }
    });
  });

  describe('Task Categorization System (WS-158)', () => {
    it('should categorize tasks by wedding phases', async () => {
      const phases = ['setup', 'ceremony', 'reception', 'breakdown'];
      const tasksByPhase: Record<string, string[]> = {};

      // Create tasks for each phase
      for (const phase of phases) {
        const task = {
          organization_id: TEST_ENV.testOrgId,
          client_id: TEST_ENV.testClientId,
          title: `${phase} phase task`,
          category: phase,
          created_by: 'test-user-id'
        };

        const { data } = await supabase
          .from('tasks')
          .insert(task)
          .select('*')
          .single();

        if (data) {
          testTaskIds.push(data.id);
          if (!tasksByPhase[phase]) {
            tasksByPhase[phase] = [];
          }
          tasksByPhase[phase].push(data.id);
        }
      }

      // Query tasks by category
      for (const phase of phases) {
        const { data: phaseTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('category', phase)
          .eq('organization_id', TEST_ENV.testOrgId);

        expect(phaseTasks).toBeDefined();
        expect(phaseTasks?.length).toBeGreaterThan(0);
        phaseTasks?.forEach(task => {
          expect(task.category).toBe(phase);
        });
      }
    });

    it('should apply correct color coding to categories', async () => {
      const categoryColors = {
        setup: '#10B981',
        ceremony: '#3B82F6',
        reception: '#8B5CF6',
        breakdown: '#F59E0B'
      };

      // Create task view with category colors
      const { data: viewData } = await supabase
        .from('task_views')
        .insert({
          organization_id: TEST_ENV.testOrgId,
          view_name: 'Category Colors Test',
          category_colors: categoryColors,
          created_by: 'test-user-id'
        })
        .select('*')
        .single();

      expect(viewData).toBeDefined();
      expect(viewData?.category_colors).toEqual(categoryColors);
    });

    it('should filter tasks by multiple categories', async () => {
      const filterCategories = ['setup', 'ceremony'];
      
      const { data: filteredTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('category', filterCategories)
        .eq('organization_id', TEST_ENV.testOrgId);

      expect(filteredTasks).toBeDefined();
      filteredTasks?.forEach(task => {
        expect(filterCategories).toContain(task.category);
      });
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should handle complete workflow: create task → assign helper → categorize', async () => {
      // Step 1: Create categorized task
      const task = {
        organization_id: TEST_ENV.testOrgId,
        client_id: TEST_ENV.testClientId,
        title: 'Complete workflow test',
        description: 'Testing full integration',
        category: 'ceremony',
        priority: 'high',
        created_by: 'test-user-id'
      };

      const { data: createdTask } = await supabase
        .from('tasks')
        .insert(task)
        .select('*')
        .single();

      expect(createdTask).toBeDefined();
      expect(createdTask?.category).toBe('ceremony');

      if (createdTask) {
        testTaskIds.push(createdTask.id);

        // Step 2: Create helper specialized for ceremony
        const helper = {
          organization_id: TEST_ENV.testOrgId,
          name: 'Ceremony Specialist',
          email: 'ceremony@helper.com',
          assigned_phases: ['ceremony'],
          created_by: 'test-user-id'
        };

        const { data: createdHelper } = await supabase
          .from('helpers')
          .insert(helper)
          .select('*')
          .single();

        expect(createdHelper).toBeDefined();
        expect(createdHelper?.assigned_phases).toContain('ceremony');

        if (createdHelper) {
          testHelperIds.push(createdHelper.id);

          // Step 3: Assign helper to categorized task
          const assignment = {
            task_id: createdTask.id,
            helper_id: createdHelper.id,
            assigned_at: new Date().toISOString(),
            assigned_by: 'test-user-id'
          };

          const { data: assignmentData } = await supabase
            .from('task_assignments')
            .insert(assignment)
            .select(`
              *,
              task:tasks(*),
              helper:helpers(*)
            `)
            .single();

          expect(assignmentData).toBeDefined();
          expect(assignmentData?.task?.category).toBe('ceremony');
          expect(assignmentData?.helper?.assigned_phases).toContain('ceremony');
        }
      }
    });

    it('should maintain data consistency across features', async () => {
      // Create interconnected data
      const task = {
        organization_id: TEST_ENV.testOrgId,
        client_id: TEST_ENV.testClientId,
        title: 'Consistency test task',
        category: 'reception',
        created_by: 'test-user-id'
      };

      const { data: taskData } = await supabase
        .from('tasks')
        .insert(task)
        .select('*')
        .single();

      if (taskData) {
        testTaskIds.push(taskData.id);

        // Update category
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ category: 'breakdown' })
          .eq('id', taskData.id);

        expect(updateError).toBeNull();

        // Verify update propagated
        const { data: updatedTask } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskData.id)
          .single();

        expect(updatedTask?.category).toBe('breakdown');

        // Check audit log for changes
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('table_name', 'tasks')
          .eq('record_id', taskData.id)
          .order('created_at', { ascending: false })
          .limit(1);

        expect(auditLogs).toBeDefined();
        if (auditLogs && auditLogs.length > 0) {
          expect(auditLogs[0].action).toBe('update');
        }
      }
    });

    it('should handle concurrent operations correctly', async () => {
      const operations = [];

      // Simulate concurrent task creation
      for (let i = 0; i < 5; i++) {
        operations.push(
          supabase
            .from('tasks')
            .insert({
              organization_id: TEST_ENV.testOrgId,
              client_id: TEST_ENV.testClientId,
              title: `Concurrent task ${i}`,
              category: i % 2 === 0 ? 'setup' : 'ceremony',
              created_by: 'test-user-id'
            })
            .select('*')
            .single()
        );
      }

      const results = await Promise.all(operations);
      const createdTasks = results.map(r => r.data).filter(Boolean);
      
      expect(createdTasks).toHaveLength(5);
      createdTasks.forEach(task => {
        if (task) {
          testTaskIds.push(task.id);
          expect(['setup', 'ceremony']).toContain(task.category);
        }
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle real-time task category updates', async () => {
      const task = {
        organization_id: TEST_ENV.testOrgId,
        client_id: TEST_ENV.testClientId,
        title: 'Real-time category test',
        category: 'setup',
        created_by: 'test-user-id'
      };

      const { data: createdTask } = await supabase
        .from('tasks')
        .insert(task)
        .select('*')
        .single();

      if (createdTask) {
        testTaskIds.push(createdTask.id);

        // Subscribe to changes
        const subscription = supabase
          .channel('task-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'tasks',
              filter: `id=eq.${createdTask.id}`
            },
            (payload) => {
              expect(payload.new).toBeDefined();
              expect(payload.new.category).toBe('ceremony');
            }
          )
          .subscribe();

        // Update category
        await supabase
          .from('tasks')
          .update({ category: 'ceremony' })
          .eq('id', createdTask.id);

        // Clean up subscription
        await subscription.unsubscribe();
      }
    });

    it('should sync helper assignments in real-time', async () => {
      const helper = {
        organization_id: TEST_ENV.testOrgId,
        name: 'Real-time Helper',
        email: 'realtime@helper.com',
        created_by: 'test-user-id'
      };

      const { data: createdHelper } = await supabase
        .from('helpers')
        .insert(helper)
        .select('*')
        .single();

      if (createdHelper) {
        testHelperIds.push(createdHelper.id);

        // Subscribe to assignment changes
        const subscription = supabase
          .channel('assignment-updates')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'task_assignments',
              filter: `helper_id=eq.${createdHelper.id}`
            },
            (payload) => {
              expect(payload.new).toBeDefined();
              expect(payload.new.helper_id).toBe(createdHelper.id);
            }
          )
          .subscribe();

        // Create and assign task
        const task = {
          organization_id: TEST_ENV.testOrgId,
          client_id: TEST_ENV.testClientId,
          title: 'Task for real-time assignment',
          category: 'reception',
          created_by: 'test-user-id'
        };

        const { data: createdTask } = await supabase
          .from('tasks')
          .insert(task)
          .select('*')
          .single();

        if (createdTask) {
          testTaskIds.push(createdTask.id);

          await supabase
            .from('task_assignments')
            .insert({
              task_id: createdTask.id,
              helper_id: createdHelper.id,
              assigned_at: new Date().toISOString(),
              assigned_by: 'test-user-id'
            });
        }

        // Clean up subscription
        await subscription.unsubscribe();
      }
    });
  });
});