// Task Timeline Integration Service
// WS-058: Connects task delegation to wedding timeline

import { createClient } from '@supabase/supabase-js';

interface TimelineTask {
  id: string;
  title: string;
  category: string;
  deadline: Date;
  assignedTo?: string;
  status:
    | 'todo'
    | 'in_progress'
    | 'review'
    | 'completed'
    | 'blocked'
    | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  dependencies?: string[];
  isCriticalPath?: boolean;
  weddingId: string;
  vendorId?: string;
  budgetImpact?: number;
}

interface TimelineEvent {
  id: string;
  eventType:
    | 'ceremony'
    | 'reception'
    | 'rehearsal'
    | 'vendor_meeting'
    | 'task_deadline';
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  relatedTasks: string[];
  weddingId: string;
}

interface VendorCoordination {
  vendorId: string;
  vendorName: string;
  vendorType: string;
  assignedTasks: string[];
  contactInfo: {
    email?: string;
    phone?: string;
    preferredContact: 'email' | 'phone' | 'both';
  };
  deliverables: {
    taskId: string;
    description: string;
    deadline: Date;
    status: string;
  }[];
}

export class TaskTimelineIntegrationService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Connect task to wedding timeline
   */
  async connectTaskToTimeline(
    taskId: string,
    weddingId: string,
  ): Promise<void> {
    try {
      // Get task details
      const { data: task, error: taskError } = await this.supabase
        .from('workflow_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Get wedding timeline events
      const { data: events, error: eventsError } = await this.supabase
        .from('wedding_timeline_events')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('start_time', { ascending: true });

      if (eventsError) {
        // Create timeline events table if it doesn't exist
        await this.createTimelineEventsTable();
      }

      // Create timeline entry for task
      const timelineEntry = {
        wedding_id: weddingId,
        event_type: 'task_deadline',
        title: task.title,
        start_time: new Date(task.deadline).toISOString(),
        end_time: new Date(
          new Date(task.deadline).getTime() +
            task.estimated_duration * 60 * 60 * 1000,
        ).toISOString(),
        related_task_id: taskId,
        is_critical: task.is_critical_path || false,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await this.supabase
        .from('wedding_timeline_events')
        .insert(timelineEntry);

      if (insertError) throw insertError;

      // Update task with timeline connection
      await this.supabase
        .from('workflow_tasks')
        .update({
          timeline_connected: true,
          timeline_event_id: timelineEntry.id,
        })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error connecting task to timeline:', error);
      throw error;
    }
  }

  /**
   * Coordinate vendor tasks
   */
  async coordinateVendorTasks(
    vendorId: string,
    weddingId: string,
  ): Promise<VendorCoordination> {
    try {
      // Get vendor details
      const { data: vendor, error: vendorError } = await this.supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (vendorError) throw vendorError;

      // Get all tasks assigned to vendor
      const { data: tasks, error: tasksError } = await this.supabase
        .from('workflow_tasks')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('wedding_id', weddingId);

      if (tasksError) throw tasksError;

      // Create vendor coordination object
      const coordination: VendorCoordination = {
        vendorId,
        vendorName: vendor.name,
        vendorType: vendor.type,
        assignedTasks: tasks.map((t: any) => t.id),
        contactInfo: {
          email: vendor.email,
          phone: vendor.phone,
          preferredContact: vendor.preferred_contact || 'email',
        },
        deliverables: tasks.map((task: any) => ({
          taskId: task.id,
          description: task.description,
          deadline: new Date(task.deadline),
          status: task.status,
        })),
      };

      // Send vendor notification if needed
      if (tasks.some((t: any) => t.status === 'todo')) {
        await this.notifyVendor(vendor, tasks);
      }

      return coordination;
    } catch (error) {
      console.error('Error coordinating vendor tasks:', error);
      throw error;
    }
  }

  /**
   * Track budget impact of tasks
   */
  async trackBudgetImpact(taskId: string, budgetAmount: number): Promise<void> {
    try {
      // Update task with budget impact
      const { error: updateError } = await this.supabase
        .from('workflow_tasks')
        .update({
          budget_impact: budgetAmount,
          has_budget_impact: true,
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Get wedding budget details
      const { data: task } = await this.supabase
        .from('workflow_tasks')
        .select('wedding_id, category')
        .eq('id', taskId)
        .single();

      // Update wedding budget tracking
      const { data: budget, error: budgetError } = await this.supabase
        .from('wedding_budgets')
        .select('*')
        .eq('wedding_id', task.wedding_id)
        .single();

      if (budgetError) {
        // Create budget entry if it doesn't exist
        await this.supabase.from('wedding_budgets').insert({
          wedding_id: task.wedding_id,
          total_budget: 0,
          allocated_amount: budgetAmount,
          spent_amount: 0,
          created_at: new Date().toISOString(),
        });
      } else {
        // Update existing budget
        await this.supabase
          .from('wedding_budgets')
          .update({
            allocated_amount: (budget.allocated_amount || 0) + budgetAmount,
          })
          .eq('wedding_id', task.wedding_id);
      }

      // Create budget line item for task
      await this.supabase.from('budget_line_items').insert({
        wedding_id: task.wedding_id,
        task_id: taskId,
        category: task.category,
        amount: budgetAmount,
        description: `Budget allocation for task ${taskId}`,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking budget impact:', error);
      throw error;
    }
  }

  /**
   * Get timeline view with tasks
   */
  async getTimelineWithTasks(weddingId: string): Promise<any> {
    try {
      // Get all timeline events
      const { data: events, error: eventsError } = await this.supabase
        .from('wedding_timeline_events')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('start_time', { ascending: true });

      if (eventsError) throw eventsError;

      // Get all tasks for wedding
      const { data: tasks, error: tasksError } = await this.supabase
        .from('workflow_tasks')
        .select(
          `
          *,
          assigned_to:team_members(name, email),
          vendor:vendors(name, type)
        `,
        )
        .eq('wedding_id', weddingId)
        .order('deadline', { ascending: true });

      if (tasksError) throw tasksError;

      // Merge timeline events with tasks
      const timeline = {
        weddingId,
        events: events || [],
        tasks: tasks || [],
        criticalPath: tasks?.filter((t: any) => t.is_critical_path) || [],
        upcomingDeadlines:
          tasks?.filter((t: any) => {
            const deadline = new Date(t.deadline);
            const now = new Date();
            const daysUntil =
              (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return daysUntil <= 7 && daysUntil >= 0;
          }) || [],
      };

      return timeline;
    } catch (error) {
      console.error('Error getting timeline with tasks:', error);
      throw error;
    }
  }

  /**
   * Create timeline events table if it doesn't exist
   */
  private async createTimelineEventsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS wedding_timeline_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        location TEXT,
        related_task_id UUID REFERENCES workflow_tasks(id) ON DELETE SET NULL,
        is_critical BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_timeline_wedding ON wedding_timeline_events(wedding_id);
      CREATE INDEX IF NOT EXISTS idx_timeline_start ON wedding_timeline_events(start_time);
    `;

    try {
      await this.supabase.rpc('exec_sql', { sql: createTableQuery });
    } catch (error) {
      console.error('Error creating timeline events table:', error);
    }
  }

  /**
   * Notify vendor about tasks
   */
  private async notifyVendor(vendor: any, tasks: any[]): Promise<void> {
    try {
      const notification = {
        vendor_id: vendor.id,
        type: 'task_assignment',
        title: `You have ${tasks.length} new tasks`,
        message: `Please review your assigned tasks and their deadlines.`,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
        })),
        created_at: new Date().toISOString(),
      };

      await this.supabase.from('vendor_notifications').insert(notification);

      // Send email if vendor prefers email
      if (
        vendor.preferred_contact === 'email' ||
        vendor.preferred_contact === 'both'
      ) {
        // Email sending logic would go here
        console.log(`Email notification sent to ${vendor.email}`);
      }

      // Send SMS if vendor prefers phone
      if (
        vendor.preferred_contact === 'phone' ||
        vendor.preferred_contact === 'both'
      ) {
        // SMS sending logic would go here
        console.log(`SMS notification sent to ${vendor.phone}`);
      }
    } catch (error) {
      console.error('Error notifying vendor:', error);
    }
  }
}

export default TaskTimelineIntegrationService;
