/**
 * WS-156 Workflow Types Tests
 * Testing TypeScript interfaces and type definitions
 */

import { describe, it, expect } from 'vitest';
import {
  TaskPriority,
  TaskStatus,
  TaskCategory,
  DependencyType,
  WorkflowTask,
  TaskCreateInput,
  TaskUpdateInput,
  TaskTemplate,
  TimingConflict,
  ConflictResolution
} from '@/types/workflow';

describe('WS-156 Workflow Types', () => {
  describe('Enums', () => {
    it('defines TaskPriority enum correctly', () => {
      expect(TaskPriority.LOW).toBe('low');
      expect(TaskPriority.MEDIUM).toBe('medium');
      expect(TaskPriority.HIGH).toBe('high');
      expect(TaskPriority.CRITICAL).toBe('critical');
    });

    it('defines TaskStatus enum correctly', () => {
      expect(TaskStatus.TODO).toBe('todo');
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
      expect(TaskStatus.REVIEW).toBe('review');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.BLOCKED).toBe('blocked');
      expect(TaskStatus.CANCELLED).toBe('cancelled');
    });

    it('defines TaskCategory enum correctly', () => {
      expect(TaskCategory.VENUE_MANAGEMENT).toBe('venue_management');
      expect(TaskCategory.VENDOR_COORDINATION).toBe('vendor_coordination');
      expect(TaskCategory.CLIENT_MANAGEMENT).toBe('client_management');
      expect(TaskCategory.LOGISTICS).toBe('logistics');
      expect(TaskCategory.DESIGN).toBe('design');
      expect(TaskCategory.PHOTOGRAPHY).toBe('photography');
      expect(TaskCategory.CATERING).toBe('catering');
      expect(TaskCategory.FLORALS).toBe('florals');
      expect(TaskCategory.MUSIC).toBe('music');
      expect(TaskCategory.TRANSPORTATION).toBe('transportation');
    });

    it('defines DependencyType enum correctly', () => {
      expect(DependencyType.FINISH_TO_START).toBe('finish_to_start');
      expect(DependencyType.START_TO_START).toBe('start_to_start');
      expect(DependencyType.FINISH_TO_FINISH).toBe('finish_to_finish');
      expect(DependencyType.START_TO_FINISH).toBe('start_to_finish');
    });
  });

  describe('Interface Validation', () => {
    it('validates WorkflowTask interface structure', () => {
      const task: WorkflowTask = {
        id: 'task-123',
        title: 'Test Task',
        description: 'A test task description',
        wedding_id: 'wedding-456',
        category: TaskCategory.PHOTOGRAPHY,
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        assigned_to: 'user-789',
        assigned_by: 'planner-123',
        created_by: 'planner-123',
        estimated_duration: 2,
        buffer_time: 0.5,
        deadline: new Date('2025-02-15T16:00:00'),
        start_date: new Date('2025-02-15T14:00:00'),
        completion_date: null,
        progress_percentage: 0,
        is_critical_path: false,
        notes: 'Important photography session',
        attachments: ['photo1.jpg', 'requirements.pdf'],
        created_at: new Date('2025-01-27T08:00:00'),
        updated_at: new Date('2025-01-27T08:00:00')
      };

      expect(task.id).toBe('task-123');
      expect(task.category).toBe(TaskCategory.PHOTOGRAPHY);
      expect(task.priority).toBe(TaskPriority.HIGH);
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.estimated_duration).toBe(2);
      expect(task.buffer_time).toBe(0.5);
      expect(task.attachments).toHaveLength(2);
    });

    it('validates TaskCreateInput interface structure', () => {
      const createInput: TaskCreateInput = {
        title: 'New Photography Session',
        description: 'Couple portrait session at sunset',
        wedding_id: 'wedding-456',
        category: TaskCategory.PHOTOGRAPHY,
        priority: TaskPriority.HIGH,
        assigned_to: 'photographer-123',
        estimated_duration: 2,
        buffer_time: 0.5,
        deadline: new Date('2025-02-15T18:00:00'),
        dependencies: [
          {
            predecessor_task_id: 'task-hair-makeup',
            dependency_type: DependencyType.FINISH_TO_START,
            lag_time: 0.25
          }
        ]
      };

      expect(createInput.title).toBe('New Photography Session');
      expect(createInput.category).toBe(TaskCategory.PHOTOGRAPHY);
      expect(createInput.priority).toBe(TaskPriority.HIGH);
      expect(createInput.estimated_duration).toBe(2);
      expect(createInput.dependencies).toHaveLength(1);
      expect(createInput.dependencies![0].dependency_type).toBe(DependencyType.FINISH_TO_START);
    });

    it('validates TaskUpdateInput interface structure', () => {
      const updateInput: TaskUpdateInput = {
        title: 'Updated Photography Session',
        description: 'Extended couple portrait session',
        status: TaskStatus.IN_PROGRESS,
        progress_percentage: 25,
        notes: 'Started setup phase'
      };

      expect(updateInput.title).toBe('Updated Photography Session');
      expect(updateInput.status).toBe(TaskStatus.IN_PROGRESS);
      expect(updateInput.progress_percentage).toBe(25);
    });

    it('validates TaskTemplate interface structure', () => {
      const template: TaskTemplate = {
        id: 'template-123',
        name: 'Photography Session Template',
        category: TaskCategory.PHOTOGRAPHY,
        description: 'Complete photography session workflow',
        tasks: [
          {
            title: 'Set up equipment',
            description: 'Prepare cameras, lenses, and lighting',
            category: TaskCategory.PHOTOGRAPHY,
            priority: TaskPriority.HIGH,
            estimated_duration: 0.5,
            buffer_time: 0.25,
            order: 1,
            is_required: true
          },
          {
            title: 'Capture portraits',
            description: 'Take couple and family photos',
            category: TaskCategory.PHOTOGRAPHY,
            priority: TaskPriority.CRITICAL,
            estimated_duration: 1.5,
            buffer_time: 0.25,
            order: 2,
            is_required: true
          }
        ],
        tags: ['photography', 'portraits', 'wedding-day'],
        popularity: 85,
        is_featured: true,
        created_by: 'admin-123',
        created_at: new Date('2025-01-01T00:00:00'),
        updated_at: new Date('2025-01-27T08:00:00')
      };

      expect(template.name).toBe('Photography Session Template');
      expect(template.tasks).toHaveLength(2);
      expect(template.tasks[0].order).toBe(1);
      expect(template.tasks[1].order).toBe(2);
      expect(template.popularity).toBe(85);
      expect(template.is_featured).toBe(true);
      expect(template.tags).toContain('photography');
    });

    it('validates TimingConflict interface structure', () => {
      const conflict: TimingConflict = {
        type: 'overlap',
        severity: 'high',
        conflictingTasks: ['task-123', 'task-456'],
        proposedTime: {
          start: new Date('2025-02-15T14:00:00'),
          end: new Date('2025-02-15T16:00:00'),
          duration: 2
        },
        message: 'Photography session overlaps with venue setup',
        suggestions: [
          {
            id: 'suggestion-1',
            type: 'time_adjustment',
            description: 'Move photography session to 4:00 PM',
            newStartTime: new Date('2025-02-15T16:00:00'),
            effort_required: 'low',
            impact: 'minimal'
          }
        ],
        requiredBuffer: 0.5,
        actualBuffer: 0
      };

      expect(conflict.type).toBe('overlap');
      expect(conflict.severity).toBe('high');
      expect(conflict.conflictingTasks).toHaveLength(2);
      expect(conflict.proposedTime?.duration).toBe(2);
      expect(conflict.suggestions).toHaveLength(1);
      expect(conflict.suggestions[0].type).toBe('time_adjustment');
    });

    it('validates ConflictResolution interface structure', () => {
      const resolution: ConflictResolution = {
        id: 'resolution-123',
        type: 'time_adjustment',
        description: 'Reschedule photography session to avoid overlap',
        newStartTime: new Date('2025-02-15T17:00:00'),
        newDuration: 2,
        newBufferTime: 0.5,
        effort_required: 'medium',
        impact: 'moderate'
      };

      expect(resolution.id).toBe('resolution-123');
      expect(resolution.type).toBe('time_adjustment');
      expect(resolution.effort_required).toBe('medium');
      expect(resolution.impact).toBe('moderate');
      expect(resolution.newDuration).toBe(2);
      expect(resolution.newBufferTime).toBe(0.5);
    });
  });

  describe('Type Safety', () => {
    it('enforces correct enum values', () => {
      // These should compile without error
      const validPriority: TaskPriority = TaskPriority.HIGH;
      const validStatus: TaskStatus = TaskStatus.IN_PROGRESS;
      const validCategory: TaskCategory = TaskCategory.PHOTOGRAPHY;
      
      expect(validPriority).toBe('high');
      expect(validStatus).toBe('in_progress');
      expect(validCategory).toBe('photography');
    });

    it('supports optional fields correctly', () => {
      const minimalCreateInput: TaskCreateInput = {
        title: 'Minimal Task',
        description: 'A minimal task description',
        wedding_id: 'wedding-123',
        category: TaskCategory.LOGISTICS,
        priority: TaskPriority.MEDIUM,
        estimated_duration: 1,
        buffer_time: 0.25,
        deadline: new Date('2025-02-20T12:00:00')
      };

      expect(minimalCreateInput.assigned_to).toBeUndefined();
      expect(minimalCreateInput.dependencies).toBeUndefined();
    });

    it('supports nullable fields correctly', () => {
      const taskWithNulls: Partial<WorkflowTask> = {
        assigned_to: null,
        start_date: null,
        completion_date: null
      };

      expect(taskWithNulls.assigned_to).toBeNull();
      expect(taskWithNulls.start_date).toBeNull();
      expect(taskWithNulls.completion_date).toBeNull();
    });
  });
});