'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Target,
  TrendingUp,
  User,
  Edit,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Intervention {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierAvatar?: string;
  type:
    | 'engagement_drop'
    | 'churn_risk'
    | 'feature_adoption'
    | 'satisfaction_issue'
    | 'performance_decline'
    | 'onboarding_support';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  assignedToAvatar?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  estimatedCompletion?: string;
  completionRate: number;
  description: string;
  notes?: string;
  expectedOutcome: string;
  actualOutcome?: string;
  healthImpact: number;
  successMetrics: Array<{
    metric: string;
    target: number;
    current: number;
    achieved: boolean;
  }>;
  timeline: Array<{
    date: string;
    action: string;
    details: string;
    actionBy: string;
  }>;
  communicationLog: Array<{
    date: string;
    type: 'email' | 'call' | 'meeting' | 'message';
    summary: string;
    outcome: string;
  }>;
}

interface InterventionWorkflowManagerProps {
  interventions: Intervention[];
  loading?: boolean;
}

/**
 * Intervention Workflow Manager Component
 *
 * Manages customer success intervention workflows:
 * - Active intervention tracking
 * - Workflow automation
 * - Progress monitoring
 * - Success metrics
 * - Communication logging
 */
export default function InterventionWorkflowManager({
  interventions,
  loading,
}: InterventionWorkflowManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'timeline'>(
    'kanban',
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] =
    useState<Intervention | null>(null);

  // Filter and sort interventions
  const filteredInterventions = useMemo(() => {
    if (!interventions) return [];

    let filtered = interventions.filter((intervention) => {
      const matchesSearch =
        intervention.supplierName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        intervention.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesStatus =
        selectedStatus === 'all' || intervention.status === selectedStatus;
      const matchesPriority =
        selectedPriority === 'all' ||
        intervention.priority === selectedPriority;
      const matchesType =
        selectedType === 'all' || intervention.type === selectedType;

      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });

    // Sort interventions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return getPriorityOrder(b.priority) - getPriorityOrder(a.priority);
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'healthImpact':
          return b.healthImpact - a.healthImpact;
        case 'createdAt':
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return filtered;
  }, [
    interventions,
    searchTerm,
    selectedStatus,
    selectedPriority,
    selectedType,
    sortBy,
  ]);

  // Group interventions by status for Kanban view
  const interventionsByStatus = useMemo(() => {
    const groups = {
      pending: [] as Intervention[],
      in_progress: [] as Intervention[],
      completed: [] as Intervention[],
      failed: [] as Intervention[],
      escalated: [] as Intervention[],
    };

    filteredInterventions.forEach((intervention) => {
      groups[intervention.status]?.push(intervention);
    });

    return groups;
  }, [filteredInterventions]);

  if (loading) {
    return <InterventionWorkflowManagerSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Intervention Workflow Manager
              <Badge variant="secondary">
                {filteredInterventions.length} active
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Intervention
              </Button>

              <div className="flex items-center">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                >
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                >
                  Timeline
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search interventions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedPriority}
              onValueChange={setSelectedPriority}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="engagement_drop">Engagement Drop</SelectItem>
                <SelectItem value="churn_risk">Churn Risk</SelectItem>
                <SelectItem value="feature_adoption">
                  Feature Adoption
                </SelectItem>
                <SelectItem value="satisfaction_issue">
                  Satisfaction Issue
                </SelectItem>
                <SelectItem value="performance_decline">
                  Performance Decline
                </SelectItem>
                <SelectItem value="onboarding_support">
                  Onboarding Support
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Latest</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="healthImpact">Health Impact</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Interventions Display */}
      {viewMode === 'kanban' && (
        <KanbanView
          interventionsByStatus={interventionsByStatus}
          onSelectIntervention={setSelectedIntervention}
        />
      )}

      {viewMode === 'list' && (
        <ListView
          interventions={filteredInterventions}
          onSelectIntervention={setSelectedIntervention}
        />
      )}

      {viewMode === 'timeline' && (
        <TimelineView
          interventions={filteredInterventions}
          onSelectIntervention={setSelectedIntervention}
        />
      )}

      {/* Selected Intervention Detail */}
      {selectedIntervention && (
        <InterventionDetail
          intervention={selectedIntervention}
          onClose={() => setSelectedIntervention(null)}
        />
      )}
    </div>
  );
}

function KanbanView({
  interventionsByStatus,
  onSelectIntervention,
}: {
  interventionsByStatus: Record<string, Intervention[]>;
  onSelectIntervention: (intervention: Intervention) => void;
}) {
  const statusColumns = [
    {
      key: 'pending',
      title: 'Pending',
      color: 'bg-yellow-100 border-yellow-200',
    },
    {
      key: 'in_progress',
      title: 'In Progress',
      color: 'bg-blue-100 border-blue-200',
    },
    {
      key: 'completed',
      title: 'Completed',
      color: 'bg-green-100 border-green-200',
    },
    { key: 'failed', title: 'Failed', color: 'bg-red-100 border-red-200' },
    {
      key: 'escalated',
      title: 'Escalated',
      color: 'bg-orange-100 border-orange-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statusColumns.map((column) => (
        <Card key={column.key} className={column.color}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {column.title}
              <Badge variant="secondary" className="text-xs">
                {interventionsByStatus[column.key]?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {interventionsByStatus[column.key]?.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                onClick={() => onSelectIntervention(intervention)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListView({
  interventions,
  onSelectIntervention,
}: {
  interventions: Intervention[];
  onSelectIntervention: (intervention: Intervention) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {interventions.map((intervention) => (
            <InterventionListItem
              key={intervention.id}
              intervention={intervention}
              onClick={() => onSelectIntervention(intervention)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineView({
  interventions,
  onSelectIntervention,
}: {
  interventions: Intervention[];
  onSelectIntervention: (intervention: Intervention) => void;
}) {
  const sortedInterventions = [...interventions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-8">
          {sortedInterventions.map((intervention, index) => (
            <div key={intervention.id} className="relative">
              {index < sortedInterventions.length - 1 && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
              )}
              <div className="flex gap-4">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 bg-background flex items-center justify-center text-xs font-medium',
                    getStatusColor(intervention.status),
                  )}
                >
                  {getStatusIcon(intervention.status)}
                </div>
                <InterventionTimelineItem
                  intervention={intervention}
                  onClick={() => onSelectIntervention(intervention)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InterventionCard({
  intervention,
  onClick,
}: {
  intervention: Intervention;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={intervention.supplierAvatar} />
                <AvatarFallback className="text-xs">
                  {intervention.supplierName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">
                {intervention.supplierName}
              </span>
            </div>
            <Badge
              variant={getPriorityVariant(intervention.priority)}
              className="text-xs"
            >
              {intervention.priority}
            </Badge>
          </div>

          {/* Type and Description */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              {formatInterventionType(intervention.type)}
            </div>
            <p className="text-sm line-clamp-2">{intervention.description}</p>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{intervention.completionRate}%</span>
            </div>
            <Progress value={intervention.completionRate} className="h-1" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatTimeAgo(intervention.updatedAt)}</span>
            {intervention.dueDate && (
              <span
                className={cn(
                  new Date(intervention.dueDate) < new Date()
                    ? 'text-red-600'
                    : '',
                )}
              >
                Due: {new Date(intervention.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InterventionListItem({
  intervention,
  onClick,
}: {
  intervention: Intervention;
  onClick: () => void;
}) {
  return (
    <div
      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Avatar>
            <AvatarImage src={intervention.supplierAvatar} />
            <AvatarFallback>
              {intervention.supplierName
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">
                {intervention.supplierName}
              </h4>
              <Badge variant={getPriorityVariant(intervention.priority)}>
                {intervention.priority}
              </Badge>
              <Badge variant={getStatusVariant(intervention.status)}>
                {intervention.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground mb-2">
              {formatInterventionType(intervention.type)} •{' '}
              {intervention.description}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Assigned to: {intervention.assignedTo}</span>
              <span>Updated: {formatTimeAgo(intervention.updatedAt)}</span>
              {intervention.dueDate && (
                <span
                  className={cn(
                    new Date(intervention.dueDate) < new Date()
                      ? 'text-red-600'
                      : '',
                  )}
                >
                  Due: {new Date(intervention.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-sm font-medium">
              {intervention.completionRate}%
            </div>
            <Progress
              value={intervention.completionRate}
              className="w-16 h-2"
            />
          </div>

          <div className="text-center">
            <div className="text-sm font-medium">
              {intervention.healthImpact}%
            </div>
            <div className="text-xs text-muted-foreground">Impact</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InterventionTimelineItem({
  intervention,
  onClick,
}: {
  intervention: Intervention;
  onClick: () => void;
}) {
  return (
    <div
      className="flex-1 bg-card border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium">{intervention.supplierName}</h4>
          <p className="text-sm text-muted-foreground">
            {formatInterventionType(intervention.type)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getPriorityVariant(intervention.priority)}>
            {intervention.priority}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatTimeAgo(intervention.updatedAt)}
          </span>
        </div>
      </div>

      <p className="text-sm mb-3">{intervention.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Progress value={intervention.completionRate} className="w-20 h-2" />
          <span className="text-xs text-muted-foreground">
            {intervention.completionRate}% complete
          </span>
        </div>

        <span className="text-xs font-medium">
          {intervention.healthImpact}% health impact
        </span>
      </div>
    </div>
  );
}

function InterventionDetail({
  intervention,
  onClose,
}: {
  intervention: Intervention;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {intervention.supplierName} -{' '}
            {formatInterventionType(intervention.type)}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="font-medium mb-3">Intervention Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={getStatusVariant(intervention.status)}>
                    {intervention.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge variant={getPriorityVariant(intervention.priority)}>
                    {intervention.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span>{intervention.assignedTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>
                    {new Date(intervention.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {intervention.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due date:</span>
                    <span
                      className={cn(
                        new Date(intervention.dueDate) < new Date()
                          ? 'text-red-600'
                          : '',
                      )}
                    >
                      {new Date(intervention.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            <div>
              <h3 className="font-medium mb-3">Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span>{intervention.completionRate}%</span>
                </div>
                <Progress value={intervention.completionRate} />
                <div className="flex justify-between text-sm">
                  <span>Expected Health Impact</span>
                  <span>{intervention.healthImpact}%</span>
                </div>
              </div>
            </div>

            {/* Success Metrics */}
            <div>
              <h3 className="font-medium mb-3">Success Metrics</h3>
              <div className="space-y-3">
                {intervention.successMetrics.map((metric, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{metric.metric}</span>
                      <span>
                        {metric.current} / {metric.target}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        (metric.current / metric.target) * 100,
                        100,
                      )}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-medium mb-3">Description</h3>
              <p className="text-sm text-muted-foreground">
                {intervention.description}
              </p>
            </div>

            {/* Expected Outcome */}
            <div>
              <h3 className="font-medium mb-3">Expected Outcome</h3>
              <p className="text-sm text-muted-foreground">
                {intervention.expectedOutcome}
              </p>
            </div>

            {/* Notes */}
            {intervention.notes && (
              <div>
                <h3 className="font-medium mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground">
                  {intervention.notes}
                </p>
              </div>
            )}

            {/* Communication Log */}
            <div>
              <h3 className="font-medium mb-3">Communication Log</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {intervention.communicationLog.map((log, index) => (
                  <div key={index} className="border rounded p-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="capitalize">{log.type}</span>
                      <span>{new Date(log.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium mb-1">{log.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.outcome}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InterventionWorkflowManagerSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Helper functions
function getPriorityOrder(priority: string): number {
  switch (priority) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function getPriorityVariant(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'pending':
      return 'outline';
    case 'failed':
      return 'destructive';
    case 'escalated':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'border-yellow-500 text-yellow-600';
    case 'in_progress':
      return 'border-blue-500 text-blue-600';
    case 'completed':
      return 'border-green-500 text-green-600';
    case 'failed':
      return 'border-red-500 text-red-600';
    case 'escalated':
      return 'border-orange-500 text-orange-600';
    default:
      return 'border-gray-500 text-gray-600';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'in_progress':
      return '🔄';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'escalated':
      return '🚨';
    default:
      return '❓';
  }
}

function formatInterventionType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInHours = Math.floor(
    (now.getTime() - time.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 48) return 'Yesterday';

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return time.toLocaleDateString();
}
