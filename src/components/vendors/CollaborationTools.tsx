'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  DocumentIcon,
  CalendarIcon,
  CurrencyPoundIcon,
  UsersIcon,
  ShareIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  LinkIcon,
  FolderOpenIcon,
  ChartPieIcon,
  HandshakeIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

interface CollaborativeProject {
  id: string;
  project_name: string;
  client_name: string;
  wedding_date: string;
  venue_name: string;
  total_budget: number;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  lead_vendor_id: string;
  lead_vendor_name: string;
  collaborating_vendors: {
    vendor_id: string;
    business_name: string;
    role: string;
    revenue_share_percentage: number;
    status: 'invited' | 'accepted' | 'declined';
  }[];
  shared_tasks_count: number;
  shared_documents_count: number;
  last_activity: string;
  created_at: string;
}

interface SharedTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  assigned_to_vendor_id?: string;
  assigned_to_vendor_name?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  dependencies: string[];
  tags: string[];
  created_by_vendor_name: string;
  created_at: string;
  comments_count: number;
}

interface SharedDocument {
  id: string;
  project_id: string;
  title: string;
  file_type: string;
  file_size: number;
  uploaded_by_vendor_name: string;
  uploaded_at: string;
  access_level: 'view' | 'edit' | 'admin';
  version: number;
  tags: string[];
  download_count: number;
}

interface CollaborationMessage {
  id: string;
  project_id: string;
  sender_vendor_name: string;
  sender_vendor_id: string;
  message: string;
  message_type: 'text' | 'task_update' | 'document_share' | 'system';
  attachments?: string[];
  created_at: string;
  is_pinned: boolean;
}

interface Props {
  currentVendorId: string;
  organizationId: string;
}

export function CollaborationTools({ currentVendorId, organizationId }: Props) {
  const [activeTab, setActiveTab] = useState<
    'projects' | 'tasks' | 'messages' | 'documents'
  >('projects');
  const [projects, setProjects] = useState<CollaborativeProject[]>([]);
  const [selectedProject, setSelectedProject] =
    useState<CollaborativeProject | null>(null);
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<SharedDocument[]>([]);
  const [collaborationMessages, setCollaborationMessages] = useState<
    CollaborationMessage[]
  >([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborativeProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTasks(selectedProject.id);
      fetchProjectDocuments(selectedProject.id);
      fetchProjectMessages(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchCollaborativeProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/placeholder');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch collaborative projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (projectId: string) => {
    try {
      const response = await fetch('/api/placeholder');
      if (response.ok) {
        const data = await response.json();
        setSharedTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch project tasks:', error);
    }
  };

  const fetchProjectDocuments = async (projectId: string) => {
    try {
      const response = await fetch('/api/placeholder');
      if (response.ok) {
        const data = await response.json();
        setSharedDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch project documents:', error);
    }
  };

  const fetchProjectMessages = async (projectId: string) => {
    try {
      const response = await fetch('/api/placeholder');
      if (response.ok) {
        const data = await response.json();
        setCollaborationMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch project messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProject) return;

    try {
      const response = await fetch('/api/vendors/collaboration/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          sender_vendor_id: currentVendorId,
          message: newMessage.trim(),
          message_type: 'text',
        }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchProjectMessages(selectedProject.id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch('/api/vendors/collaboration/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          status,
          updated_by: currentVendorId,
        }),
      });

      if (response.ok && selectedProject) {
        fetchProjectTasks(selectedProject.id);
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-100 text-blue-700';
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'review':
        return 'bg-purple-100 text-purple-700';
      case 'todo':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Collaboration Hub</h2>
          <p className="text-gray-600">
            Work together on weddings and projects with your network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <BriefcaseIcon className="size-4" />
            {projects.length} Active Projects
          </Badge>
          <Button>
            <PlusIcon className="size-4 mr-1" />
            New Collaboration
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedProject?.id || ''}
                onValueChange={(value) => {
                  const project = projects.find((p) => p.id === value);
                  if (project) setSelectedProject(project);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>
                          {project.project_name} - {project.client_name}
                        </span>
                        <Badge
                          className={`ml-2 text-xs ${getStatusColor(project.status)}`}
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProject && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon className="size-4" />
                <span>{formatDate(selectedProject.wedding_date)}</span>
                <span className="mx-2">•</span>
                <CurrencyPoundIcon className="size-4" />
                <span>£{selectedProject.total_budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading collaboration tools...</p>
        </div>
      ) : !selectedProject ? (
        <Card className="p-12 text-center">
          <BriefcaseIcon className="size-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Collaborative Projects
          </h3>
          <p className="text-gray-600 mb-4">
            Start collaborating with other vendors on wedding projects
          </p>
          <Button>
            <PlusIcon className="size-4 mr-1" />
            Create First Project
          </Button>
        </Card>
      ) : (
        <>
          {/* Project Overview */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {selectedProject.project_name}
                </h3>
                <p className="text-gray-600">
                  {selectedProject.client_name} - {selectedProject.venue_name}
                </p>
              </div>
              <Badge
                className={`${getStatusColor(selectedProject.status)} font-medium`}
              >
                {selectedProject.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <UsersIcon className="size-6 text-blue-500 mx-auto mb-1" />
                <div className="font-medium">
                  {selectedProject.collaborating_vendors.length + 1}
                </div>
                <div className="text-sm text-gray-600">Vendors</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckIcon className="size-6 text-green-500 mx-auto mb-1" />
                <div className="font-medium">
                  {selectedProject.shared_tasks_count}
                </div>
                <div className="text-sm text-gray-600">Tasks</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <DocumentIcon className="size-6 text-purple-500 mx-auto mb-1" />
                <div className="font-medium">
                  {selectedProject.shared_documents_count}
                </div>
                <div className="text-sm text-gray-600">Documents</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <CurrencyPoundIcon className="size-6 text-yellow-500 mx-auto mb-1" />
                <div className="font-medium">
                  £{selectedProject.total_budget.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Budget</div>
              </div>
            </div>

            {/* Collaborating Vendors */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Collaborating Vendors</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <HandshakeIcon className="size-3" />
                  {selectedProject.lead_vendor_name} (Lead)
                </Badge>
                {selectedProject.collaborating_vendors.map((vendor) => (
                  <Badge
                    key={vendor.vendor_id}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <span>{vendor.business_name}</span>
                    <span className="text-xs text-gray-500">
                      ({vendor.revenue_share_percentage}%)
                    </span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                {['tasks', 'messages', 'documents'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>
          </Card>

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Shared Tasks</h3>
                <Button size="sm">
                  <PlusIcon className="size-4 mr-1" />
                  Add Task
                </Button>
              </div>

              {sharedTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckIcon className="size-12 mx-auto mb-3 text-gray-300" />
                  <p>No shared tasks yet</p>
                  <p className="text-sm mt-1">
                    Create tasks to coordinate with your team
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sharedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge
                              className={`text-xs ${getPriorityColor(task.priority)}`}
                            >
                              {task.priority}
                            </Badge>
                            <Badge
                              className={`text-xs ${getTaskStatusColor(task.status)}`}
                            >
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Due: {formatDate(task.due_date)}</span>
                            {task.assigned_to_vendor_name && (
                              <span>
                                Assigned: {task.assigned_to_vendor_name}
                              </span>
                            )}
                            <span>By: {task.created_by_vendor_name}</span>
                            {task.comments_count > 0 && (
                              <span>{task.comments_count} comments</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="ml-4">
                          <Select
                            value={task.status}
                            onValueChange={(value) =>
                              updateTaskStatus(task.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">
                                In Progress
                              </SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="completed">
                                Completed
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <Card className="p-6">
              <div className="flex flex-col h-96">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Project Communication</h3>
                  <Badge variant="secondary">
                    {collaborationMessages.length} messages
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {collaborationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.sender_vendor_id === currentVendorId
                          ? 'bg-blue-50 ml-8'
                          : 'bg-gray-50 mr-8'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-sm">
                          {message.sender_vendor_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{message.message}</p>
                      {message.is_pinned && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Pinned
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <PaperAirplaneIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Shared Documents</h3>
                <Button size="sm">
                  <PlusIcon className="size-4 mr-1" />
                  Upload Document
                </Button>
              </div>

              {sharedDocuments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FolderOpenIcon className="size-12 mx-auto mb-3 text-gray-300" />
                  <p>No shared documents yet</p>
                  <p className="text-sm mt-1">
                    Upload documents to share with your team
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <DocumentIcon className="size-6 text-gray-400" />
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(doc.file_size)} • Uploaded by{' '}
                            {doc.uploaded_by_vendor_name} • v{doc.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {doc.access_level}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <LinkIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
