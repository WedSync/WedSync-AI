export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum TaskCategory {
  VENUE_MANAGEMENT = 'venue_management',
  VENDOR_COORDINATION = 'vendor_coordination',
  CLIENT_MANAGEMENT = 'client_management',
  LOGISTICS = 'logistics',
  DESIGN = 'design',
  PHOTOGRAPHY = 'photography',
  CATERING = 'catering',
  FLORALS = 'florals',
  MUSIC = 'music',
  TRANSPORTATION = 'transportation',
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish',
}

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  wedding_id: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  assigned_by: string;
  created_by: string;
  estimated_duration: number; // in hours
  buffer_time: number; // in hours
  deadline: Date;
  start_date: Date | null;
  completion_date: Date | null;
  progress_percentage: number;
  is_critical_path: boolean;
  notes: string;
  attachments: string[];
  created_at: Date;
  updated_at: Date;
}

export interface TaskDependency {
  id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: DependencyType;
  lag_time: number; // in hours
  created_at: Date;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_to: string;
  assigned_by: string;
  role: string;
  is_primary: boolean;
  assigned_at: Date;
  accepted_at: Date | null;
  declined_at: Date | null;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  specialties: TaskCategory[];
  current_workload: number; // percentage
  available_hours_per_week: number;
  timezone: string;
  avatar_url: string | null;
}

export interface WorkloadMetrics {
  team_member_id: string;
  current_tasks: number;
  overdue_tasks: number;
  upcoming_deadlines: number;
  capacity_utilization: number;
  weekly_hours_scheduled: number;
  efficiency_score: number;
}

export interface TaskNotification {
  id: string;
  task_id: string;
  recipient_id: string;
  notification_type:
    | 'assignment'
    | 'deadline_reminder'
    | 'status_change'
    | 'dependency_update';
  title: string;
  message: string;
  is_read: boolean;
  scheduled_for: Date;
  sent_at: Date | null;
  created_at: Date;
}

export interface CriticalPath {
  tasks: WorkflowTask[];
  total_duration: number;
  slack_time: number;
  bottlenecks: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  category?: TaskCategory[];
  assigned_to?: string[];
  deadline_from?: Date;
  deadline_to?: Date;
  is_overdue?: boolean;
  is_critical_path?: boolean;
}

export interface TaskCreateInput {
  title: string;
  description: string;
  wedding_id: string;
  category: TaskCategory;
  priority: TaskPriority;
  assigned_to?: string;
  estimated_duration: number;
  buffer_time: number;
  deadline: Date;
  dependencies?: {
    predecessor_task_id: string;
    dependency_type: DependencyType;
    lag_time: number;
  }[];
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigned_to?: string;
  estimated_duration?: number;
  buffer_time?: number;
  deadline?: Date;
  start_date?: Date;
  completion_date?: Date;
  progress_percentage?: number;
  notes?: string;
}

export interface DashboardMetrics {
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  critical_path_tasks: number;
  team_utilization: number;
  on_time_completion_rate: number;
  average_task_duration: number;
  upcoming_deadlines: number;
}

// WS-156 Task Creation System - Additional Types

export interface TaskTemplate {
  id: string;
  name: string;
  category: TaskCategory;
  description: string;
  tasks: TaskTemplateItem[];
  tags: string[];
  popularity: number; // 0-100
  is_featured: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskTemplateItem {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimated_duration: number;
  buffer_time: number;
  order: number;
  is_required: boolean;
}

export interface TimingConflict {
  type:
    | 'overlap'
    | 'buffer_violation'
    | 'critical_path_conflict'
    | 'resource_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conflictingTasks: string[];
  proposedTime?: {
    start: Date;
    end: Date;
    duration: number;
  };
  message: string;
  suggestions: ConflictResolution[];
  requiredBuffer?: number;
  actualBuffer?: number;
}

export interface ConflictResolution {
  id: string;
  type:
    | 'time_adjustment'
    | 'duration_reduction'
    | 'split_task'
    | 'buffer_adjustment'
    | 'resource_reassignment';
  description: string;
  newStartTime?: Date;
  newDuration?: number;
  newBufferTime?: number;
  newTasks?: Partial<TaskCreateInput>[];
  newAssignee?: string;
  effort_required: 'low' | 'medium' | 'high';
  impact: 'minimal' | 'moderate' | 'significant';
}

export interface TimelineVisualization {
  date: Date;
  tasks: TimelineTask[];
  conflicts: TimingConflict[];
  availableSlots: TimeSlot[];
  totalHours: number;
  utilizationPercentage: number;
}

export interface TimelineTask {
  taskId: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  startTime: Date;
  endTime: Date;
  duration: number;
  bufferTime: number;
  assignee?: string;
  status: TaskStatus;
  isCriticalPath: boolean;
  hasConflicts: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number;
  isAvailable: boolean;
  conflicts: string[];
  recommendationScore: number; // 0-100
}

export interface TaskValidationResult {
  isValid: boolean;
  conflicts: TimingConflict[];
  warnings: ValidationWarning[];
  suggestions: ConflictResolution[];
  estimatedImpact: {
    scheduleDelay: number; // in hours
    resourceUtilization: number; // percentage
    criticalPathAffected: boolean;
  };
}

export interface ValidationWarning {
  type:
    | 'tight_schedule'
    | 'resource_overallocation'
    | 'missing_dependencies'
    | 'unrealistic_timing';
  severity: 'info' | 'warning' | 'error';
  message: string;
  field?: string;
  recommendation?: string;
}

export interface TaskCreatorProps {
  weddingId: string;
  teamMembers: TeamMember[];
  availableTasks?: {
    id: string;
    title: string;
    category: TaskCategory;
  }[];
  onSubmit: (task: TaskCreateInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface TaskTemplateLibraryProps {
  templates: TaskTemplate[];
  selectedCategory?: TaskCategory | null;
  onTemplateSelect: (template: TaskTemplate) => void;
  onTemplateCustomize: (template: TaskTemplate) => void;
  onClose: () => void;
  isVisible: boolean;
}

export interface TaskTimingValidatorProps {
  existingTasks: WorkflowTask[];
  proposedTask: Partial<TaskCreateInput> & {
    start_date?: Date | null;
  };
  onConflictDetected: (conflicts: TimingConflict) => void;
  onConflictResolved: (resolution: ConflictResolution) => void;
  realTimeValidation?: boolean;
}

export interface TaskPageState {
  tasks: WorkflowTask[];
  filters: TaskFilter;
  searchQuery: string;
  viewMode: 'list' | 'timeline' | 'kanban';
  selectedTask: WorkflowTask | null;
  isCreateModalOpen: boolean;
  isTemplateLibraryOpen: boolean;
  sortBy: 'deadline' | 'priority' | 'created' | 'category';
  sortOrder: 'asc' | 'desc';
}

export interface TaskFormValidation {
  title: { isValid: boolean; error?: string };
  category: { isValid: boolean; error?: string };
  deadline: { isValid: boolean; error?: string };
  estimated_duration: { isValid: boolean; error?: string };
  buffer_time: { isValid: boolean; error?: string };
  timing: {
    isValid: boolean;
    conflicts: TimingConflict[];
    warnings: ValidationWarning[];
  };
}

export interface TaskCreationFormState {
  data: Partial<TaskCreateInput>;
  validation: TaskFormValidation;
  isSubmitting: boolean;
  hasUnsavedChanges: boolean;
  selectedTemplate: TaskTemplate | null;
  timingValidation: TaskValidationResult | null;
}
