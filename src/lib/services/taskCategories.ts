import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Types
export interface TaskCategory {
  id: string;
  organization_id: string;
  name: string;
  phase:
    | 'planning'
    | 'setup'
    | 'ceremony'
    | 'cocktail'
    | 'reception'
    | 'breakdown'
    | 'post_wedding';
  color_hex: string;
  icon_name: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryPreference {
  id: string;
  organization_id: string;
  wedding_type: string;
  category_id: string;
  is_required: boolean;
  default_task_count: number;
  typical_duration_minutes: number;
  notes?: string;
}

export interface TaskPosition {
  id: string;
  task_id: string;
  category_id?: string;
  position_x: number;
  position_y: number;
  swimlane: string;
  last_moved_by?: string;
  last_moved_at: string;
}

export interface TimelineConfig {
  id: string;
  wedding_id: string;
  view_type: 'phase' | 'chronological' | 'helper' | 'location';
  start_time: string;
  end_time: string;
  time_scale: number;
  show_dependencies: boolean;
  show_helpers: boolean;
  color_by: 'category' | 'priority' | 'status' | 'helper';
  filters: Record<string, any>;
}

export interface CategoryAnalytics {
  id: string;
  category_id: string;
  wedding_id?: string;
  task_count: number;
  completed_count: number;
  average_completion_time?: number;
  overdue_count: number;
  reassignment_count: number;
}

// Phase configuration
export const PHASE_CONFIG = {
  planning: {
    label: 'Planning',
    color: '#9333EA',
    icon: '📋',
    description: 'Pre-wedding planning and preparation tasks',
  },
  setup: {
    label: 'Setup',
    color: '#3B82F6',
    icon: '🏗️',
    description: 'Venue and equipment setup before the event',
  },
  ceremony: {
    label: 'Ceremony',
    color: '#10B981',
    icon: '💒',
    description: 'Tasks during the wedding ceremony',
  },
  cocktail: {
    label: 'Cocktail Hour',
    color: '#F59E0B',
    icon: '🥂',
    description: 'Cocktail hour coordination and service',
  },
  reception: {
    label: 'Reception',
    color: '#EF4444',
    icon: '🎉',
    description: 'Reception activities and coordination',
  },
  breakdown: {
    label: 'Breakdown',
    color: '#6B7280',
    icon: '🧹',
    description: 'Post-event cleanup and breakdown',
  },
  post_wedding: {
    label: 'Post-Wedding',
    color: '#8B5CF6',
    icon: '📮',
    description: 'Follow-up tasks after the wedding',
  },
};

// Wedding type templates
export const WEDDING_TYPE_TEMPLATES = {
  traditional: {
    name: 'Traditional Wedding',
    categories: [
      'planning',
      'setup',
      'ceremony',
      'cocktail',
      'reception',
      'breakdown',
    ],
    typical_guest_count: 150,
  },
  destination: {
    name: 'Destination Wedding',
    categories: ['planning', 'setup', 'ceremony', 'reception', 'post_wedding'],
    typical_guest_count: 75,
  },
  elopement: {
    name: 'Elopement',
    categories: ['planning', 'ceremony', 'post_wedding'],
    typical_guest_count: 10,
  },
  cultural: {
    name: 'Cultural Wedding',
    categories: [
      'planning',
      'setup',
      'ceremony',
      'cocktail',
      'reception',
      'breakdown',
      'post_wedding',
    ],
    typical_guest_count: 200,
  },
  micro: {
    name: 'Micro Wedding',
    categories: ['planning', 'setup', 'ceremony', 'reception'],
    typical_guest_count: 30,
  },
};

// Service class for task category operations
export class TaskCategoryService {
  // Create default categories for an organization
  static async createDefaultCategories(
    organizationId: string,
  ): Promise<TaskCategory[]> {
    try {
      const defaultCategories = Object.entries(PHASE_CONFIG).map(
        ([phase, config], index) => ({
          organization_id: organizationId,
          name: config.label,
          phase,
          color_hex: config.color,
          icon_name: config.icon,
          display_order: index * 100,
          is_default: true,
          is_active: true,
          description: config.description,
        }),
      );

      const { data, error } = await supabase
        .from('task_categories')
        .insert(defaultCategories)
        .select();

      if (error) throw error;

      toast.success('Default categories created successfully');
      return data || [];
    } catch (error) {
      console.error('Error creating default categories:', error);
      toast.error('Failed to create default categories');
      throw error;
    }
  }

  // Get all categories for an organization
  static async getCategories(organizationId: string): Promise<TaskCategory[]> {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      throw error;
    }
  }

  // Create a new category
  static async createCategory(
    category: Partial<TaskCategory>,
  ): Promise<TaskCategory> {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;

      toast.success('Category created successfully');
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
      throw error;
    }
  }

  // Update a category
  static async updateCategory(
    categoryId: string,
    updates: Partial<TaskCategory>,
  ): Promise<TaskCategory> {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Category updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
      throw error;
    }
  }

  // Delete a category (soft delete)
  static async deleteCategory(categoryId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) throw error;

      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
      throw error;
    }
  }

  // Move task to a different category
  static async moveTaskToCategory(
    taskId: string,
    categoryId: string,
  ): Promise<void> {
    try {
      // Get category details
      const { data: category, error: catError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (catError) throw catError;

      // Update task with new category
      const { error: taskError } = await supabase
        .from('workflow_tasks')
        .update({
          category_id: categoryId,
          phase: category.phase,
          color_hex: category.color_hex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Update position tracking
      const { error: posError } = await supabase.from('task_positions').upsert(
        {
          task_id: taskId,
          category_id: categoryId,
          last_moved_at: new Date().toISOString(),
        },
        {
          onConflict: 'task_id',
        },
      );

      if (posError) throw posError;

      // Update analytics
      await this.updateCategoryAnalytics(categoryId);

      toast.success('Task moved successfully');
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task');
      throw error;
    }
  }

  // Bulk move tasks to category
  static async bulkMoveTasksToCategory(
    taskIds: string[],
    categoryId: string,
  ): Promise<void> {
    try {
      // Get category details
      const { data: category, error: catError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (catError) throw catError;

      // Update all tasks
      const { error: taskError } = await supabase
        .from('workflow_tasks')
        .update({
          category_id: categoryId,
          phase: category.phase,
          color_hex: category.color_hex,
          updated_at: new Date().toISOString(),
        })
        .in('id', taskIds);

      if (taskError) throw taskError;

      // Update analytics
      await this.updateCategoryAnalytics(categoryId);

      toast.success(`${taskIds.length} tasks moved successfully`);
    } catch (error) {
      console.error('Error bulk moving tasks:', error);
      toast.error('Failed to move tasks');
      throw error;
    }
  }

  // Get category preferences for a wedding type
  static async getCategoryPreferences(
    organizationId: string,
    weddingType: string,
  ): Promise<CategoryPreference[]> {
    try {
      const { data, error } = await supabase
        .from('category_preferences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('wedding_type', weddingType);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching category preferences:', error);
      toast.error('Failed to load category preferences');
      throw error;
    }
  }

  // Save category preferences
  static async saveCategoryPreferences(
    preferences: Partial<CategoryPreference>[],
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('category_preferences')
        .upsert(preferences, {
          onConflict: 'organization_id,wedding_type,category_id',
        });

      if (error) throw error;

      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
      throw error;
    }
  }

  // Get timeline configuration
  static async getTimelineConfig(
    weddingId: string,
    viewType = 'phase',
  ): Promise<TimelineConfig | null> {
    try {
      const { data, error } = await supabase
        .from('timeline_configs')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('view_type', viewType)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching timeline config:', error);
      toast.error('Failed to load timeline configuration');
      throw error;
    }
  }

  // Save timeline configuration
  static async saveTimelineConfig(
    config: Partial<TimelineConfig>,
  ): Promise<TimelineConfig> {
    try {
      const { data, error } = await supabase
        .from('timeline_configs')
        .upsert(config, {
          onConflict: 'wedding_id,view_type',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Timeline configuration saved');
      return data;
    } catch (error) {
      console.error('Error saving timeline config:', error);
      toast.error('Failed to save timeline configuration');
      throw error;
    }
  }

  // Update task position on timeline
  static async updateTaskTimelinePosition(
    taskId: string,
    timelinePosition: number,
    duration?: number,
  ): Promise<void> {
    try {
      const updates: any = {
        timeline_position: timelinePosition,
        updated_at: new Date().toISOString(),
      };

      if (duration) {
        updates.duration_minutes = duration;
      }

      const { error } = await supabase
        .from('workflow_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating timeline position:', error);
      toast.error('Failed to update task position');
      throw error;
    }
  }

  // Get category analytics
  static async getCategoryAnalytics(
    categoryId: string,
    weddingId?: string,
  ): Promise<CategoryAnalytics | null> {
    try {
      let query = supabase
        .from('category_analytics')
        .select('*')
        .eq('category_id', categoryId);

      if (weddingId) {
        query = query.eq('wedding_id', weddingId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  // Update category analytics
  static async updateCategoryAnalytics(
    categoryId: string,
    weddingId?: string,
  ): Promise<void> {
    try {
      // Get task statistics
      let query = supabase
        .from('workflow_tasks')
        .select('status, priority')
        .eq('category_id', categoryId);

      if (weddingId) {
        query = query.eq('wedding_id', weddingId);
      }

      const { data: tasks, error: taskError } = await query;

      if (taskError) throw taskError;

      const analytics = {
        category_id: categoryId,
        wedding_id: weddingId,
        task_count: tasks?.length || 0,
        completed_count:
          tasks?.filter((t) => t.status === 'completed').length || 0,
        overdue_count: 0, // Would need deadline comparison
        reassignment_count: 0, // Would need assignment history
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('category_analytics')
        .upsert(analytics, {
          onConflict: 'category_id,wedding_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating analytics:', error);
    }
  }

  // Search tasks by category and filters
  static async searchTasksByCategory(
    weddingId: string,
    filters: {
      categoryId?: string;
      phase?: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
      searchTerm?: string;
    },
  ) {
    try {
      let query = supabase
        .from('workflow_tasks')
        .select(
          `
          *,
          task_categories (
            name,
            color_hex,
            phase
          ),
          team_members!assigned_to (
            name
          )
        `,
        )
        .eq('wedding_id', weddingId);

      // Apply filters
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters.phase) {
        query = query.eq('phase', filters.phase);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters.searchTerm) {
        query = query.or(
          `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
        );
      }

      const { data, error } = await query.order('timeline_position', {
        nullsLast: true,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching tasks:', error);
      toast.error('Failed to search tasks');
      throw error;
    }
  }

  // Apply wedding type template
  static async applyWeddingTypeTemplate(
    organizationId: string,
    weddingId: string,
    weddingType: keyof typeof WEDDING_TYPE_TEMPLATES,
  ): Promise<void> {
    try {
      const template = WEDDING_TYPE_TEMPLATES[weddingType];

      if (!template) {
        throw new Error('Invalid wedding type');
      }

      // Get or create categories for this template
      const categories = await this.getCategories(organizationId);

      // Filter categories based on template
      const templateCategories = categories.filter((cat) =>
        template.categories.includes(cat.phase),
      );

      // Create default tasks for each category
      // This would be expanded based on specific requirements

      toast.success(`Applied ${template.name} template successfully`);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply wedding template');
      throw error;
    }
  }
}
