'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/components/ui/table';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
} from '@/components/ui/dropdown';
import { InputGroup } from '@/components/ui/input-group';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowLeftIcon,
} from '@heroicons/react/20/solid';
import Link from 'next/link';
import { format } from 'date-fns';
import { EnhancedFormBuilder } from './EnhancedFormBuilder';

interface FormSystemLayoutProps {
  children?: React.ReactNode;
  currentSection: 'overview' | 'builder' | 'templates' | 'responses' | 'analytics';
  formId?: string;
  clientId?: string;
}

interface Form {
  id: string;
  title: string;
  description?: string;
  status: string;
  is_published: boolean;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  form_responses?: { count: number }[];
}

interface FormStats {
  total: number;
  published: number;
  draft: number;
  templates: number;
  totalResponses: number;
}

export function FormSystemLayout({ children, currentSection, formId, clientId }: FormSystemLayoutProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [stats, setStats] = useState<FormStats>({
    total: 0,
    published: 0,
    draft: 0,
    templates: 0,
    totalResponses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    loadForms();
  }, [searchQuery, statusFilter]);

  const loadForms = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/forms?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch forms');
      
      const data = await response.json();
      setForms(data.forms || []);
      
      // Calculate stats
      const formStats = data.forms || [];
      const totalResponses = formStats.reduce((sum: number, form: Form) => 
        sum + (form.form_responses?.[0]?.count || 0), 0
      );
      
      setStats({
        total: formStats.length,
        published: formStats.filter((f: Form) => f.is_published).length,
        draft: formStats.filter((f: Form) => f.status === 'draft').length,
        templates: formStats.filter((f: Form) => f.is_template).length,
        totalResponses,
      });
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigationItems = [
    { key: 'overview', label: 'Overview', icon: DocumentTextIcon, href: '/dashboard/forms' },
    { key: 'builder', label: 'Form Builder', icon: PlusIcon, href: '/dashboard/forms/builder' },
    { key: 'templates', label: 'Templates', icon: Squares2X2Icon, href: '/templates' },
    { key: 'responses', label: 'Responses', icon: ListBulletIcon, href: '/dashboard/forms/responses' },
    { key: 'analytics', label: 'Analytics', icon: ChartBarIcon, href: '/dashboard/forms/analytics' },
  ];

  // Render different sections
  const renderSectionContent = () => {
    switch (currentSection) {
      case 'builder':
        return (
          <div className="h-screen bg-gray-50">
            <div className="flex items-center justify-between p-6 bg-white border-b">
              <div className="flex items-center gap-4">
                <Link href="/dashboard/forms">
                  <Button variant="outline" size="sm">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back to Forms
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
                  <p className="text-gray-600">Create and customize your wedding inquiry forms</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-6">
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Form Builder</h3>
                <p className="text-gray-600">Advanced form builder with drag-and-drop functionality will be displayed here.</p>
                <p className="text-sm text-gray-500 mt-2">Form ID: {formId || 'New Form'}</p>
                {clientId && <p className="text-sm text-gray-500">Client ID: {clientId}</p>}
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/dashboard/forms">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Forms
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Form Analytics</h1>
                <p className="text-gray-600">Analyze form performance and responses</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-6">
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600">Form analytics and performance metrics will be displayed here.</p>
              </div>
            </div>
          </div>
        );

      case 'responses':
        return (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/dashboard/forms">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Forms
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Form Responses</h1>
                <p className="text-gray-600">View and manage form submissions</p>
              </div>
            </div>
            {children || <div className="text-center py-12 text-gray-500">Form responses will be displayed here</div>}
          </div>
        );

      case 'templates':
        return (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/dashboard/forms">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Forms
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Form Templates</h1>
                <p className="text-gray-600">Browse and use pre-built form templates</p>
              </div>
            </div>
            {children || <div className="text-center py-12 text-gray-500">Form templates will be displayed here</div>}
          </div>
        );

      default:
        return renderOverviewSection();
    }
  };

  const renderOverviewSection = () => {
    return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Forms</h1>
          <p className="text-gray-600 mt-1">
            Create and manage your wedding inquiry forms and templates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline">
            <SparklesIcon className="h-4 w-4 mr-2" />
            AI Generate
          </Button>
          <Link href="/templates">
            <Button variant="outline">
              <Squares2X2Icon className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </Link>
          <Link href="/dashboard/forms/builder">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Forms</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Published</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.published}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Drafts</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.draft}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Squares2X2Icon className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Templates</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.templates}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <ListBulletIcon className="h-8 w-8 text-indigo-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Responses</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalResponses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <InputGroup>
            <MagnifyingGlassIcon />
            <Input
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>
        
        <div className="flex gap-2">
          <Dropdown>
            <DropdownButton outline>
              <FunnelIcon />
              Status
            </DropdownButton>
            <DropdownMenu>
              <DropdownItem onClick={() => setStatusFilter('all')}>All Forms</DropdownItem>
              <DropdownItem onClick={() => setStatusFilter('published')}>Published</DropdownItem>
              <DropdownItem onClick={() => setStatusFilter('draft')}>Drafts</DropdownItem>
              <DropdownItem onClick={() => setStatusFilter('template')}>Templates</DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <Dropdown>
            <DropdownButton outline>
              <ListBulletIcon />
              View
            </DropdownButton>
            <DropdownMenu>
              <DropdownItem onClick={() => setViewMode('list')}>List View</DropdownItem>
              <DropdownItem onClick={() => setViewMode('grid')}>Grid View</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* Forms List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading forms...</p>
        </div>
      ) : forms.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Form</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Responses</TableHeader>
                <TableHeader>Updated</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{form.title}</div>
                      {form.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {form.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {form.is_published ? (
                        <Badge color="green">Published</Badge>
                      ) : (
                        <Badge color="yellow">Draft</Badge>
                      )}
                      {form.is_template && (
                        <Badge color="purple">Template</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-900">
                      {form.form_responses?.[0]?.count || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {format(new Date(form.updated_at), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/forms/builder?id=${form.id}`}>
                        <Button size="sm" variant="outline">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      {form.is_published && (
                        <Button size="sm" variant="outline">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Dropdown>
                        <DropdownButton plain>
                          <EllipsisHorizontalIcon />
                        </DropdownButton>
                        <DropdownMenu>
                          <DropdownItem>Duplicate</DropdownItem>
                          <DropdownItem>Export</DropdownItem>
                          <DropdownItem>Delete</DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No forms</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first wedding inquiry form.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline">
              <SparklesIcon className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
            <Link href="/dashboard/forms/builder">
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Form
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
    );
  };

  // Main return - call the appropriate section renderer
  return renderSectionContent();
}
