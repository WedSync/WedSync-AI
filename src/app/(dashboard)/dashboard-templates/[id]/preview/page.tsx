import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import ClientDashboardRenderer from '@/components/dashboard-templates/ClientDashboardRenderer';
import { DashboardTemplateService } from '@/lib/services/dashboardTemplateService';
import { Button } from '@/components/ui/button-untitled';
import { ArrowLeft, Edit3, Share2 } from 'lucide-react';
import Link from 'next/link';

interface PreviewTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewTemplatePage({
  params,
}: PreviewTemplatePageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Get current user
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // Initialize template service and fetch template
  const templateService = new DashboardTemplateService(supabase, user.id);
  const templateData = await templateService.getTemplateById(resolvedParams.id);

  if (!templateData) {
    notFound();
  }

  const { template, sections } = templateData;

  // Mock client data for preview
  const mockClientData = {
    first_name: 'Emma',
    last_name: 'Johnson',
    partner_first_name: 'James',
    partner_last_name: 'Smith',
    wedding_date: '2025-08-15',
    venue_name: 'Elegant Garden Estate',
    guest_count: 120,
    budget_range: 'luxury',
    booking_stage: 'planning',
    package_name: 'Luxury Wedding Package',
  };

  // Mock assignment for preview
  const mockAssignment = {
    id: 'preview-assignment',
    client_id: 'preview-client',
    template_id: template.id,
    supplier_id: user.id,
    assigned_at: new Date().toISOString(),
    assignment_reason: 'manual' as const,
    custom_sections: [],
    custom_branding: {},
    custom_config: {},
    is_active: true,
    render_count: 0,
  };

  const handleSectionInteraction = async (
    sectionType: string,
    action: string,
    data?: any,
  ) => {
    'use server';

    // In preview mode, we just log interactions
    console.log('Preview interaction:', { sectionType, action, data });
  };

  const handlePerformanceMetric = async (metrics: any) => {
    'use server';

    // In preview mode, we could track preview performance
    console.log('Preview performance:', metrics);
  };

  return (
    <div className="min-h-screen">
      {/* Preview Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard-templates">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back to Templates
                </Button>
              </Link>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Template Preview
                </h1>
                <p className="text-sm text-gray-600">
                  {template.name} • {template.category}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                Preview Mode
              </div>
              <Link href={`/dashboard-templates/${template.id}/edit`}>
                <Button
                  variant="secondary"
                  leftIcon={<Edit3 className="h-4 w-4" />}
                >
                  Edit Template
                </Button>
              </Link>
              <Button
                variant="tertiary"
                leftIcon={<Share2 className="h-4 w-4" />}
              >
                Share Preview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview */}
      <div className="bg-gray-100 min-h-screen">
        {/* Preview Notice */}
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p>
                This is a preview using sample client data (Emma & James's
                wedding). Actual client dashboards will use real client
                information.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Renderer */}
        <ClientDashboardRenderer
          clientId="preview-client"
          supplierId={user.id}
          assignment={mockAssignment}
          template={template}
          sections={sections}
          clientData={mockClientData}
          onSectionInteraction={handleSectionInteraction}
          onPerformanceMetric={handlePerformanceMetric}
        />
      </div>

      {/* Preview Footer */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>
                <strong>Template:</strong> {template.name} (
                {sections.filter((s) => s.is_active).length} sections)
              </p>
              <p>
                <strong>Performance Target:</strong> &lt;300ms render time •
                <strong> Cache:</strong> {template.cache_duration_minutes}min •
                <strong> Priority Loading:</strong>{' '}
                {template.priority_loading ? 'Yes' : 'No'}
              </p>
            </div>

            <div className="flex gap-3">
              <Link href={`/dashboard-templates/${template.id}/edit`}>
                <Button
                  variant="primary"
                  leftIcon={<Edit3 className="h-4 w-4" />}
                >
                  Edit Template
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
