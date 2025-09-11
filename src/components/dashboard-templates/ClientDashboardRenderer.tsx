'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Heart,
  Calendar,
  DollarSign,
  Users,
  CheckSquare,
  Camera,
  FileText,
  MessageCircle,
  Clock,
  Grid3x3,
  MapPin,
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { cn } from '@/lib/utils';
import {
  DashboardTemplate,
  DashboardSection,
  ClientTemplateAssignment,
} from '@/lib/services/dashboardTemplateService';

// Dynamic imports for sections - lazy loading for performance
const WelcomeSection = React.lazy(() => import('./sections/WelcomeSection'));
const TimelineSection = React.lazy(() => import('./sections/TimelineSection'));
const BudgetTrackerSection = React.lazy(
  () => import('./sections/BudgetTrackerSection'),
);
const VendorPortfolioSection = React.lazy(
  () => import('./sections/VendorPortfolioSection'),
);
const GuestListSection = React.lazy(
  () => import('./sections/GuestListSection'),
);
const TaskManagerSection = React.lazy(
  () => import('./sections/TaskManagerSection'),
);
const CommunicationSection = React.lazy(
  () => import('./sections/CommunicationSection'),
);
const GallerySection = React.lazy(() => import('./sections/GallerySection'));
const DocumentsSection = React.lazy(
  () => import('./sections/DocumentsSection'),
);
const NotesSection = React.lazy(() => import('./sections/NotesSection'));
const ActivityFeedSection = React.lazy(
  () => import('./sections/ActivityFeedSection'),
);

// Section icon mapping
const SECTION_ICONS = {
  welcome: Heart,
  timeline: Calendar,
  budget_tracker: DollarSign,
  vendor_portfolio: Users,
  guest_list: Users,
  task_manager: CheckSquare,
  gallery: Camera,
  documents: FileText,
  contracts: FileText,
  payments: DollarSign,
  communication: MessageCircle,
  booking_calendar: Calendar,
  notes: FileText,
  activity_feed: Activity,
  weather: Clock,
  travel_info: MapPin,
  rsvp_manager: Users,
  seating_chart: Grid3x3,
  countdown: Clock,
} as const;

// Section component mapping for lazy loading
const SECTION_COMPONENTS = {
  welcome: WelcomeSection,
  timeline: TimelineSection,
  budget_tracker: BudgetTrackerSection,
  vendor_portfolio: VendorPortfolioSection,
  guest_list: GuestListSection,
  task_manager: TaskManagerSection,
  communication: CommunicationSection,
  gallery: GallerySection,
  documents: DocumentsSection,
  contracts: DocumentsSection, // Reuse documents component
  payments: BudgetTrackerSection, // Reuse budget component
  booking_calendar: TimelineSection, // Reuse timeline component
  notes: NotesSection,
  activity_feed: ActivityFeedSection,
  // Add more mappings as sections are implemented
} as const;

interface ClientDashboardRendererProps {
  clientId: string;
  supplierId: string;
  assignment: ClientTemplateAssignment;
  template: DashboardTemplate;
  sections: DashboardSection[];
  clientData?: any;
  onSectionInteraction?: (
    sectionType: string,
    action: string,
    data?: any,
  ) => void;
  onPerformanceMetric?: (metrics: {
    render_time_ms: number;
    cache_hit?: boolean;
    sections_count: number;
    data_load_time_ms?: number;
  }) => void;
}

interface SectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: any;
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

// Generic section wrapper for error boundaries and loading states
const SectionWrapper: React.FC<{
  section: DashboardSection;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}> = ({ section, children, isLoading, error, onRetry }) => {
  const IconComponent =
    SECTION_ICONS[section.section_type as keyof typeof SECTION_ICONS] ||
    FileText;

  if (error) {
    return (
      <Card className="p-6 bg-error-50 border-error-200">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-error-600" />
          <h3 className="font-semibold text-error-900">{section.title}</h3>
        </div>
        <p className="text-sm text-error-700 mb-4">{error}</p>
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
        )}
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 bg-gray-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-200 rounded-lg animate-pulse">
            <IconComponent className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        'hover:shadow-md border-gray-200',
        section.is_required && 'border-primary-200 bg-primary-50/20',
      )}
    >
      {children}
    </Card>
  );
};

// Loading placeholder for sections
const SectionLoadingPlaceholder: React.FC<{ section: DashboardSection }> = ({
  section,
}) => <SectionWrapper section={section} isLoading />;

// Fallback section for unsupported section types
const FallbackSection: React.FC<SectionProps> = ({
  section,
  onInteraction,
}) => {
  const IconComponent =
    SECTION_ICONS[section.section_type as keyof typeof SECTION_ICONS] ||
    FileText;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary-100 rounded-lg">
          <IconComponent className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
          {section.description && (
            <p className="text-sm text-gray-600">{section.description}</p>
          )}
        </div>
        {section.is_required && (
          <Badge variant="primary" size="sm">
            Required
          </Badge>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            This section type ({section.section_type}) is not yet implemented.
          </p>
          <p className="text-xs text-gray-500">
            Coming soon with enhanced functionality.
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ClientDashboardRenderer({
  clientId,
  supplierId,
  assignment,
  template,
  sections,
  clientData,
  onSectionInteraction,
  onPerformanceMetric,
}: ClientDashboardRendererProps) {
  const [renderStartTime] = useState(() => performance.now());
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>(
    {},
  );
  const [retryingSections, setRetryingSections] = useState<Set<string>>(
    new Set(),
  );

  // Track performance metrics
  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime;

    if (onPerformanceMetric) {
      onPerformanceMetric({
        render_time_ms: Math.round(renderTime),
        sections_count: sections.filter((s) => s.is_active).length,
        cache_hit: false, // This would be determined by data fetching layers
      });
    }
  }, [sections, renderStartTime, onPerformanceMetric]);

  // Filter and sort sections
  const activeSections = sections
    .filter((section) => section.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Grid system - 12 columns
  const GRID_COLS = 12;

  // Calculate responsive breakpoints
  const getResponsiveClasses = (section: DashboardSection) => {
    const baseClasses = ['relative'];

    // Desktop grid position and span
    baseClasses.push(`lg:col-start-${section.position_x + 1}`);
    baseClasses.push(`lg:col-span-${section.width}`);
    baseClasses.push(`lg:row-start-${section.position_y + 1}`);
    baseClasses.push(`lg:row-span-${section.height}`);

    // Mobile - always full width except for small widgets
    if (section.mobile_config?.width && section.mobile_config.width < 12) {
      baseClasses.push(`col-span-${section.mobile_config.width}`);
    } else {
      baseClasses.push('col-span-12');
    }

    // Tablet responsive
    if (section.tablet_config?.width) {
      baseClasses.push(`md:col-span-${section.tablet_config.width}`);
    }

    return baseClasses.join(' ');
  };

  // Handle section interaction
  const handleSectionInteraction = (
    sectionType: string,
    action: string,
    data?: any,
  ) => {
    if (onSectionInteraction) {
      onSectionInteraction(sectionType, action, data);
    }
  };

  // Handle section retry
  const handleSectionRetry = (sectionId: string) => {
    setRetryingSections((prev) => new Set([...prev, sectionId]));
    setSectionErrors((prev) => {
      const updated = { ...prev };
      delete updated[sectionId];
      return updated;
    });

    // Simulate retry delay
    setTimeout(() => {
      setRetryingSections((prev) => {
        const updated = new Set(prev);
        updated.delete(sectionId);
        return updated;
      });
    }, 1000);
  };

  // Render individual section
  const renderSection = (section: DashboardSection) => {
    const sectionType = section.section_type as keyof typeof SECTION_COMPONENTS;
    const SectionComponent = SECTION_COMPONENTS[sectionType];
    const isRetrying = retryingSections.has(section.id);
    const hasError = sectionErrors[section.id];

    // Get custom configuration from assignment
    const customConfig = assignment.custom_sections?.find(
      (custom: any) =>
        custom.section_id === section.id ||
        custom.section_type === section.section_type,
    );

    const sectionProps: SectionProps = {
      section,
      clientId,
      clientData,
      customConfig: customConfig?.config || {},
      onInteraction: (action, data) =>
        handleSectionInteraction(section.section_type, action, data),
    };

    return (
      <div key={section.id} className={getResponsiveClasses(section)}>
        <SectionWrapper
          section={section}
          isLoading={isRetrying}
          error={hasError}
          onRetry={() => handleSectionRetry(section.id)}
        >
          {SectionComponent ? (
            <Suspense
              fallback={<SectionLoadingPlaceholder section={section} />}
            >
              <SectionComponent {...sectionProps} />
            </Suspense>
          ) : (
            <FallbackSection {...sectionProps} />
          )}
        </SectionWrapper>
      </div>
    );
  };

  // Apply custom branding
  const customStyles = {
    '--brand-primary':
      assignment.custom_branding?.brand_color || template.brand_color,
    '--bg-image':
      assignment.custom_branding?.background_image_url ||
      template.background_image_url
        ? `url(${assignment.custom_branding?.background_image_url || template.background_image_url})`
        : 'none',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-gray-50" style={customStyles}>
      {/* Custom CSS injection */}
      {(assignment.custom_branding?.custom_css || template.custom_css) && (
        <style>
          {assignment.custom_branding?.custom_css || template.custom_css}
        </style>
      )}

      {/* Background image overlay */}
      {(assignment.custom_branding?.background_image_url ||
        template.background_image_url) && (
        <div
          className="fixed inset-0 bg-cover bg-center opacity-5 pointer-events-none"
          style={{
            backgroundImage: `url(${assignment.custom_branding?.background_image_url || template.background_image_url})`,
          }}
        />
      )}

      {/* Header */}
      <div
        className="bg-white shadow-sm border-b border-gray-200 relative"
        style={{
          backgroundColor:
            assignment.custom_branding?.header_bg_color || 'white',
          color: assignment.custom_branding?.header_text_color || 'inherit',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {(assignment.custom_branding?.logo_url || template.logo_url) && (
                <img
                  src={
                    assignment.custom_branding?.logo_url || template.logo_url
                  }
                  alt="Logo"
                  className="h-10 w-auto"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Your Wedding Dashboard
                </h1>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-primary-50 text-primary-700 border-primary-200"
              >
                {template.category}
              </Badge>
              {template.priority_loading && (
                <Badge variant="success" size="sm">
                  Priority
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile warning */}
        <div className="lg:hidden mb-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Your dashboard is optimized for larger
              screens. Some sections may be simplified on mobile devices.
            </p>
          </Card>
        </div>

        {/* Dashboard Grid */}
        <div
          className={cn(
            'grid gap-6',
            'grid-cols-1 md:grid-cols-6 lg:grid-cols-12',
            'lg:auto-rows-min',
          )}
          style={{
            // Dynamic grid rows for desktop
            gridTemplateRows: `repeat(${Math.max(
              ...activeSections.map((s) => s.position_y + s.height),
            )}, minmax(120px, auto))`,
          }}
        >
          {activeSections.map(renderSection)}
        </div>

        {/* Empty state */}
        {activeSections.length === 0 && (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Grid3x3 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Dashboard Being Prepared
              </h3>
              <p className="text-gray-600 mb-4">
                Your personalized wedding dashboard is being set up. This should
                only take a moment.
              </p>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh Page
              </Button>
            </div>
          </Card>
        )}

        {/* Template attribution */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Template: <span className="font-medium">{template.name}</span>
              {assignment.assignment_reason === 'automatic' && (
                <Badge variant="outline" size="sm" className="ml-2">
                  Auto-assigned
                </Badge>
              )}
            </div>
            <div>
              Last updated:{' '}
              {new Date(assignment.assigned_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
