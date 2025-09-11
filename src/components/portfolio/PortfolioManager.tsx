'use client';

// WS-119: Portfolio Management Component
// Team B Batch 9 Round 2

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Grid,
  List,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  Upload,
  Star,
  Calendar,
  MapPin,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PortfolioProject, PortfolioFilters } from '@/types/portfolio';
import { PortfolioProjectModal } from './PortfolioProjectModal';
import { MediaUploadModal } from './MediaUploadModal';
import { PortfolioGallery } from './PortfolioGallery';

interface PortfolioManagerProps {
  vendorId: string;
  onProjectSelect?: (project: PortfolioProject) => void;
  readonly?: boolean;
}

export function PortfolioManager({
  vendorId,
  onProjectSelect,
  readonly = false,
}: PortfolioManagerProps) {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PortfolioFilters>({});
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<PortfolioProject | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [vendorId, filters]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        vendor_id: vendorId,
        ...Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) => value !== undefined && value !== null,
          ),
        ),
      });

      const response = await fetch(`/api/portfolio?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const { projects } = await response.json();
      setProjects(projects);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project: PortfolioProject) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this project? This action cannot be undone.',
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/portfolio?id=${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleProjectSaved = () => {
    setShowProjectModal(false);
    fetchProjects();
  };

  const handleViewGallery = (project: PortfolioProject) => {
    setSelectedProject(project);
    setShowGallery(true);
  };

  const handleMediaUploaded = () => {
    setShowUploadModal(false);
    fetchProjects();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Button variant="secondary" className="mt-4" onClick={fetchProjects}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
          <p className="text-gray-600">
            Manage your portfolio projects and showcase your work
          </p>
        </div>

        {!readonly && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={() => setShowUploadModal(true)}
            >
              Upload Media
            </Button>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleCreateProject}
            >
              New Project
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select
            value={filters.status || ''}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value || undefined }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.event_type || ''}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                event_type: value || undefined,
              }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="wedding">Wedding</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="portrait">Portrait</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <Grid className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No projects found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first portfolio project'}
          </p>
          {!readonly && !searchTerm && Object.keys(filters).length === 0 && (
            <Button onClick={handleCreateProject}>
              Create Your First Project
            </Button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
              readonly={readonly}
              onEdit={() => handleEditProject(project)}
              onDelete={() => handleDeleteProject(project.id)}
              onViewGallery={() => handleViewGallery(project)}
              onClick={() => onProjectSelect?.(project)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <PortfolioProjectModal
        vendorId={vendorId}
        project={selectedProject}
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSaved={handleProjectSaved}
      />

      <MediaUploadModal
        vendorId={vendorId}
        projectId={null}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploaded={handleMediaUploaded}
      />

      {showGallery && selectedProject && (
        <PortfolioGallery
          project={selectedProject}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: PortfolioProject;
  viewMode: 'grid' | 'list';
  readonly: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewGallery: () => void;
  onClick: () => void;
}

function ProjectCard({
  project,
  viewMode,
  readonly,
  onEdit,
  onDelete,
  onViewGallery,
  onClick,
}: ProjectCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0" onClick={onClick}>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {project.title}
              </h3>
              {project.featured && (
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              )}
              {getStatusBadge(project.status)}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              {project.client_name && <span>{project.client_name}</span>}
              {project.event_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(project.event_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {project.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{project.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{project.view_count} views</span>
              </div>
            </div>

            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {project.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {project.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{project.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {!readonly && (
            <div className="flex gap-1 ml-4">
              <Button
                variant="tertiary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewGallery();
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-video bg-gray-100 relative" onClick={onClick}>
        {project.cover_image?.media_url ? (
          <img
            src={project.cover_image.media_url}
            alt={project.cover_image.alt_text || project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Grid className="h-12 w-12" />
          </div>
        )}

        {project.featured && (
          <div className="absolute top-2 right-2">
            <Badge variant="warning" className="bg-yellow-400">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}

        <div className="absolute bottom-2 left-2">
          {getStatusBadge(project.status)}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3
            className="font-semibold text-gray-900 line-clamp-1"
            onClick={onClick}
          >
            {project.title}
          </h3>

          {!readonly && (
            <div className="flex gap-1">
              <Button
                variant="tertiary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewGallery();
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {project.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="space-y-2">
          {project.client_name && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Client:</span> {project.client_name}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600">
            {project.event_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(project.event_date).toLocaleDateString()}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{project.view_count}</span>
            </div>
          </div>

          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {project.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{project.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
