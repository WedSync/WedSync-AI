import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { TaskCategory, TaskPriority, DependencyType } from '@/types/workflow';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface WeddingTaskTemplate {
  id: string;
  name: string;
  description: string;
  scenario: WeddingScenario;
  tasks: TemplateTask[];
  triggers: AutomationTrigger[];
  estimated_total_hours: number;
  typical_timeline_days: number;
}

interface TemplateTask {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimated_duration: number;
  buffer_time: number;
  days_before_event: number;
  order_index: number;
  default_assignee_role?: string;
  specialties_required: string[];
  dependencies: TaskDependency[];
  conditions?: TriggerCondition[];
}

interface TaskDependency {
  predecessor_order: number;
  dependency_type: DependencyType;
  lag_time: number;
}

interface AutomationTrigger {
  type: 'rsvp_count' | 'date_proximity' | 'vendor_status' | 'guest_category';
  conditions: TriggerCondition[];
  actions: TriggerAction[];
}

interface TriggerCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
  logic?: 'AND' | 'OR';
}

interface TriggerAction {
  type:
    | 'create_task'
    | 'assign_template'
    | 'send_notification'
    | 'update_priority';
  payload: Record<string, any>;
}

enum WeddingScenario {
  DAY_OF_SETUP = 'day_of_setup',
  VENDOR_COORDINATION = 'vendor_coordination',
  CLIENT_ONBOARDING = 'client_onboarding',
  TIMELINE_PLANNING = 'timeline_planning',
  EMERGENCY_PROTOCOLS = 'emergency_protocols',
  INTERNATIONAL_GUESTS = 'international_guests',
  LARGE_WEDDING_150_PLUS = 'large_wedding_150_plus',
  INTIMATE_WEDDING_UNDER_50 = 'intimate_wedding_under_50',
  DESTINATION_WEDDING = 'destination_wedding',
  OUTDOOR_WEDDING = 'outdoor_wedding',
}

// Automated Assignment Interfaces
interface TeamMemberProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  specialties: TaskCategory[];
  current_workload: number;
  available_hours_per_week: number;
  timezone: string;
  skill_ratings: Record<TaskCategory, number>; // 1-10 rating
  availability_schedule: WeeklySchedule;
  preferred_task_types: TaskCategory[];
  max_concurrent_tasks: number;
}

interface WeeklySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

interface AssignmentResult {
  task_id: string;
  assigned_to: string;
  assignment_score: number;
  assignment_reason: string;
  estimated_completion_date: Date;
  confidence_level: number;
}

interface WorkloadAnalysis {
  team_member_id: string;
  current_tasks: number;
  upcoming_deadlines: number;
  capacity_utilization: number;
  availability_next_week: number;
  overload_risk: 'low' | 'medium' | 'high';
}

export class TaskAutomationService {
  // Wedding scenario templates as referenced in instructions
  private static readonly WEDDING_TEMPLATES: WeddingTaskTemplate[] = [
    {
      id: 'day-of-setup-template',
      name: 'Day-Of Setup Template',
      description: 'Complete setup checklist for wedding day coordination',
      scenario: WeddingScenario.DAY_OF_SETUP,
      estimated_total_hours: 16,
      typical_timeline_days: 1,
      triggers: [
        {
          type: 'date_proximity',
          conditions: [
            { field: 'days_until_wedding', operator: 'eq', value: 1 },
          ],
          actions: [
            {
              type: 'assign_template',
              payload: { template_id: 'day-of-setup-template' },
            },
          ],
        },
      ],
      tasks: [
        {
          title: 'Set up gift table',
          description: 'Arrange gift table with card box and decorations',
          category: TaskCategory.VENUE_MANAGEMENT,
          priority: TaskPriority.HIGH,
          estimated_duration: 0.5,
          buffer_time: 0.25,
          days_before_event: 0,
          order_index: 1,
          default_assignee_role: 'setup_coordinator',
          specialties_required: ['venue_management'],
          dependencies: [],
          conditions: [
            { field: 'hours_before_ceremony', operator: 'eq', value: 2 },
          ],
        },
        {
          title: 'Arrange ceremony chairs',
          description: 'Set up ceremony seating in proper configuration',
          category: TaskCategory.VENUE_MANAGEMENT,
          priority: TaskPriority.CRITICAL,
          estimated_duration: 1.5,
          buffer_time: 0.5,
          days_before_event: 0,
          order_index: 2,
          default_assignee_role: 'venue_coordinator',
          specialties_required: ['venue_management', 'logistics'],
          dependencies: [],
          conditions: [
            { field: 'hours_before_ceremony', operator: 'eq', value: 3 },
          ],
        },
        {
          title: 'Setup reception tables',
          description: 'Arrange reception tables with linens and centerpieces',
          category: TaskCategory.VENUE_MANAGEMENT,
          priority: TaskPriority.HIGH,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 0,
          order_index: 3,
          specialties_required: ['venue_management', 'design'],
          dependencies: [
            {
              predecessor_order: 2,
              dependency_type: DependencyType.FINISH_TO_START,
              lag_time: 0,
            },
          ],
        },
        {
          title: 'Audio/visual system check',
          description: 'Test microphones, speakers, and presentation equipment',
          category: TaskCategory.MUSIC,
          priority: TaskPriority.CRITICAL,
          estimated_duration: 1,
          buffer_time: 0.5,
          days_before_event: 0,
          order_index: 4,
          specialties_required: ['music', 'logistics'],
          dependencies: [],
        },
        {
          title: 'Bridal suite preparation',
          description: 'Prepare bridal suite with refreshments and amenities',
          category: TaskCategory.CLIENT_MANAGEMENT,
          priority: TaskPriority.MEDIUM,
          estimated_duration: 0.75,
          buffer_time: 0.25,
          days_before_event: 0,
          order_index: 5,
          specialties_required: ['client_management'],
          dependencies: [],
        },
        {
          title: 'Vendor arrival coordination',
          description: 'Coordinate and check in all vendors as they arrive',
          category: TaskCategory.VENDOR_COORDINATION,
          priority: TaskPriority.HIGH,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 0,
          order_index: 6,
          specialties_required: ['vendor_coordination'],
          dependencies: [],
        },
        {
          title: 'Final timeline review',
          description: 'Review timeline with all key stakeholders',
          category: TaskCategory.LOGISTICS,
          priority: TaskPriority.CRITICAL,
          estimated_duration: 0.5,
          buffer_time: 0,
          days_before_event: 0,
          order_index: 7,
          specialties_required: ['logistics'],
          dependencies: [
            {
              predecessor_order: 6,
              dependency_type: DependencyType.FINISH_TO_START,
              lag_time: 0,
            },
          ],
        },
      ],
    },
    {
      id: 'vendor-coordination-template',
      name: 'Vendor Coordination Template',
      description: 'Comprehensive vendor management workflow',
      scenario: WeddingScenario.VENDOR_COORDINATION,
      estimated_total_hours: 25,
      typical_timeline_days: 180,
      triggers: [
        {
          type: 'vendor_status',
          conditions: [
            { field: 'vendor_status', operator: 'eq', value: 'confirmed' },
          ],
          actions: [
            {
              type: 'assign_template',
              payload: { template_id: 'vendor-coordination-template' },
            },
          ],
        },
      ],
      tasks: [
        {
          title: 'Initial vendor outreach',
          description: 'Send inquiry to potential vendors with event details',
          category: TaskCategory.VENDOR_COORDINATION,
          priority: TaskPriority.HIGH,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 180,
          order_index: 1,
          specialties_required: ['vendor_coordination'],
          dependencies: [],
        },
        {
          title: 'Vendor proposal review',
          description: 'Review and compare vendor proposals',
          category: TaskCategory.VENDOR_COORDINATION,
          priority: TaskPriority.MEDIUM,
          estimated_duration: 3,
          buffer_time: 1,
          days_before_event: 170,
          order_index: 2,
          specialties_required: ['vendor_coordination'],
          dependencies: [
            {
              predecessor_order: 1,
              dependency_type: DependencyType.FINISH_TO_START,
              lag_time: 24,
            },
          ],
        },
        {
          title: 'Contract negotiation',
          description: 'Negotiate terms and finalize vendor contracts',
          category: TaskCategory.VENDOR_COORDINATION,
          priority: TaskPriority.HIGH,
          estimated_duration: 4,
          buffer_time: 1,
          days_before_event: 160,
          order_index: 3,
          specialties_required: ['vendor_coordination'],
          dependencies: [
            {
              predecessor_order: 2,
              dependency_type: DependencyType.FINISH_TO_START,
              lag_time: 48,
            },
          ],
        },
        {
          title: 'Vendor timeline coordination',
          description: 'Coordinate vendor timelines and setup requirements',
          category: TaskCategory.LOGISTICS,
          priority: TaskPriority.HIGH,
          estimated_duration: 3,
          buffer_time: 0.5,
          days_before_event: 30,
          order_index: 4,
          specialties_required: ['vendor_coordination', 'logistics'],
          dependencies: [
            {
              predecessor_order: 3,
              dependency_type: DependencyType.FINISH_TO_START,
              lag_time: 0,
            },
          ],
        },
        {
          title: 'Final vendor confirmations',
          description: 'Confirm all vendor details and arrival times',
          category: TaskCategory.VENDOR_COORDINATION,
          priority: TaskPriority.CRITICAL,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 7,
          order_index: 5,
          specialties_required: ['vendor_coordination'],
          dependencies: [
            {
              predecessor_order: 4,
              dependency_type: DependencyType.FINISH_TO_START,
              lag_time: 0,
            },
          ],
        },
      ],
    },
    {
      id: 'large-wedding-template',
      name: 'Large Wedding (150+ Guests) Template',
      description: 'Specialized workflow for weddings with 150+ guests',
      scenario: WeddingScenario.LARGE_WEDDING_150_PLUS,
      estimated_total_hours: 45,
      typical_timeline_days: 365,
      triggers: [
        {
          type: 'rsvp_count',
          conditions: [{ field: 'rsvp_count', operator: 'gte', value: 150 }],
          actions: [
            {
              type: 'assign_template',
              payload: { template_id: 'large-wedding-template' },
            },
          ],
        },
      ],
      tasks: [
        {
          title: 'Venue capacity verification',
          description: 'Verify venue can accommodate large guest count',
          category: TaskCategory.VENUE_MANAGEMENT,
          priority: TaskPriority.CRITICAL,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 365,
          order_index: 1,
          specialties_required: ['venue_management'],
          dependencies: [],
        },
        {
          title: 'Extended catering planning',
          description:
            'Plan catering for large guest count with buffet/stations',
          category: TaskCategory.CATERING,
          priority: TaskPriority.HIGH,
          estimated_duration: 4,
          buffer_time: 1,
          days_before_event: 120,
          order_index: 2,
          specialties_required: ['catering'],
          dependencies: [
            {
              predecessor_order: 1,
              dependency_type: DependencyType.FINISH_TO_START,
              lag_time: 0,
            },
          ],
        },
        {
          title: 'Additional restroom facilities',
          description:
            'Arrange additional restroom facilities for large guest count',
          category: TaskCategory.LOGISTICS,
          priority: TaskPriority.MEDIUM,
          estimated_duration: 1.5,
          buffer_time: 0.5,
          days_before_event: 60,
          order_index: 3,
          specialties_required: ['logistics', 'venue_management'],
          dependencies: [],
        },
        {
          title: 'Parking coordination',
          description: 'Coordinate parking for 75+ vehicles',
          category: TaskCategory.TRANSPORTATION,
          priority: TaskPriority.HIGH,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 30,
          order_index: 4,
          specialties_required: ['transportation', 'logistics'],
          dependencies: [],
        },
        {
          title: 'Multiple bar stations setup',
          description: 'Setup multiple bar stations to reduce wait times',
          category: TaskCategory.CATERING,
          priority: TaskPriority.MEDIUM,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 1,
          order_index: 5,
          specialties_required: ['catering'],
          dependencies: [],
        },
      ],
    },
    {
      id: 'international-guests-template',
      name: 'International Guests Template',
      description: 'Special accommodations for international wedding guests',
      scenario: WeddingScenario.INTERNATIONAL_GUESTS,
      estimated_total_hours: 20,
      typical_timeline_days: 90,
      triggers: [
        {
          type: 'guest_category',
          conditions: [
            { field: 'international_guests_count', operator: 'gte', value: 5 },
          ],
          actions: [
            {
              type: 'assign_template',
              payload: { template_id: 'international-guests-template' },
            },
          ],
        },
      ],
      tasks: [
        {
          title: 'Travel coordination assistance',
          description: 'Assist international guests with travel arrangements',
          category: TaskCategory.CLIENT_MANAGEMENT,
          priority: TaskPriority.HIGH,
          estimated_duration: 4,
          buffer_time: 1,
          days_before_event: 90,
          order_index: 1,
          specialties_required: ['client_management'],
          dependencies: [],
        },
        {
          title: 'Accommodation block booking',
          description: 'Book hotel room blocks for international guests',
          category: TaskCategory.LOGISTICS,
          priority: TaskPriority.HIGH,
          estimated_duration: 3,
          buffer_time: 0.5,
          days_before_event: 75,
          order_index: 2,
          specialties_required: ['logistics'],
          dependencies: [],
        },
        {
          title: 'Transportation arrangements',
          description: 'Arrange airport transfers and local transportation',
          category: TaskCategory.TRANSPORTATION,
          priority: TaskPriority.MEDIUM,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 30,
          order_index: 3,
          specialties_required: ['transportation'],
          dependencies: [],
        },
        {
          title: 'Cultural accommodation planning',
          description: 'Plan for cultural dietary and religious accommodations',
          category: TaskCategory.CATERING,
          priority: TaskPriority.MEDIUM,
          estimated_duration: 2,
          buffer_time: 0.5,
          days_before_event: 45,
          order_index: 4,
          specialties_required: ['catering'],
          dependencies: [],
        },
        {
          title: 'Welcome packet creation',
          description: 'Create welcome packets with local information',
          category: TaskCategory.CLIENT_MANAGEMENT,
          priority: TaskPriority.LOW,
          estimated_duration: 1.5,
          buffer_time: 0.5,
          days_before_event: 14,
          order_index: 5,
          specialties_required: ['client_management'],
          dependencies: [],
        },
      ],
    },
  ];

  async applyWeddingTemplate(
    templateId: string,
    weddingId: string,
    clientId: string,
    customizations?: {
      guest_count?: number;
      venue_type?: string;
      wedding_style?: string;
      special_requirements?: string[];
    },
  ): Promise<{ tasks: any[]; template: WeddingTaskTemplate }> {
    const template = TaskAutomationService.WEDDING_TEMPLATES.find(
      (t) => t.id === templateId,
    );
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Get wedding details for context
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('wedding_date, venue_type, estimated_guests')
      .eq('id', weddingId)
      .single();

    if (weddingError || !wedding) {
      throw new Error('Wedding not found');
    }

    // Calculate due dates based on wedding date
    const weddingDate = new Date(wedding.wedding_date);
    const tasks = template.tasks.map((task, index) => {
      const dueDate = new Date(weddingDate);
      dueDate.setDate(dueDate.getDate() - task.days_before_event);

      // If due date is in the past, set it to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dueDate < tomorrow) {
        dueDate.setTime(tomorrow.getTime());
      }

      return {
        wedding_id: weddingId,
        client_id: clientId,
        title: task.title,
        description: this.customizeDescription(
          task.description,
          customizations,
        ),
        category: task.category,
        priority: task.priority,
        estimated_duration: task.estimated_duration,
        buffer_time: task.buffer_time,
        deadline: dueDate.toISOString(),
        status: 'todo',
        order_index: task.order_index,
        specialties_required: task.specialties_required,
        metadata: {
          template_id: templateId,
          template_scenario: template.scenario,
          auto_generated: true,
          days_before_event: task.days_before_event,
          conditions: task.conditions || [],
        },
      };
    });

    // Insert tasks into database
    const { data: insertedTasks, error: insertError } = await supabase
      .from('tasks')
      .insert(tasks)
      .select();

    if (insertError) {
      throw new Error(`Failed to create tasks: ${insertError.message}`);
    }

    // Create dependencies between tasks
    if (insertedTasks) {
      await this.createTaskDependencies(template, insertedTasks);
    }

    // Log template usage
    await this.logTemplateUsage(templateId, weddingId, clientId);

    return { tasks: insertedTasks || [], template };
  }

  private customizeDescription(
    description: string,
    customizations?: any,
  ): string {
    if (!customizations) return description;

    let customized = description;
    if (customizations.guest_count) {
      customized = customized.replace(
        '{guest_count}',
        customizations.guest_count.toString(),
      );
    }
    if (customizations.venue_type) {
      customized = customized.replace(
        '{venue_type}',
        customizations.venue_type,
      );
    }

    return customized;
  }

  private async createTaskDependencies(
    template: WeddingTaskTemplate,
    insertedTasks: any[],
  ): Promise<void> {
    const dependencies = [];

    for (const task of template.tasks) {
      if (task.dependencies.length > 0) {
        const successorTask = insertedTasks.find(
          (t) => t.order_index === task.order_index,
        );

        for (const dep of task.dependencies) {
          const predecessorTask = insertedTasks.find(
            (t) => t.order_index === dep.predecessor_order,
          );

          if (successorTask && predecessorTask) {
            dependencies.push({
              predecessor_task_id: predecessorTask.id,
              successor_task_id: successorTask.id,
              dependency_type: dep.dependency_type,
              lag_time: dep.lag_time,
            });
          }
        }
      }
    }

    if (dependencies.length > 0) {
      await supabase.from('task_dependencies').insert(dependencies);
    }
  }

  private async logTemplateUsage(
    templateId: string,
    weddingId: string,
    clientId: string,
  ): Promise<void> {
    await supabase.from('template_usage').insert({
      template_id: templateId,
      wedding_id: weddingId,
      client_id: clientId,
      usage_date: new Date().toISOString(),
    });
  }

  // RSVP-based automation (as referenced in Sarah's example)
  async handleRSVPThreshold(
    weddingId: string,
    newCount: number,
    previousCount: number,
  ): Promise<void> {
    const thresholds = [
      { count: 50, template: 'medium-wedding-template' },
      { count: 100, template: 'large-wedding-template' },
      { count: 140, template: 'extra-large-wedding-template' }, // Sarah's brother chair example
      { count: 200, template: 'mega-wedding-template' },
    ];

    for (const threshold of thresholds) {
      if (previousCount < threshold.count && newCount >= threshold.count) {
        // Trigger specific tasks for this threshold
        await this.createRSVPThresholdTasks(
          weddingId,
          threshold.count,
          newCount,
        );
      }
    }
  }

  private async createRSVPThresholdTasks(
    weddingId: string,
    threshold: number,
    actualCount: number,
  ): Promise<void> {
    const thresholdTasks = {
      140: [
        // Sarah's example from instructions
        {
          title: 'Extra chairs setup',
          description: `URGENT: ${actualCount} guests requires additional chair setup - contact venue immediately`,
          category: TaskCategory.VENUE_MANAGEMENT,
          priority: TaskPriority.CRITICAL,
          estimated_duration: 2,
          assignee_note: 'Assign to brother or closest available family member',
        },
        {
          title: 'Additional table arrangements',
          description: `Plan additional table arrangements for ${actualCount} guests`,
          category: TaskCategory.VENUE_MANAGEMENT,
          priority: TaskPriority.HIGH,
          estimated_duration: 1.5,
        },
      ],
    };

    const tasks = thresholdTasks[threshold as keyof typeof thresholdTasks];
    if (tasks) {
      const { data: wedding } = await supabase
        .from('weddings')
        .select('client_id, wedding_date')
        .eq('id', weddingId)
        .single();

      if (wedding) {
        const taskInserts = tasks.map((task) => ({
          wedding_id: weddingId,
          client_id: wedding.client_id,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          estimated_duration: task.estimated_duration,
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
          status: 'todo',
          metadata: {
            auto_generated: true,
            trigger_type: 'rsvp_threshold',
            threshold_count: threshold,
            actual_count: actualCount,
          },
        }));

        await supabase.from('tasks').insert(taskInserts);
      }
    }
  }

  // Get available templates
  static getAvailableTemplates(): WeddingTaskTemplate[] {
    return TaskAutomationService.WEDDING_TEMPLATES;
  }

  // Get template by scenario
  static getTemplateByScenario(
    scenario: WeddingScenario,
  ): WeddingTaskTemplate | undefined {
    return TaskAutomationService.WEDDING_TEMPLATES.find(
      (t) => t.scenario === scenario,
    );
  }

  // Get templates by guest count
  static getTemplatesByGuestCount(guestCount: number): WeddingTaskTemplate[] {
    if (guestCount >= 150) {
      return TaskAutomationService.WEDDING_TEMPLATES.filter(
        (t) =>
          t.scenario === WeddingScenario.LARGE_WEDDING_150_PLUS ||
          t.scenario === WeddingScenario.DAY_OF_SETUP ||
          t.scenario === WeddingScenario.VENDOR_COORDINATION,
      );
    } else if (guestCount < 50) {
      return TaskAutomationService.WEDDING_TEMPLATES.filter(
        (t) =>
          t.scenario === WeddingScenario.INTIMATE_WEDDING_UNDER_50 ||
          t.scenario === WeddingScenario.DAY_OF_SETUP,
      );
    } else {
      return TaskAutomationService.WEDDING_TEMPLATES.filter(
        (t) =>
          t.scenario === WeddingScenario.DAY_OF_SETUP ||
          t.scenario === WeddingScenario.VENDOR_COORDINATION,
      );
    }
  }

  // AUTOMATED ASSIGNMENT ENGINE METHODS

  // Intelligent task assignment based on team member profiles and workload
  async assignTasksAutomatically(
    weddingId: string,
    taskIds: string[],
  ): Promise<AssignmentResult[]> {
    const results: AssignmentResult[] = [];

    // Get team members for this wedding
    const teamMembers = await this.getWeddingTeamMembers(weddingId);
    const workloadAnalysis = await this.analyzeTeamWorkload(
      teamMembers.map((m) => m.id),
    );

    for (const taskId of taskIds) {
      const task = await this.getTaskDetails(taskId);
      if (!task) continue;

      const assignmentResult = await this.findOptimalAssignment(
        task,
        teamMembers,
        workloadAnalysis,
      );

      if (assignmentResult) {
        // Apply the assignment
        await this.applyTaskAssignment(taskId, assignmentResult);
        results.push(assignmentResult);
      }
    }

    return results;
  }

  // Find optimal team member for a specific task
  private async findOptimalAssignment(
    task: any,
    teamMembers: TeamMemberProfile[],
    workloadAnalysis: WorkloadAnalysis[],
  ): Promise<AssignmentResult | null> {
    const candidates = teamMembers.filter((member) => {
      // Basic eligibility filters
      const hasSpecialty = member.specialties.includes(task.category);
      const hasCapacity = member.current_workload < member.max_concurrent_tasks;
      const workload = workloadAnalysis.find(
        (w) => w.team_member_id === member.id,
      );
      const notOverloaded = workload?.overload_risk !== 'high';

      return hasSpecialty && hasCapacity && notOverloaded;
    });

    if (candidates.length === 0) {
      // Fallback to any available member with lower specialty match
      const fallbackCandidates = teamMembers.filter((member) => {
        const workload = workloadAnalysis.find(
          (w) => w.team_member_id === member.id,
        );
        return (
          member.current_workload < member.max_concurrent_tasks &&
          workload?.overload_risk !== 'high'
        );
      });

      if (fallbackCandidates.length > 0) {
        const bestFallback = fallbackCandidates[0];
        return {
          task_id: task.id,
          assigned_to: bestFallback.id,
          assignment_score: 0.3,
          assignment_reason: 'Fallback assignment - no specialist available',
          estimated_completion_date: this.calculateEstimatedCompletion(
            task,
            bestFallback,
          ),
          confidence_level: 0.4,
        };
      }
      return null;
    }

    // Score each candidate
    const scoredCandidates = candidates.map((member) => {
      const score = this.calculateAssignmentScore(
        task,
        member,
        workloadAnalysis,
      );
      return { member, score };
    });

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score.total - a.score.total);

    const bestCandidate = scoredCandidates[0];

    return {
      task_id: task.id,
      assigned_to: bestCandidate.member.id,
      assignment_score: bestCandidate.score.total,
      assignment_reason: bestCandidate.score.reasoning,
      estimated_completion_date: this.calculateEstimatedCompletion(
        task,
        bestCandidate.member,
      ),
      confidence_level: bestCandidate.score.confidence,
    };
  }

  // Calculate assignment score for a team member
  private calculateAssignmentScore(
    task: any,
    member: TeamMemberProfile,
    workloadAnalysis: WorkloadAnalysis[],
  ): { total: number; reasoning: string; confidence: number } {
    let score = 0;
    const reasons: string[] = [];

    // Specialty match (40% weight)
    const skillRating = member.skill_ratings[task.category] || 0;
    const specialtyScore = (skillRating / 10) * 0.4;
    score += specialtyScore;
    if (skillRating >= 8) reasons.push('Expert in task category');
    else if (skillRating >= 6) reasons.push('Experienced in task category');

    // Workload balance (30% weight)
    const workload = workloadAnalysis.find(
      (w) => w.team_member_id === member.id,
    );
    const capacityScore = workload
      ? (1 - workload.capacity_utilization) * 0.3
      : 0.3;
    score += capacityScore;
    if (workload?.capacity_utilization < 0.7)
      reasons.push('Has available capacity');

    // Priority matching (20% weight)
    const priorityScore =
      this.getPriorityMatchScore(task.priority, member.role) * 0.2;
    score += priorityScore;

    // Availability timing (10% weight)
    const availabilityScore =
      this.getAvailabilityScore(task.deadline, member.availability_schedule) *
      0.1;
    score += availabilityScore;

    // Preference bonus
    if (member.preferred_task_types.includes(task.category)) {
      score += 0.05;
      reasons.push('Matches task preferences');
    }

    const confidence = Math.min(0.95, score + reasons.length * 0.05);

    return {
      total: Math.min(1.0, score),
      reasoning: reasons.join(', ') || 'Standard assignment',
      confidence,
    };
  }

  private getPriorityMatchScore(
    taskPriority: TaskPriority,
    memberRole: string,
  ): number {
    const priorityWeights = {
      [TaskPriority.CRITICAL]: {
        admin: 1.0,
        senior: 0.9,
        coordinator: 0.7,
        assistant: 0.3,
      },
      [TaskPriority.HIGH]: {
        admin: 0.9,
        senior: 1.0,
        coordinator: 0.9,
        assistant: 0.6,
      },
      [TaskPriority.MEDIUM]: {
        admin: 0.7,
        senior: 0.8,
        coordinator: 1.0,
        assistant: 0.8,
      },
      [TaskPriority.LOW]: {
        admin: 0.5,
        senior: 0.6,
        coordinator: 0.8,
        assistant: 1.0,
      },
    };

    return priorityWeights[taskPriority]?.[memberRole] || 0.5;
  }

  private getAvailabilityScore(
    deadline: Date,
    schedule: WeeklySchedule,
  ): number {
    // Simplified availability scoring
    // In a real implementation, this would check actual calendar availability
    const totalSlots = Object.values(schedule).reduce(
      (sum, day) => sum + day.length,
      0,
    );
    return Math.min(1.0, totalSlots / 20); // Normalize against 20 slots per week
  }

  private calculateEstimatedCompletion(
    task: any,
    member: TeamMemberProfile,
  ): Date {
    const now = new Date();
    const daysToAdd = Math.ceil(
      task.estimated_duration / (member.available_hours_per_week / 7),
    );
    const completionDate = new Date(now);
    completionDate.setDate(completionDate.getDate() + daysToAdd);
    return completionDate;
  }

  // Get team members for a wedding
  private async getWeddingTeamMembers(
    weddingId: string,
  ): Promise<TeamMemberProfile[]> {
    const { data, error } = await supabase
      .from('wedding_team_assignments')
      .select(
        `
        team_member:team_members(
          id, name, email, role, specialties, current_workload, 
          available_hours_per_week, timezone, skill_ratings,
          availability_schedule, preferred_task_types, max_concurrent_tasks
        )
      `,
      )
      .eq('wedding_id', weddingId);

    if (error) throw error;

    return data?.map((item) => item.team_member).filter(Boolean) || [];
  }

  // Analyze current workload for team members
  private async analyzeTeamWorkload(
    memberIds: string[],
  ): Promise<WorkloadAnalysis[]> {
    const analyses: WorkloadAnalysis[] = [];

    for (const memberId of memberIds) {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, status, deadline, estimated_duration')
        .eq('assigned_to', memberId)
        .in('status', ['todo', 'in_progress']);

      if (error) continue;

      const currentTasks = tasks?.length || 0;
      const upcomingDeadlines =
        tasks?.filter((t) => {
          const deadline = new Date(t.deadline);
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          return deadline <= nextWeek;
        }).length || 0;

      const totalHours =
        tasks?.reduce((sum, t) => sum + (t.estimated_duration || 0), 0) || 0;
      const capacityUtilization = Math.min(1.0, totalHours / 40); // Assuming 40h/week capacity

      analyses.push({
        team_member_id: memberId,
        current_tasks: currentTasks,
        upcoming_deadlines: upcomingDeadlines,
        capacity_utilization: capacityUtilization,
        availability_next_week: Math.max(0, 40 - totalHours),
        overload_risk:
          capacityUtilization > 0.9
            ? 'high'
            : capacityUtilization > 0.75
              ? 'medium'
              : 'low',
      });
    }

    return analyses;
  }

  // Get task details
  private async getTaskDetails(taskId: string): Promise<any> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    return error ? null : data;
  }

  // Apply the task assignment
  private async applyTaskAssignment(
    taskId: string,
    assignment: AssignmentResult,
  ): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({
        assigned_to: assignment.assigned_to,
        metadata: {
          assignment_score: assignment.assignment_score,
          assignment_reason: assignment.assignment_reason,
          auto_assigned: true,
          assigned_at: new Date().toISOString(),
        },
      })
      .eq('id', taskId);

    if (error) throw error;

    // Log the assignment
    await supabase.from('task_assignment_log').insert({
      task_id: taskId,
      assigned_to: assignment.assigned_to,
      assignment_method: 'automated',
      assignment_score: assignment.assignment_score,
      assignment_reason: assignment.assignment_reason,
      confidence_level: assignment.confidence_level,
    });
  }

  // Trigger-based assignment processing
  async processAutomationTriggers(
    weddingId: string,
    triggerType: 'rsvp_update' | 'date_proximity' | 'vendor_status_change',
    triggerData: Record<string, any>,
  ): Promise<void> {
    const applicableTemplates = TaskAutomationService.WEDDING_TEMPLATES.filter(
      (template) =>
        template.triggers.some((trigger) =>
          trigger.type.includes(triggerType.split('_')[0]),
        ),
    );

    for (const template of applicableTemplates) {
      for (const trigger of template.triggers) {
        if (this.evaluateTriggerConditions(trigger.conditions, triggerData)) {
          await this.executeTriggerActions(
            trigger.actions,
            weddingId,
            triggerData,
          );
        }
      }
    }
  }

  private evaluateTriggerConditions(
    conditions: TriggerCondition[],
    data: Record<string, any>,
  ): boolean {
    return conditions.every((condition) => {
      const value = data[condition.field];
      switch (condition.operator) {
        case 'eq':
          return value === condition.value;
        case 'gt':
          return value > condition.value;
        case 'lt':
          return value < condition.value;
        case 'gte':
          return value >= condition.value;
        case 'lte':
          return value <= condition.value;
        case 'in':
          return (
            Array.isArray(condition.value) && condition.value.includes(value)
          );
        case 'contains':
          return String(value).includes(String(condition.value));
        default:
          return false;
      }
    });
  }

  private async executeTriggerActions(
    actions: TriggerAction[],
    weddingId: string,
    triggerData: Record<string, any>,
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'create_task':
          await this.createTriggeredTask(
            weddingId,
            action.payload,
            triggerData,
          );
          break;
        case 'assign_template':
          await this.assignTriggeredTemplate(
            weddingId,
            action.payload.template_id,
          );
          break;
        case 'send_notification':
          await this.sendTriggeredNotification(action.payload, triggerData);
          break;
        case 'update_priority':
          await this.updateTaskPriorities(weddingId, action.payload);
          break;
      }
    }
  }

  private async createTriggeredTask(
    weddingId: string,
    payload: Record<string, any>,
    triggerData: Record<string, any>,
  ): Promise<void> {
    const { data: wedding } = await supabase
      .from('weddings')
      .select('client_id')
      .eq('id', weddingId)
      .single();

    if (!wedding) return;

    const task = {
      wedding_id: weddingId,
      client_id: wedding.client_id,
      title: payload.title,
      description: this.replacePlaceholders(payload.description, triggerData),
      category: payload.category,
      priority: payload.priority,
      estimated_duration: payload.estimated_duration || 1,
      deadline: new Date(
        Date.now() + (payload.days_from_now || 1) * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: 'todo',
      metadata: {
        auto_generated: true,
        trigger_type: 'automation',
        trigger_data: triggerData,
      },
    };

    const { data: createdTask } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (createdTask && payload.auto_assign) {
      await this.assignTasksAutomatically(weddingId, [createdTask.id]);
    }
  }

  private async assignTriggeredTemplate(
    weddingId: string,
    templateId: string,
  ): Promise<void> {
    const template = TaskAutomationService.WEDDING_TEMPLATES.find(
      (t) => t.id === templateId,
    );
    if (template) {
      const { data: wedding } = await supabase
        .from('weddings')
        .select('client_id')
        .eq('id', weddingId)
        .single();

      if (wedding) {
        await this.applyWeddingTemplate(
          templateId,
          weddingId,
          wedding.client_id,
        );
      }
    }
  }

  private async sendTriggeredNotification(
    payload: Record<string, any>,
    triggerData: Record<string, any>,
  ): Promise<void> {
    // Implementation would integrate with notification service
    console.log('Triggered notification:', payload, triggerData);
  }

  private async updateTaskPriorities(
    weddingId: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ priority: payload.new_priority })
      .eq('wedding_id', weddingId)
      .eq('category', payload.category);

    if (error) console.error('Failed to update task priorities:', error);
  }

  private replacePlaceholders(
    template: string,
    data: Record<string, any>,
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  // Get assignment analytics
  async getAssignmentAnalytics(weddingId: string): Promise<any> {
    const { data: assignments, error } = await supabase
      .from('task_assignment_log')
      .select(
        `
        *,
        task:tasks(category, priority, status)
      `,
      )
      .eq('task.wedding_id', weddingId);

    if (error) return null;

    const totalAssignments = assignments?.length || 0;
    const autoAssignments =
      assignments?.filter((a) => a.assignment_method === 'automated').length ||
      0;
    const avgScore =
      assignments?.reduce((sum, a) => sum + (a.assignment_score || 0), 0) /
        totalAssignments || 0;
    const avgConfidence =
      assignments?.reduce((sum, a) => sum + (a.confidence_level || 0), 0) /
        totalAssignments || 0;

    return {
      total_assignments: totalAssignments,
      automated_assignments: autoAssignments,
      automation_rate:
        totalAssignments > 0 ? autoAssignments / totalAssignments : 0,
      average_assignment_score: avgScore,
      average_confidence: avgConfidence,
      assignment_distribution: this.getAssignmentDistribution(
        assignments || [],
      ),
    };
  }

  private getAssignmentDistribution(
    assignments: any[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    assignments.forEach((assignment) => {
      const assigneeId = assignment.assigned_to;
      distribution[assigneeId] = (distribution[assigneeId] || 0) + 1;
    });
    return distribution;
  }
}

export { WeddingScenario, type WeddingTaskTemplate, type TemplateTask };
