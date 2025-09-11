import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  LayoutDashboard,
  Settings,
  BarChart3,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Users,
  Calendar,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { DashboardTemplateService } from '@/lib/services/dashboardTemplateService';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function DashboardTemplatesPage() {
  const supabase = await createClient();

  // Get current user
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // Initialize template service
  const templateService = new DashboardTemplateService(supabase, user.id);

  // Fetch templates and analytics
  const [templates, analytics] = await Promise.all([
    templateService.getTemplates(),
    templateService.getTemplateAnalytics(),
  ]);

  const categorizeTemplates = (templates: unknown[]) => {
    const active = templates.filter((t: any) => t.is_active);
    const draft = templates.filter((t: any) => !t.is_active);
    const defaults = templates.filter((t: any) => t.is_default);

    return { active, draft, defaults };
  };

  const {
    active: activeTemplates,
    draft: draftTemplates,
    defaults: defaultTemplates,
  } = categorizeTemplates(templates);

  const getCategoryBadge = (category: string) => {
    const colors = {
      luxury: 'bg-purple-100 text-purple-800 border-purple-200',
      standard: 'bg-blue-100 text-blue-800 border-blue-200',
      budget: 'bg-green-100 text-green-800 border-green-200',
      destination: 'bg-orange-100 text-orange-800 border-orange-200',
      venue_specific: 'bg-pink-100 text-pink-800 border-pink-200',
    };

    return (
      colors[category as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  const formatUsageCategory = (category: string) => {
    switch (category) {
      case 'high_usage':
        return { label: 'High Usage', color: 'text-green-600' };
      case 'medium_usage':
        return { label: 'Medium Usage', color: 'text-yellow-600' };
      case 'low_usage':
        return { label: 'Low Usage', color: 'text-gray-600' };
      default:
        return { label: 'No Usage', color: 'text-gray-400' };
    }
  };

  const formatPerformanceCategory = (category: string) => {
    switch (category) {
      case 'fast':
        return { label: 'Fast', color: 'text-green-600' };
      case 'medium':
        return { label: 'Medium', color: 'text-yellow-600' };
      case 'slow':
        return { label: 'Slow', color: 'text-red-600' };
      default:
        return { label: 'Unknown', color: 'text-gray-400' };
    }
  };

  const TemplateCard = ({ template }: { template: any }) => (
    <Card className="p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `${template.brand_color}20`,
              color: template.brand_color,
            }}
          >
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {template.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {template.is_default && <Badge variant="default">Default</Badge>}
          {template.priority_loading && (
            <Badge variant="default">Priority</Badge>
          )}
          {!template.is_active && <Badge variant="secondary">Draft</Badge>}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Category</span>
          <Badge
            className={getCategoryBadge(template.category)}
            variant="outline"
          >
            {template.category.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Usage</span>
          <span
            className={`font-medium ${formatUsageCategory(template.usage_category || 'low_usage').color}`}
          >
            {template.usage_count || 0} assignments
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Performance</span>
          <span
            className={`font-medium ${formatPerformanceCategory(template.performance_category || 'unknown').color}`}
          >
            {template.avg_render_time
              ? `${Math.round(template.avg_render_time)}ms`
              : 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Last Updated</span>
          <span className="text-gray-500">
            {format(new Date(template.updated_at), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <Link href={`/dashboard-templates/${template.id}/preview`}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Eye className="h-3 w-3" />}
          >
            Preview
          </Button>
        </Link>
        <Link href={`/dashboard-templates/${template.id}/edit`}>
          <Button
            variant="tertiary"
            size="sm"
            leftIcon={<Edit3 className="h-3 w-3" />}
          >
            Edit
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Copy className="h-3 w-3" />}
        >
          Duplicate
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard Templates
              </h1>
              <p className="text-gray-600 mt-1">
                Create and manage personalized client dashboard experiences
              </p>
            </div>

            <div className="flex gap-3">
              <Link href="/dashboard-templates/analytics">
                <Button
                  variant="secondary"
                  leftIcon={<BarChart3 className="h-4 w-4" />}
                >
                  Analytics
                </Button>
              </Link>
              <Link href="/dashboard-templates/new">
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Create Template
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.summary.total_templates}
                </p>
                <p className="text-sm text-gray-600">Total Templates</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.summary.active_assignments}
                </p>
                <p className="text-sm text-gray-600">Active Assignments</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(analytics.summary.performance_score)}%
                </p>
                <p className="text-sm text-gray-600">Performance Score</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(analytics.summary.avg_render_time)}ms
                </p>
                <p className="text-sm text-gray-600">Avg Render Time</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Templates Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <div className="border-b border-gray-200">
            <TabsList className="h-12 p-1 bg-gray-100">
              <TabsTrigger
                value="active"
                className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Active Templates ({activeTemplates.length})
              </TabsTrigger>
              <TabsTrigger
                value="draft"
                className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Drafts ({draftTemplates.length})
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-6">
            {activeTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTemplates.map((template: any) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <LayoutDashboard className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Active Templates
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first dashboard template to provide personalized
                    client experiences.
                  </p>
                  <Link href="/dashboard-templates/new">
                    <Button
                      variant="primary"
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Create Your First Template
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="draft" className="space-y-6">
            {draftTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {draftTemplates.map((template: any) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Edit3 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Draft Templates
                  </h3>
                  <p className="text-gray-600">
                    All your templates are active. Draft templates will appear
                    here when you create them.
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Chart */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Template Performance
                </h3>
                <div className="space-y-3">
                  {analytics.templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {template.clients_count} clients
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-medium ${formatPerformanceCategory(template.performance_category).color}`}
                        >
                          {template.avg_render_time
                            ? `${Math.round(template.avg_render_time)}ms`
                            : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {
                            formatPerformanceCategory(
                              template.performance_category,
                            ).label
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Usage Statistics */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Usage Statistics
                </h3>
                <div className="space-y-3">
                  {analytics.templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {template.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-medium ${formatUsageCategory(template.usage_category).color}`}
                        >
                          {template.clients_count}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatUsageCategory(template.usage_category).label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Default Template Notice */}
        {defaultTemplates.length === 0 && activeTemplates.length > 0 && (
          <Card className="p-4 bg-yellow-50 border-yellow-200 mt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  No Default Template Set
                </p>
                <p className="text-sm text-yellow-700">
                  Consider setting a default template for automatic assignment
                  to new clients.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
