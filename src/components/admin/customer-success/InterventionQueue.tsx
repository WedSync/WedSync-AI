'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  AlertTriangle,
  X,
  Edit3,
  MoreHorizontal,
} from 'lucide-react';
import { InterventionResponse } from '@/types/customer-success-api';
import { cn } from '@/lib/utils';
import { InterventionModal } from './InterventionModal';

interface InterventionQueueProps {
  interventions?: InterventionResponse[];
  isLoading: boolean;
  onRefresh: () => void;
  searchQuery: string;
}

export function InterventionQueue({
  interventions,
  isLoading,
  onRefresh,
  searchQuery,
}: InterventionQueueProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] =
    useState<InterventionResponse | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'high':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'low':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'in_progress':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'cancelled':
        return 'text-gray-700 bg-gray-100 border-gray-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    return new Date(dueDateString) < new Date();
  };

  const filteredInterventions =
    interventions?.filter((intervention) => {
      const matchesStatus =
        statusFilter === 'all' || intervention.status === statusFilter;
      const matchesPriority =
        priorityFilter === 'all' || intervention.priority === priorityFilter;
      const matchesSearch =
        !searchQuery ||
        intervention.client_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        intervention.title.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesPriority && matchesSearch;
    }) || [];

  const handleCreateIntervention = () => {
    setShowCreateModal(true);
  };

  const handleEditIntervention = (intervention: InterventionResponse) => {
    setSelectedIntervention(intervention);
    setShowEditModal(true);
  };

  const handleUpdateStatus = async (
    interventionId: string,
    newStatus: string,
  ) => {
    // TODO: Implement status update API call
    console.log('Update status:', interventionId, newStatus);
    onRefresh();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <CardTitle>Intervention Queue</CardTitle>
              <CardDescription>
                Manage customer success interventions and follow-ups
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleCreateIntervention}>
                <Plus className="h-4 w-4 mr-2" />
                New Intervention
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Interventions List */}
      <Card>
        <CardContent className="p-0">
          {filteredInterventions.length > 0 ? (
            <div className="divide-y">
              {filteredInterventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          getPriorityColor(intervention.priority),
                        )}
                      >
                        {getTypeIcon(intervention.type)}
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-sm">
                            {intervention.title}
                          </h3>
                          {isOverdue(intervention.due_date) &&
                            intervention.status !== 'completed' && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {intervention.client_name}
                          </span>
                          <span>•</span>
                          <span>
                            Created {formatDate(intervention.created_at)}
                          </span>
                          {intervention.due_date && (
                            <>
                              <span>•</span>
                              <span
                                className={
                                  isOverdue(intervention.due_date)
                                    ? 'text-red-600'
                                    : ''
                                }
                              >
                                Due {formatDateTime(intervention.due_date)}
                              </span>
                            </>
                          )}
                        </div>

                        {intervention.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {intervention.description}
                          </p>
                        )}

                        {intervention.assigned_user && (
                          <div className="flex items-center space-x-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Assigned to {intervention.assigned_user.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          getPriorityColor(intervention.priority),
                        )}
                      >
                        {intervention.priority}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs flex items-center gap-1',
                          getStatusColor(intervention.status),
                        )}
                      >
                        {getStatusIcon(intervention.status)}
                        {intervention.status.replace('_', ' ')}
                      </Badge>

                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditIntervention(intervention)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        <Select
                          value={intervention.status}
                          onValueChange={(value) =>
                            handleUpdateStatus(intervention.id, value)
                          }
                        >
                          <SelectTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No interventions found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ||
                statusFilter !== 'all' ||
                priorityFilter !== 'all'
                  ? 'No interventions match your current filters.'
                  : 'No interventions have been created yet.'}
              </p>
              {searchQuery ||
              statusFilter !== 'all' ||
              priorityFilter !== 'all' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={handleCreateIntervention}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Intervention
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <InterventionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          onRefresh();
        }}
        mode="create"
      />

      <InterventionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedIntervention(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setSelectedIntervention(null);
          onRefresh();
        }}
        mode="edit"
        intervention={selectedIntervention}
      />
    </div>
  );
}
