import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { WorkflowTask, TaskCategory, TaskPriority } from '@/types/workflow';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface TaskTemplate {
  id: string;
  title: string; // Existing schema uses 'title' not 'name'
  description: string | null;
  category_id: string | null; // Existing schema uses category_id
  default_priority: string | null; // Existing schema field
  estimated_hours: number | null; // Existing schema uses hours
  timeline_offset_days?: number; // WS-156 extension
  dependencies: string[]; // Existing field
  vendor_types?: string[]; // WS-156 extension
  created_by: string;
  organization_id: string;
  is_active: boolean; // Existing field instead of is_public
  usage_count?: number; // WS-156 extension
  success_rate?: number; // WS-156 extension
  created_at: string;
  updated_at: string;
}

export interface CreateTaskTemplateRequest {
  title: string; // Match existing schema
  description?: string;
  category_id?: string; // Use category_id instead of category enum
  default_priority?: string; // Use existing field name
  estimated_hours?: number; // Use existing field name (hours not minutes)
  timeline_offset_days?: number; // WS-156 extension
  dependencies?: string[];
  vendor_types?: string[]; // WS-156 extension
  organization_id: string;
  is_active?: boolean; // Use existing field
}

export interface TemplateGenerationRequest {
  wedding_id: string;
  template_id: string;
  customizations?: Partial<WorkflowTask>;
  wedding_date: string;
}

export interface TemplateAnalytics {
  template_id: string;
  total_usage: number;
  success_rate: number;
  avg_completion_time: number;
  most_common_customizations: Record<string, any>;
  category_performance: {
    category: TaskCategory;
    usage_count: number;
    success_rate: number;
  }[];
}

/**
 * Task Template Service - WS-156 Extension
 * Extends existing workflow system with template-based task creation
 * Follows existing architectural patterns and service injection
 */
export class TaskTemplateService {
  constructor(private client = supabase) {}

  /**
   * Get templates by category with advanced filtering
   * Compatible with existing organization structure
   */
  async getTemplatesByCategory(
    organization_id: string,
    filters?: {
      category_id?: string;
      is_active?: boolean;
      search?: string;
      wedding_type?: string;
      guest_count_range?: string;
    },
  ): Promise<TaskTemplate[]> {
    let query = this.client
      .from('task_templates')
      .select(
        `
        id,
        title,
        description,
        category_id,
        default_priority,
        estimated_hours,
        timeline_offset_days,
        dependencies,
        vendor_types,
        created_by,
        organization_id,
        is_active,
        usage_count,
        success_rate,
        created_at,
        updated_at
      `,
      )
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Failed to fetch templates:', error);
      throw new Error(`Failed to fetch task templates: ${error.message}`);
    }

    return templates || [];
  }

  /**
   * Create new task template with validation
   */
  async createTemplate(
    template_data: CreateTaskTemplateRequest,
    created_by: string,
  ): Promise<TaskTemplate> {
    // Validate template data
    this.validateTemplateData(template_data);

    const template_record = {
      ...template_data,
      dependencies: template_data.dependencies || [],
      vendor_types: template_data.vendor_types || [],
      created_by,
      is_active: template_data.is_active !== false, // Default to active
      usage_count: 0,
      success_rate: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: template, error } = await this.client
      .from('task_templates')
      .insert(template_record)
      .select()
      .single();

    if (error) {
      console.error('Failed to create template:', error);
      throw new Error(`Failed to create task template: ${error.message}`);
    }

    return template;
  }

  /**
   * Generate Task instances from template
   * Integrates with existing tasks table structure
   */
  async generateTasksFromTemplate(
    request: TemplateGenerationRequest,
    created_by: string,
  ): Promise<any[]> {
    // Get template details
    const template = await this.getTemplatePrivate(request.template_id);
    if (!template) {
      throw new Error('Template not found');
    }

    // Get client details for context (using client_id instead of wedding_id)
    const client = await this.getClientDetails(request.wedding_id);
    if (!client) {
      throw new Error('Client not found');
    }

    // Calculate task deadline based on wedding date and offset
    const wedding_date = new Date(request.wedding_date);
    const task_deadline = new Date(wedding_date);
    if (template.timeline_offset_days) {
      task_deadline.setDate(
        task_deadline.getDate() - template.timeline_offset_days,
      );
    }

    // Generate task compatible with existing system
    const generated_task = {
      title: template.title,
      description: template.description || '',
      client_id: request.wedding_id, // Using client_id field
      template_id: template.id,
      category_id: template.category_id,
      priority: template.default_priority || 'medium',
      status: 'pending',
      assigned_by: created_by,
      estimated_hours: template.estimated_hours || 1,
      due_date: task_deadline.toISOString(),
      progress_percentage: 0,
      is_milestone: false,
      notes: '',
      tags: [],
      organization_id: template.organization_id,
      // Apply any customizations
      ...request.customizations,
    };

    // Insert task into tasks table
    const { data: created_task, error } = await this.client
      .from('tasks')
      .insert(generated_task)
      .select()
      .single();

    if (error) {
      console.error('Failed to create task from template:', error);
      throw new Error(`Failed to create task from template: ${error.message}`);
    }

    // Update template usage statistics
    await this.updateTemplateUsage(request.template_id);

    // Return as array for consistency with bulk operations
    return [created_task];
  }

  /**
   * Generate multiple tasks from multiple templates
   * Optimized for bulk operations
   */
  async generateBulkTasksFromTemplates(
    wedding_id: string,
    template_ids: string[],
    wedding_date: string,
    customizations: Record<string, any>,
    created_by: string,
  ): Promise<any[]> {
    const generated_tasks: any[] = [];

    // Process templates in parallel for performance
    const generation_promises = template_ids.map(async (template_id) => {
      try {
        const tasks = await this.generateTasksFromTemplate(
          {
            wedding_id,
            template_id,
            wedding_date,
            customizations: customizations[template_id],
          },
          created_by,
        );
        return tasks;
      } catch (error) {
        console.error(
          `Failed to generate tasks from template ${template_id}:`,
          error,
        );
        return [];
      }
    });

    const results = await Promise.all(generation_promises);

    // Flatten results
    for (const task_batch of results) {
      generated_tasks.push(...task_batch);
    }

    return generated_tasks;
  }

  /**
   * Get template analytics for optimization
   */
  async getTemplateAnalytics(
    organization_id: string,
  ): Promise<TemplateAnalytics[]> {
    // Query template usage data
    const { data: templates, error: templates_error } = await this.client
      .from('task_templates')
      .select(
        `
        id,
        category,
        usage_count,
        success_rate,
        name
      `,
      )
      .eq('organization_id', organization_id);

    if (templates_error) {
      console.error('Failed to fetch template analytics:', templates_error);
      throw new Error(
        `Failed to fetch template analytics: ${templates_error.message}`,
      );
    }

    // Query actual task completion data for success rates
    const analytics = await Promise.all(
      (templates || []).map(async (template) => {
        const { data: task_performance } = await this.client
          .from('tasks')
          .select('status, completed_at, created_at')
          .eq('template_id', template.id);

        const total_tasks = task_performance?.length || 0;
        const completed_tasks =
          task_performance?.filter((t) => t.status === 'completed').length || 0;
        const success_rate =
          total_tasks > 0 ? (completed_tasks / total_tasks) * 100 : 0;

        // Calculate average completion time
        const completion_times =
          task_performance
            ?.filter((t) => t.completed_at && t.created_at)
            .map((t) => {
              const created = new Date(t.created_at).getTime();
              const completed = new Date(t.completed_at!).getTime();
              return (completed - created) / (1000 * 60 * 60 * 24); // days
            }) || [];

        const avg_completion_time =
          completion_times.length > 0
            ? completion_times.reduce((sum, time) => sum + time, 0) /
              completion_times.length
            : 0;

        return {
          template_id: template.id,
          total_usage: template.usage_count || 0,
          success_rate: Math.round(success_rate * 100) / 100,
          avg_completion_time: Math.round(avg_completion_time * 100) / 100,
          most_common_customizations: {}, // Would require more complex analysis
          category_performance: [
            {
              category: template.category_id,
              usage_count: template.usage_count || 0,
              success_rate: Math.round(success_rate * 100) / 100,
            },
          ],
        };
      }),
    );

    return analytics;
  }

  /**
   * Update template based on usage feedback
   */
  async updateTemplate(
    template_id: string,
    updates: Partial<CreateTaskTemplateRequest>,
    updated_by: string,
  ): Promise<TaskTemplate> {
    const update_data = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data: updated_template, error } = await this.client
      .from('task_templates')
      .update(update_data)
      .eq('id', template_id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update template:', error);
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return updated_template;
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(template_id: string, deleted_by: string): Promise<void> {
    // Check if template is in use
    const { data: active_tasks } = await this.client
      .from('tasks')
      .select('id')
      .eq('template_id', template_id)
      .in('status', ['pending', 'in_progress', 'assigned']);

    if (active_tasks && active_tasks.length > 0) {
      throw new Error(
        'Cannot delete template that is currently in use by active tasks',
      );
    }

    // Soft delete by marking as inactive
    const { error } = await this.client
      .from('task_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template_id);

    if (error) {
      console.error('Failed to delete template:', error);
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  // Private helper methods

  private validateTemplateData(data: CreateTaskTemplateRequest): void {
    if (!data.title || data.title.trim().length < 3) {
      throw new Error('Template title must be at least 3 characters long');
    }

    if (data.timeline_offset_days && data.timeline_offset_days < 0) {
      throw new Error('Timeline offset days cannot be negative');
    }

    if (data.estimated_hours && data.estimated_hours < 0.25) {
      throw new Error(
        'Estimated hours must be at least 0.25 hours (15 minutes)',
      );
    }
  }

  /**
   * Get a single template by ID (public method)
   */
  async getTemplate(template_id: string): Promise<TaskTemplate | null> {
    return this.getTemplatePrivate(template_id);
  }

  private async getTemplatePrivate(
    template_id: string,
  ): Promise<TaskTemplate | null> {
    const { data: template, error } = await this.client
      .from('task_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Template not found
      }
      throw error;
    }

    return template;
  }

  private async getClientDetails(client_id: string): Promise<any> {
    // Query client details from existing clients table
    const { data: client, error } = await this.client
      .from('clients')
      .select('id, wedding_date, guest_count')
      .eq('id', client_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Client not found
      }
      console.error('Failed to fetch client details:', error);
      return { id: client_id }; // Return minimal data if table doesn't exist yet
    }

    return client;
  }

  private async updateTemplateUsage(template_id: string): Promise<void> {
    // Increment usage count atomically
    const { error } = await this.client.rpc('increment_template_usage', {
      template_id,
    });

    if (
      error &&
      error.message !== 'function increment_template_usage does not exist'
    ) {
      console.error('Failed to update template usage:', error);
    }

    // Fallback: manual update if RPC function doesn't exist
    if (error?.message === 'function increment_template_usage does not exist') {
      await this.client
        .from('task_templates')
        .update({
          usage_count: this.client.raw('usage_count + 1'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', template_id);
    }
  }
}

/**
 * Singleton instance for dependency injection
 * Follows existing service pattern in the codebase
 */
export const taskTemplateService = new TaskTemplateService();
