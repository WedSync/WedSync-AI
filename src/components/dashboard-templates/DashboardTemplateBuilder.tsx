'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Settings,
  Eye,
  Save,
  Palette,
  Plus,
  Trash2,
  Move,
  Grid3x3,
  Copy,
  Layers,
  AlertTriangle,
  Sparkles,
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  DollarSign,
  MessageCircle,
  CheckSquare,
  Camera,
  Heart,
  MapPin,
  Clock,
  Music2,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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
  activity_feed: Layers,
  weather: Cloud,
  travel_info: MapPin,
  rsvp_manager: Users,
  seating_chart: Grid3x3,
  menu_planning: FileText,
  music_playlist: Music2,
  ceremony_details: Heart,
  reception_details: Sparkles,
  vendor_contacts: Users,
  emergency_contacts: Users,
  countdown: Clock,
  inspiration_board: Camera,
  checklist: CheckSquare,
} as const;

// Types extending BookingPageBuilder patterns
interface DashboardTemplate {
  id?: string;
  supplier_id: string;
  name: string;
  description: string;
  category: 'luxury' | 'standard' | 'budget' | 'destination' | 'venue_specific';
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  target_criteria: Record<string, any>;
  assignment_rules: any[];
  brand_color: string;
  custom_css?: string;
  logo_url?: string;
  background_image_url?: string;
  cache_duration_minutes: number;
  priority_loading: boolean;
}

interface DashboardSection {
  id?: string;
  section_type: string;
  title: string;
  description: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_active: boolean;
  is_required: boolean;
  sort_order: number;
  section_config: Record<string, any>;
  conditional_rules?: any;
  mobile_config?: any;
  tablet_config?: any;
}

interface SectionLibraryItem {
  section_type: string;
  name: string;
  description: string;
  category: string;
  default_config: Record<string, any>;
  default_width: number;
  default_height: number;
  icon_name: string;
}

interface DashboardTemplateBuilderProps {
  supplierId: string;
  existingTemplate?: DashboardTemplate;
  onSave: (
    template: DashboardTemplate,
    sections: DashboardSection[],
  ) => Promise<void>;
  onPreview: (templateId: string) => void;
}

// Mock section library - in production this would come from the database
const SECTION_LIBRARY: SectionLibraryItem[] = [
  {
    section_type: 'welcome',
    name: 'Welcome Message',
    description: 'Personalized welcome message for clients',
    category: 'communication',
    default_config: {
      message: 'Welcome to your wedding dashboard!',
      show_countdown: true,
    },
    default_width: 12,
    default_height: 3,
    icon_name: 'heart',
  },
  {
    section_type: 'timeline',
    name: 'Wedding Timeline',
    description: 'Visual timeline of wedding planning milestones',
    category: 'planning',
    default_config: {
      view: 'gantt',
      show_milestones: true,
      color_coding: true,
    },
    default_width: 12,
    default_height: 6,
    icon_name: 'calendar',
  },
  {
    section_type: 'budget_tracker',
    name: 'Budget Tracker',
    description: 'Comprehensive wedding budget management',
    category: 'financial',
    default_config: {
      currency: 'GBP',
      categories: 'wedding_standard',
      show_charts: true,
    },
    default_width: 8,
    default_height: 5,
    icon_name: 'pound-sterling',
  },
  {
    section_type: 'vendor_portfolio',
    name: 'Vendor Portfolio',
    description: 'Showcase of recommended wedding vendors',
    category: 'vendors',
    default_config: {
      display: 'grid',
      show_ratings: true,
      filter_by_budget: true,
    },
    default_width: 12,
    default_height: 8,
    icon_name: 'users',
  },
  {
    section_type: 'guest_list',
    name: 'Guest Management',
    description: 'Complete guest list and RSVP tracking',
    category: 'planning',
    default_config: {
      show_dietary: true,
      show_plus_ones: true,
      export_formats: ['csv', 'pdf'],
    },
    default_width: 10,
    default_height: 6,
    icon_name: 'user-group',
  },
  {
    section_type: 'task_manager',
    name: 'Task Manager',
    description: 'Wedding planning task lists and assignments',
    category: 'planning',
    default_config: {
      view: 'kanban',
      assign_to_vendors: true,
      deadline_alerts: true,
    },
    default_width: 8,
    default_height: 6,
    icon_name: 'check-square',
  },
  {
    section_type: 'communication',
    name: 'Message Center',
    description: 'Centralized communication hub',
    category: 'communication',
    default_config: { show_vendor_messages: true, auto_notifications: true },
    default_width: 6,
    default_height: 4,
    icon_name: 'message-circle',
  },
  {
    section_type: 'gallery',
    name: 'Photo Gallery',
    description: 'Wedding inspiration and vendor portfolios',
    category: 'visual',
    default_config: {
      layout: 'masonry',
      categories: ['venue', 'flowers', 'catering'],
      upload_enabled: true,
    },
    default_width: 8,
    default_height: 6,
    icon_name: 'image',
  },
];

export default function DashboardTemplateBuilder({
  supplierId,
  existingTemplate,
  onSave,
  onPreview,
}: DashboardTemplateBuilderProps) {
  // State management - extending booking page builder patterns
  const [template, setTemplate] = useState<DashboardTemplate>({
    supplier_id: supplierId,
    name: '',
    description: '',
    category: 'standard',
    is_active: true,
    is_default: false,
    sort_order: 0,
    target_criteria: {},
    assignment_rules: [],
    brand_color: '#7F56D9',
    cache_duration_minutes: 5,
    priority_loading: false,
    ...existingTemplate,
  });

  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Grid settings - 12-column system like booking builder
  const GRID_COLS = 12;
  const GRID_ROWS = 12;
  const CELL_HEIGHT = 80; // pixels per grid row

  // Validation - pattern from booking page builder
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!template.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!template.description.trim()) {
      newErrors.description = 'Template description is required';
    }

    if (sections.filter((s) => s.is_active).length === 0) {
      newErrors.sections = 'At least one active section is required';
    }

    // Check for overlapping sections
    const activeSections = sections.filter((s) => s.is_active);
    for (let i = 0; i < activeSections.length; i++) {
      for (let j = i + 1; j < activeSections.length; j++) {
        const a = activeSections[i];
        const b = activeSections[j];

        if (
          a.position_x < b.position_x + b.width &&
          a.position_x + a.width > b.position_x &&
          a.position_y < b.position_y + b.height &&
          a.position_y + a.height > b.position_y
        ) {
          newErrors.layout =
            'Sections cannot overlap. Please adjust positions.';
          break;
        }
      }
      if (newErrors.layout) break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [template, sections]);

  // Handlers
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(template, sections);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (template.id) {
      onPreview(template.id);
    }
  };

  const addSectionFromLibrary = (libraryItem: SectionLibraryItem) => {
    const newSection: DashboardSection = {
      id: `section-${Date.now()}`,
      section_type: libraryItem.section_type,
      title: libraryItem.name,
      description: libraryItem.description,
      position_x: 0,
      position_y: 0,
      width: libraryItem.default_width,
      height: libraryItem.default_height,
      is_active: true,
      is_required: false,
      sort_order: sections.length,
      section_config: { ...libraryItem.default_config },
      mobile_config: {
        width: Math.min(libraryItem.default_width, 12),
        height: libraryItem.default_height,
      },
    };

    // Find first available position
    const position = findAvailablePosition(newSection.width, newSection.height);
    newSection.position_x = position.x;
    newSection.position_y = position.y;

    setSections((prev) => [...prev, newSection]);
  };

  const findAvailablePosition = (width: number, height: number) => {
    const occupied: boolean[][] = Array(GRID_ROWS)
      .fill(null)
      .map(() => Array(GRID_COLS).fill(false));

    // Mark occupied cells
    sections
      .filter((s) => s.is_active)
      .forEach((section) => {
        for (
          let y = section.position_y;
          y < section.position_y + section.height;
          y++
        ) {
          for (
            let x = section.position_x;
            x < section.position_x + section.width;
            x++
          ) {
            if (y < GRID_ROWS && x < GRID_COLS) {
              occupied[y][x] = true;
            }
          }
        }
      });

    // Find first available position
    for (let y = 0; y <= GRID_ROWS - height; y++) {
      for (let x = 0; x <= GRID_COLS - width; x++) {
        let canPlace = true;

        for (let dy = 0; dy < height && canPlace; dy++) {
          for (let dx = 0; dx < width && canPlace; dx++) {
            if (occupied[y + dy][x + dx]) {
              canPlace = false;
            }
          }
        }

        if (canPlace) {
          return { x, y };
        }
      }
    }

    return { x: 0, y: 0 }; // Fallback - will create overlap warning
  };

  const updateSection = (
    sectionId: string,
    updates: Partial<DashboardSection>,
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section,
      ),
    );
  };

  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
  };

  const duplicateSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      const duplicated = {
        ...section,
        id: `section-${Date.now()}`,
        title: `${section.title} (Copy)`,
        position_x: section.position_x + 1,
        position_y: section.position_y + 1,
        sort_order: sections.length,
      };
      setSections((prev) => [...prev, duplicated]);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (sectionId: string) => {
    setIsDragging(true);
    setDraggedSection(sectionId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedSection(null);
  };

  const handleGridDrop = (x: number, y: number) => {
    if (draggedSection) {
      updateSection(draggedSection, { position_x: x, position_y: y });
    }
    handleDragEnd();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header - Pattern from booking page builder */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {existingTemplate
              ? 'Edit Dashboard Template'
              : 'Create Dashboard Template'}
          </h1>
          <p className="text-gray-600 mt-1">
            Design a customized client dashboard experience that matches your
            wedding service style
          </p>
        </div>

        <div className="flex gap-3">
          {template.id && (
            <Button
              variant="secondary"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={handlePreview}
            >
              Preview
            </Button>
          )}
          <Button
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            loading={isSaving}
            onClick={handleSave}
          >
            Save Template
          </Button>
        </div>
      </div>

      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <Card className="bg-error-50 border-error-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-error-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-error-900">
                Please fix the following errors:
              </h3>
              <ul className="mt-1 text-sm text-error-700 space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content - 3-column layout inspired by booking builder */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Basic</span>
              </TabsTrigger>
              <TabsTrigger value="layout" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Layout</span>
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Brand</span>
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Rules</span>
              </TabsTrigger>
            </TabsList>

            {/* Basic Settings */}
            <TabsContent value="basic" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Template Information
                </h3>

                <div className="grid gap-4">
                  <Input
                    label="Template Name"
                    value={template.name}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Luxury Wedding Dashboard"
                    error={errors.name}
                    required
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg shadow-sm transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300',
                        errors.description
                          ? 'border-error-300 bg-error-50'
                          : 'border-gray-300',
                      )}
                      rows={3}
                      value={template.description}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Perfect for high-end weddings with comprehensive planning needs..."
                    />
                    {errors.description && (
                      <p className="text-sm text-error-600 mt-1">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Template Category
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 transition-colors"
                      value={template.category}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          category: e.target.value as any,
                        }))
                      }
                    >
                      <option value="luxury">Luxury</option>
                      <option value="standard">Standard</option>
                      <option value="budget">Budget</option>
                      <option value="destination">Destination</option>
                      <option value="venue_specific">Venue Specific</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Template Settings
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Active Template</h4>
                      <p className="text-sm text-gray-600">
                        Available for assignment to clients
                      </p>
                    </div>
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) =>
                        setTemplate((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Default Template</h4>
                      <p className="text-sm text-gray-600">
                        Use as default for new clients
                      </p>
                    </div>
                    <Switch
                      checked={template.is_default}
                      onCheckedChange={(checked) =>
                        setTemplate((prev) => ({
                          ...prev,
                          is_default: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Priority Loading</h4>
                      <p className="text-sm text-gray-600">
                        Prioritize this template for faster loading
                      </p>
                    </div>
                    <Switch
                      checked={template.priority_loading}
                      onCheckedChange={(checked) =>
                        setTemplate((prev) => ({
                          ...prev,
                          priority_loading: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Layout Editor */}
            <TabsContent value="layout" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard Layout
                </h3>
                <Badge variant="secondary">
                  {sections.filter((s) => s.is_active).length} sections
                </Badge>
              </div>

              {errors.sections && (
                <p className="text-sm text-error-600">{errors.sections}</p>
              )}

              {errors.layout && (
                <p className="text-sm text-error-600">{errors.layout}</p>
              )}

              {/* Grid Layout Editor */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Template Grid</h4>
                    <span className="text-sm text-gray-500">
                      12-column layout
                    </span>
                  </div>

                  {/* Grid visualization */}
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                    style={{ height: `${GRID_ROWS * CELL_HEIGHT + 32}px` }}
                  >
                    {/* Grid background */}
                    <div className="absolute inset-0 p-4">
                      <div
                        className="grid gap-1 h-full"
                        style={{
                          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
                        }}
                      >
                        {Array.from({ length: GRID_COLS * GRID_ROWS }).map(
                          (_, i) => {
                            const x = i % GRID_COLS;
                            const y = Math.floor(i / GRID_COLS);
                            return (
                              <div
                                key={i}
                                className="border border-gray-100 hover:bg-primary-50 cursor-pointer transition-colors"
                                onClick={() => handleGridDrop(x, y)}
                              />
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="absolute inset-0 p-4">
                      <div
                        className="relative h-full"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
                          gap: '4px',
                        }}
                      >
                        {sections
                          .filter((s) => s.is_active)
                          .map((section) => {
                            const IconComponent =
                              SECTION_ICONS[
                                section.section_type as keyof typeof SECTION_ICONS
                              ] || LayoutDashboard;

                            return (
                              <div
                                key={section.id}
                                className={cn(
                                  'relative bg-primary-500 text-white rounded-lg p-2 cursor-move shadow-sm',
                                  'hover:bg-primary-600 transition-colors',
                                  'flex flex-col justify-center items-center text-center',
                                  draggedSection === section.id && 'opacity-50',
                                )}
                                style={{
                                  gridColumn: `${section.position_x + 1} / ${section.position_x + section.width + 1}`,
                                  gridRow: `${section.position_y + 1} / ${section.position_y + section.height + 1}`,
                                }}
                                draggable
                                onDragStart={() => handleDragStart(section.id!)}
                                onDragEnd={handleDragEnd}
                              >
                                <IconComponent className="h-4 w-4 mb-1" />
                                <span className="text-xs font-medium truncate">
                                  {section.title}
                                </span>
                                <span className="text-xs opacity-75">
                                  {section.width}×{section.height}
                                </span>

                                {/* Section controls */}
                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicateSection(section.id!);
                                    }}
                                    className="p-1 bg-black/20 hover:bg-black/30 rounded transition-colors"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeSection(section.id!);
                                    }}
                                    className="p-1 bg-black/20 hover:bg-black/30 rounded transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Section Configuration */}
              <Card className="p-6">
                <h4 className="font-medium mb-4">Section Properties</h4>
                <div className="space-y-4">
                  {sections
                    .filter((s) => s.is_active)
                    .map((section) => {
                      const IconComponent =
                        SECTION_ICONS[
                          section.section_type as keyof typeof SECTION_ICONS
                        ] || LayoutDashboard;

                      return (
                        <div
                          key={section.id}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                        >
                          <IconComponent className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">
                              {section.title}
                            </h5>
                            <p className="text-xs text-gray-600">
                              {section.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>
                              Position: ({section.position_x},{' '}
                              {section.position_y})
                            </span>
                            <span>
                              Size: {section.width}×{section.height}
                            </span>
                          </div>

                          <Switch
                            checked={section.is_required}
                            onCheckedChange={(checked) =>
                              updateSection(section.id!, {
                                is_required: checked,
                              })
                            }
                            size="sm"
                          />
                        </div>
                      );
                    })}
                </div>
              </Card>
            </TabsContent>

            {/* Branding */}
            <TabsContent value="branding" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Visual Customization
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={template.brand_color}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            brand_color: e.target.value,
                          }))
                        }
                        className="w-12 h-10 rounded border border-gray-300"
                      />
                      <Input
                        value={template.brand_color}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            brand_color: e.target.value,
                          }))
                        }
                        placeholder="#7F56D9"
                        className="max-w-32"
                      />
                    </div>
                  </div>

                  <Input
                    label="Logo URL"
                    value={template.logo_url || ''}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        logo_url: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/logo.png"
                    helperText="Optional logo for the dashboard header"
                  />

                  <Input
                    label="Background Image URL"
                    value={template.background_image_url || ''}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        background_image_url: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/bg.jpg"
                    helperText="Optional background image for the dashboard"
                  />
                </div>
              </Card>
            </TabsContent>

            {/* Assignment Rules */}
            <TabsContent value="rules" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Assignment Rules
                </h3>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Configure when this template should be automatically
                    assigned to clients.
                  </p>

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Budget Range
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300">
                        <option value="">Any Budget</option>
                        <option value="luxury">Luxury (£50,000+)</option>
                        <option value="premium">
                          Premium (£25,000-£50,000)
                        </option>
                        <option value="standard">
                          Standard (£10,000-£25,000)
                        </option>
                        <option value="budget">Budget (Under £10,000)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest Count Range
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300">
                        <option value="">Any Size</option>
                        <option value="intimate">Intimate (Under 50)</option>
                        <option value="medium">Medium (50-100)</option>
                        <option value="large">Large (100-200)</option>
                        <option value="grand">Grand (200+)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wedding Style
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300">
                        <option value="">Any Style</option>
                        <option value="traditional">Traditional</option>
                        <option value="modern">Modern</option>
                        <option value="rustic">Rustic</option>
                        <option value="destination">Destination</option>
                        <option value="intimate">Intimate</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Section Library */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Section Library
              </h3>
              <Badge variant="secondary">
                {SECTION_LIBRARY.length} available
              </Badge>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {SECTION_LIBRARY.map((item) => {
                const IconComponent =
                  SECTION_ICONS[
                    item.section_type as keyof typeof SECTION_ICONS
                  ] || LayoutDashboard;
                const isAdded = sections.some(
                  (s) => s.section_type === item.section_type && s.is_active,
                );

                return (
                  <div
                    key={item.section_type}
                    className={cn(
                      'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all',
                      isAdded
                        ? 'bg-primary-50 border-primary-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300',
                    )}
                    onClick={() => !isAdded && addSectionFromLibrary(item)}
                  >
                    <div className="flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {item.default_width}×{item.default_height}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                    {isAdded && (
                      <div className="flex-shrink-0">
                        <Badge variant="success" className="text-xs">
                          Added
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Template Preview
            </h3>

            {/* Mock dashboard preview */}
            <div
              className="border rounded-lg overflow-hidden bg-white shadow-sm"
              style={{ minHeight: '500px' }}
            >
              {/* Header */}
              <div
                className="p-4 text-white"
                style={{ backgroundColor: template.brand_color }}
              >
                {template.logo_url && (
                  <img
                    src={template.logo_url}
                    alt="Logo"
                    className="h-6 mb-2"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <h2 className="text-lg font-bold">
                  {template.name || 'Template Name'}
                </h2>
                <p className="text-sm opacity-90">Client Dashboard</p>
              </div>

              {/* Content Grid */}
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {sections
                    .filter((s) => s.is_active)
                    .map((section) => {
                      const IconComponent =
                        SECTION_ICONS[
                          section.section_type as keyof typeof SECTION_ICONS
                        ] || LayoutDashboard;

                      return (
                        <div
                          key={section.id}
                          className="bg-gray-100 rounded p-2 flex flex-col items-center justify-center text-center"
                          style={{
                            gridColumn: `span ${Math.min(section.width / 3, 4)}`,
                            height: `${section.height * 20}px`,
                            minHeight: '40px',
                          }}
                        >
                          <IconComponent className="h-3 w-3 text-gray-600 mb-1" />
                          <span className="font-medium text-gray-700 truncate">
                            {section.title}
                          </span>
                        </div>
                      );
                    })}
                </div>

                {sections.filter((s) => s.is_active).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <LayoutDashboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Add sections to see preview</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
