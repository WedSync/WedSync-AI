'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  FolderOpen,
  History,
  Tag,
  Share2,
  Users,
  Eye,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Settings,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  GitBranch,
  Archive,
  BookmarkPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplateVersion {
  id: string;
  version: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  changes: string[];
  isPublished: boolean;
  isDraft: boolean;
  components: any[];
  metadata: {
    category: string;
    tags: string[];
    complexity: number;
    estimatedSetupTime: number;
  };
}

interface TemplateCollaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  avatarUrl?: string;
  lastActive: string;
}

interface TemplateData {
  id: string;
  title: string;
  description: string;
  currentVersion: string;
  versions: TemplateVersion[];
  collaborators: TemplateCollaborator[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  visibility: 'private' | 'team' | 'public';
  metadata: {
    category: string;
    tags: string[];
    complexity: number;
    estimatedSetupTime: number;
    useCount: number;
    rating: number;
    reviews: number;
  };
  settings: {
    autoSave: boolean;
    collaborationEnabled: boolean;
    publicPreview: boolean;
    exportFormats: string[];
  };
}

interface TemplateManagementUIProps {
  currentTemplate?: TemplateData;
  onTemplateLoad: (template: TemplateData) => void;
  onTemplateSave: (template: TemplateData) => void;
  onTemplatePublish: (template: TemplateData) => void;
  onTemplateShare: (template: TemplateData, users: string[]) => void;
}

export function TemplateManagementUI({
  currentTemplate,
  onTemplateLoad,
  onTemplateSave,
  onTemplatePublish,
  onTemplateShare,
}: TemplateManagementUIProps) {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(
    currentTemplate || null,
  );
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    // In a real implementation, this would fetch from the API
    const mockTemplates: TemplateData[] = [
      {
        id: 'template-1',
        title: 'Luxury Wedding Photography Intake',
        description:
          'Complete client onboarding system with 73% conversion rate',
        currentVersion: '2.1.0',
        versions: [
          {
            id: 'version-1',
            version: '2.1.0',
            title: 'Enhanced RSVP System',
            description:
              'Added mobile-responsive RSVP with dietary preferences',
            createdAt: new Date().toISOString(),
            createdBy: 'Sarah Mitchell',
            changes: [
              'Mobile RSVP improvements',
              'Dietary preference fields',
              'Email notifications',
            ],
            isPublished: true,
            isDraft: false,
            components: [],
            metadata: {
              category: 'photography',
              tags: ['client-intake', 'luxury', 'high-conversion'],
              complexity: 4,
              estimatedSetupTime: 25,
            },
          },
          {
            id: 'version-2',
            version: '2.0.0',
            title: 'Major Redesign',
            description: 'Complete UI overhaul with new wedding themes',
            createdAt: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            createdBy: 'Sarah Mitchell',
            changes: [
              'New wedding themes',
              'Improved layouts',
              'Better mobile experience',
            ],
            isPublished: true,
            isDraft: false,
            components: [],
            metadata: {
              category: 'photography',
              tags: ['client-intake', 'redesign'],
              complexity: 4,
              estimatedSetupTime: 25,
            },
          },
        ],
        collaborators: [
          {
            id: 'collab-1',
            name: 'Sarah Mitchell',
            email: 'sarah@eliteweddingphoto.com',
            role: 'owner',
            lastActive: new Date().toISOString(),
          },
          {
            id: 'collab-2',
            name: 'James Wilson',
            email: 'james@photoassist.com',
            role: 'editor',
            lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ],
        createdAt: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          category: 'photography',
          tags: ['client-intake', 'luxury', 'high-conversion'],
          complexity: 4,
          estimatedSetupTime: 25,
          useCount: 234,
          rating: 4.9,
          reviews: 87,
        },
        settings: {
          autoSave: true,
          collaborationEnabled: true,
          publicPreview: true,
          exportFormats: ['html', 'pdf', 'png'],
        },
      },
    ];
    setTemplates(mockTemplates);
  }, []);

  const handleSaveTemplate = async (template: TemplateData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onTemplateSave(template);
      // Update local state
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? template : t)),
      );
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishTemplate = async (template: TemplateData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const publishedTemplate = {
        ...template,
        status: 'published' as const,
        publishedAt: new Date().toISOString(),
      };
      onTemplatePublish(publishedTemplate);
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? publishedTemplate : t)),
      );
      setShowPublishDialog(false);
    } catch (error) {
      console.error('Failed to publish template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(
    (template) =>
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.metadata.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'draft':
        return <Edit className="w-4 h-4 text-yellow-500" />;
      case 'review':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'archived':
        return <Archive className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Template Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your wedding email templates, versions, and collaborations
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates, tags, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Template List */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Templates ({filteredTemplates.length})
            </h3>

            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    'cursor-pointer hover:shadow-md transition-all',
                    selectedTemplate?.id === template.id &&
                      'ring-2 ring-blue-500',
                  )}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm line-clamp-2">
                        {template.title}
                      </CardTitle>
                      {getStatusIcon(template.status)}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>v{template.currentVersion}</span>
                      <span>
                        {format(new Date(template.updatedAt), 'MMM d')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {template.metadata.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {template.metadata.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.metadata.tags.length - 2}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-xs">
                          {template.metadata.rating}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span className="text-xs">
                          {template.metadata.useCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Template Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedTemplate ? (
            <TemplateDetails
              template={selectedTemplate}
              onSave={handleSaveTemplate}
              onPublish={handlePublishTemplate}
              onShare={onTemplateShare}
              isLoading={isLoading}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Template Selected
                </h3>
                <p className="text-gray-600 max-w-sm">
                  Select a template from the list to view its details, version
                  history, and management options.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateDetails({
  template,
  onSave,
  onPublish,
  onShare,
  isLoading,
}: {
  template: TemplateData;
  onSave: (template: TemplateData) => void;
  onPublish: (template: TemplateData) => void;
  onShare: (template: TemplateData, users: string[]) => void;
  isLoading: boolean;
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState(template);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleSave = () => {
    onSave(editedTemplate);
    setEditMode(false);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {editMode ? (
              <div className="space-y-4">
                <Input
                  value={editedTemplate.title}
                  onChange={(e) =>
                    setEditedTemplate({
                      ...editedTemplate,
                      title: e.target.value,
                    })
                  }
                  className="text-xl font-semibold"
                  placeholder="Template title"
                />
                <textarea
                  value={editedTemplate.description}
                  onChange={(e) =>
                    setEditedTemplate({
                      ...editedTemplate,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-3 text-sm border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Template description"
                />
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {template.title}
                </h1>
                <p className="text-gray-600">{template.description}</p>
              </div>
            )}

            <div className="flex items-center space-x-4 mt-4">
              <Badge
                variant={
                  template.status === 'published' ? 'default' : 'secondary'
                }
              >
                {getStatusIcon(template.status)}
                <span className="ml-1 capitalize">{template.status}</span>
              </Badge>
              <span className="text-sm text-gray-500">
                v{template.currentVersion}
              </span>
              <span className="text-sm text-gray-500">
                Updated {format(new Date(template.updatedAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-6">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditedTemplate(template);
                    setEditMode(false);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                {template.status !== 'published' && (
                  <Button
                    onClick={() => onPublish(template)}
                    disabled={isLoading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Publish
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Template Details Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <TemplateOverview template={template} />
          </TabsContent>

          <TabsContent value="versions" className="space-y-6">
            <VersionHistory versions={template.versions} />
          </TabsContent>

          <TabsContent value="collaborators" className="space-y-6">
            <CollaboratorManagement
              collaborators={template.collaborators}
              onInvite={(emails) =>
                console.log('Invite collaborators:', emails)
              }
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <TemplateAnalytics template={template} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <TemplateSettings
              settings={template.settings}
              onUpdate={(settings) =>
                setEditedTemplate({
                  ...editedTemplate,
                  settings,
                })
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TemplateOverview({ template }: { template: TemplateData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Template Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">
                Category
              </Label>
              <p className="text-sm mt-1 capitalize">
                {template.metadata.category}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">
                Complexity
              </Label>
              <p className="text-sm mt-1">{template.metadata.complexity}/5</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">
                Setup Time
              </Label>
              <p className="text-sm mt-1">
                {template.metadata.estimatedSetupTime} minutes
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">
                Usage Count
              </Label>
              <p className="text-sm mt-1">{template.metadata.useCount} times</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <Label className="text-sm font-medium text-gray-500 mb-2 block">
              Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {template.metadata.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {template.metadata.rating}
              </div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-xs text-gray-500">
                {template.metadata.reviews} reviews
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {template.metadata.useCount}
              </div>
              <p className="text-sm text-gray-600">Total Installs</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {template.versions.length}
              </div>
              <p className="text-sm text-gray-600">Versions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VersionHistory({ versions }: { versions: TemplateVersion[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Version History</h3>
        <Badge variant="outline">{versions.length} versions</Badge>
      </div>

      <div className="space-y-3">
        {versions.map((version, index) => (
          <Card key={version.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge
                      variant={version.isPublished ? 'default' : 'secondary'}
                    >
                      v{version.version}
                    </Badge>
                    <span className="font-medium">{version.title}</span>
                    {index === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    {version.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(
                        new Date(version.createdAt),
                        'MMM d, yyyy h:mm a',
                      )}
                    </span>
                    <span>by {version.createdBy}</span>
                  </div>

                  {version.changes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Changes:
                      </p>
                      <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                        {version.changes.map((change, idx) => (
                          <li key={idx}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <GitBranch className="w-4 h-4" />
                  </Button>
                  {!version.isPublished && index !== 0 && (
                    <Button size="sm" variant="outline">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CollaboratorManagement({
  collaborators,
  onInvite,
}: {
  collaborators: TemplateCollaborator[];
  onInvite: (emails: string[]) => void;
}) {
  const [inviteEmails, setInviteEmails] = useState('');

  const handleInvite = () => {
    const emails = inviteEmails
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    if (emails.length > 0) {
      onInvite(emails);
      setInviteEmails('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members ({collaborators.length})
            </span>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {collaborator.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{collaborator.name}</p>
                    <p className="text-xs text-gray-600">
                      {collaborator.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last active{' '}
                      {format(
                        new Date(collaborator.lastActive),
                        'MMM d, h:mm a',
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      collaborator.role === 'owner' ? 'default' : 'secondary'
                    }
                  >
                    {collaborator.role}
                  </Badge>
                  {collaborator.role !== 'owner' && (
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite New Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-emails">Email addresses</Label>
              <textarea
                id="invite-emails"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="Enter email addresses separated by commas..."
                className="w-full p-3 mt-1 text-sm border border-gray-300 rounded-md"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple email addresses with commas
              </p>
            </div>

            <Button onClick={handleInvite} disabled={!inviteEmails.trim()}>
              Send Invitations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateAnalytics({ template }: { template: TemplateData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {template.metadata.useCount}
              </div>
              <p className="text-sm text-gray-600">Total Installs</p>
              <p className="text-xs text-gray-500 mt-1">+12% this month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {template.metadata.rating}
              </div>
              <p className="text-sm text-gray-600">Avg. Rating</p>
              <p className="text-xs text-gray-500 mt-1">
                {template.metadata.reviews} reviews
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">87%</div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-xs text-gray-500 mt-1">Template completion</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>Analytics chart would be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateSettings({
  settings,
  onUpdate,
}: {
  settings: TemplateData['settings'];
  onUpdate: (settings: TemplateData['settings']) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Template Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-save</Label>
              <p className="text-xs text-gray-600">
                Automatically save changes every 30 seconds
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) =>
                onUpdate({ ...settings, autoSave: e.target.checked })
              }
              className="rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Collaboration</Label>
              <p className="text-xs text-gray-600">
                Allow team members to edit this template
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.collaborationEnabled}
              onChange={(e) =>
                onUpdate({
                  ...settings,
                  collaborationEnabled: e.target.checked,
                })
              }
              className="rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Public Preview</Label>
              <p className="text-xs text-gray-600">
                Allow public preview of this template
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.publicPreview}
              onChange={(e) =>
                onUpdate({ ...settings, publicPreview: e.target.checked })
              }
              className="rounded border-gray-300"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Export Formats
            </Label>
            <div className="space-y-2">
              {['html', 'pdf', 'png', 'docx'].map((format) => (
                <div key={format} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={format}
                    checked={settings.exportFormats.includes(format)}
                    onChange={(e) => {
                      const formats = e.target.checked
                        ? [...settings.exportFormats, format]
                        : settings.exportFormats.filter((f) => f !== format);
                      onUpdate({ ...settings, exportFormats: formats });
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={format} className="text-sm uppercase">
                    {format}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Archive Template</Label>
              <p className="text-xs text-gray-600">
                Hide this template from public listings
              </p>
            </div>
            <Button variant="outline" size="sm">
              Archive
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Delete Template</Label>
              <p className="text-xs text-gray-600">
                Permanently delete this template and all versions
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
