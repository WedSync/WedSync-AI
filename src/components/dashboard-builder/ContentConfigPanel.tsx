'use client';

import React, { useState } from 'react';
import {
  Settings,
  FileText,
  Image,
  Calendar,
  Users,
  DollarSign,
  MessageCircle,
  CheckSquare,
  Heart,
  Eye,
  EyeOff,
  Clock,
  Layers,
  Filter,
  Zap,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  Move,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Content types for different sections
interface ContentItem {
  id: string;
  type:
    | 'form'
    | 'document'
    | 'image'
    | 'text'
    | 'link'
    | 'video'
    | 'checklist'
    | 'countdown';
  title: string;
  description?: string;
  content: any;
  metadata: {
    priority: number;
    timelineDependency?: string;
    formDependency?: string;
    packageDependency?: string[];
    isRequired: boolean;
    autoHideOnComplete: boolean;
    estimatedTime?: number;
    tags: string[];
  };
  styling: {
    theme: 'default' | 'featured' | 'minimal' | 'card';
    colorScheme: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    size: 'sm' | 'md' | 'lg' | 'xl';
    animation: 'none' | 'fade' | 'slide' | 'scale' | 'bounce';
  };
  conditions: {
    showWhen: 'always' | 'timeline' | 'form_complete' | 'milestone' | 'custom';
    hideWhen: 'never' | 'complete' | 'expired' | 'superseded';
    customLogic?: string;
  };
}

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  sectionTypes: string[];
  items: Omit<ContentItem, 'id'>[];
}

// Content templates for different section types
const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'forms_early_planning',
    name: 'Early Planning Forms',
    description:
      'Essential forms for couples starting their wedding planning journey',
    sectionTypes: ['forms', 'documents'],
    items: [
      {
        type: 'form',
        title: 'Wedding Vision Questionnaire',
        description: 'Help us understand your dream wedding',
        content: {
          formId: 'wedding_vision',
          fields: [
            'wedding_style',
            'venue_preference',
            'color_scheme',
            'guest_count_estimate',
          ],
        },
        metadata: {
          priority: 1,
          timelineDependency: '9_months_before',
          isRequired: true,
          autoHideOnComplete: true,
          estimatedTime: 15,
          tags: ['planning', 'vision', 'initial'],
        },
        styling: {
          theme: 'featured',
          colorScheme: 'primary',
          size: 'lg',
          animation: 'fade',
        },
        conditions: {
          showWhen: 'timeline',
          hideWhen: 'complete',
        },
      },
      {
        type: 'document',
        title: 'Wedding Planning Timeline',
        description: 'Your personalized planning checklist',
        content: {
          documentType: 'timeline',
          templateId: 'planning_timeline',
        },
        metadata: {
          priority: 2,
          formDependency: 'wedding_vision',
          isRequired: false,
          autoHideOnComplete: false,
          tags: ['timeline', 'checklist'],
        },
        styling: {
          theme: 'card',
          colorScheme: 'secondary',
          size: 'md',
          animation: 'slide',
        },
        conditions: {
          showWhen: 'form_complete',
          hideWhen: 'never',
        },
      },
    ],
  },
  {
    id: 'budget_tracker_content',
    name: 'Budget Management',
    description: 'Tools and content for wedding budget management',
    sectionTypes: ['budget_tracker', 'documents'],
    items: [
      {
        type: 'form',
        title: 'Initial Budget Planning',
        description: 'Set your overall wedding budget and priorities',
        content: {
          formId: 'budget_initial',
          fields: [
            'total_budget',
            'must_haves',
            'nice_to_haves',
            'cost_breakdown',
          ],
        },
        metadata: {
          priority: 1,
          timelineDependency: '8_months_before',
          isRequired: true,
          autoHideOnComplete: false,
          estimatedTime: 20,
          tags: ['budget', 'planning', 'financial'],
        },
        styling: {
          theme: 'featured',
          colorScheme: 'success',
          size: 'lg',
          animation: 'fade',
        },
        conditions: {
          showWhen: 'always',
          hideWhen: 'never',
        },
      },
      {
        type: 'checklist',
        title: 'Budget Tracking Checklist',
        description: 'Track expenses across all wedding categories',
        content: {
          categories: [
            'venue',
            'catering',
            'photography',
            'flowers',
            'music',
            'attire',
            'transportation',
          ],
          trackingEnabled: true,
        },
        metadata: {
          priority: 2,
          formDependency: 'budget_initial',
          isRequired: false,
          autoHideOnComplete: false,
          tags: ['budget', 'tracking', 'checklist'],
        },
        styling: {
          theme: 'default',
          colorScheme: 'primary',
          size: 'md',
          animation: 'none',
        },
        conditions: {
          showWhen: 'form_complete',
          hideWhen: 'never',
        },
      },
    ],
  },
  {
    id: 'vendor_showcase',
    name: 'Vendor Portfolio',
    description: 'Showcase recommended vendors with portfolios',
    sectionTypes: ['vendor_portfolio', 'gallery'],
    items: [
      {
        type: 'text',
        title: 'Recommended Vendors',
        description: 'Our carefully curated vendor partners',
        content: {
          text: 'Discover our trusted vendor partners who specialize in creating magical wedding experiences.',
          allowMarkdown: true,
        },
        metadata: {
          priority: 1,
          packageDependency: ['gold', 'platinum'],
          isRequired: false,
          autoHideOnComplete: false,
          tags: ['vendors', 'introduction'],
        },
        styling: {
          theme: 'minimal',
          colorScheme: 'secondary',
          size: 'md',
          animation: 'fade',
        },
        conditions: {
          showWhen: 'always',
          hideWhen: 'never',
        },
      },
      {
        type: 'image',
        title: 'Vendor Galleries',
        description: 'Browse portfolios from our vendor partners',
        content: {
          galleryType: 'vendor_portfolio',
          filterByCategory: true,
          allowBookmarking: true,
        },
        metadata: {
          priority: 2,
          isRequired: false,
          autoHideOnComplete: false,
          tags: ['vendors', 'gallery', 'portfolio'],
        },
        styling: {
          theme: 'card',
          colorScheme: 'primary',
          size: 'xl',
          animation: 'scale',
        },
        conditions: {
          showWhen: 'always',
          hideWhen: 'never',
        },
      },
    ],
  },
  {
    id: 'final_week_content',
    name: 'Final Week Essentials',
    description: 'Critical items for the final week before the wedding',
    sectionTypes: ['tasks', 'timeline', 'communication'],
    items: [
      {
        type: 'checklist',
        title: 'Final Week Checklist',
        description: 'Essential tasks for your final week',
        content: {
          items: [
            'Confirm final headcount with venue',
            'Review ceremony timeline',
            'Prepare emergency kit',
            'Confirm transportation',
            'Final venue walkthrough',
            'Wedding party rehearsal',
          ],
          allowCustomItems: true,
        },
        metadata: {
          priority: 1,
          timelineDependency: '1_week_before',
          isRequired: true,
          autoHideOnComplete: false,
          estimatedTime: 30,
          tags: ['final_week', 'checklist', 'critical'],
        },
        styling: {
          theme: 'featured',
          colorScheme: 'warning',
          size: 'lg',
          animation: 'bounce',
        },
        conditions: {
          showWhen: 'timeline',
          hideWhen: 'never',
        },
      },
      {
        type: 'countdown',
        title: 'Wedding Countdown',
        description: 'Days until your special day',
        content: {
          showDays: true,
          showHours: true,
          showMinutes: false,
          customMessage: 'Almost there!',
        },
        metadata: {
          priority: 2,
          timelineDependency: '2_weeks_before',
          isRequired: false,
          autoHideOnComplete: false,
          tags: ['countdown', 'excitement'],
        },
        styling: {
          theme: 'featured',
          colorScheme: 'error',
          size: 'xl',
          animation: 'scale',
        },
        conditions: {
          showWhen: 'timeline',
          hideWhen: 'complete',
        },
      },
    ],
  },
];

interface ContentConfigPanelProps {
  sectionType: string;
  sectionTitle: string;
  contentItems: ContentItem[];
  onContentChange: (items: ContentItem[]) => void;
  clientContext?: {
    packageLevel?: string;
    weddingDate?: Date;
    completedForms?: string[];
  };
}

export default function ContentConfigPanel({
  sectionType,
  sectionTitle,
  contentItems,
  onContentChange,
  clientContext,
}: ContentConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'content' | 'templates' | 'preview'
  >('content');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Get relevant templates for this section type
  const relevantTemplates = CONTENT_TEMPLATES.filter(
    (template) =>
      template.sectionTypes.includes(sectionType) ||
      template.sectionTypes.includes('*') ||
      sectionType === 'mixed',
  );

  // Add content item from template
  const addFromTemplate = (template: ContentTemplate) => {
    const newItems = template.items.map((item, index) => ({
      ...item,
      id: `item-${Date.now()}-${index}`,
      metadata: {
        ...item.metadata,
        priority: contentItems.length + index,
      },
    }));

    onContentChange([...contentItems, ...newItems]);
  };

  // Add blank content item
  const addBlankItem = (type: ContentItem['type']) => {
    const newItem: ContentItem = {
      id: `item-${Date.now()}`,
      type,
      title: `New ${type}`,
      description: '',
      content: {},
      metadata: {
        priority: contentItems.length,
        isRequired: false,
        autoHideOnComplete: false,
        tags: [],
      },
      styling: {
        theme: 'default',
        colorScheme: 'primary',
        size: 'md',
        animation: 'none',
      },
      conditions: {
        showWhen: 'always',
        hideWhen: 'never',
      },
    };

    onContentChange([...contentItems, newItem]);
  };

  // Update content item
  const updateItem = (itemId: string, updates: Partial<ContentItem>) => {
    onContentChange(
      contentItems.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    );
  };

  // Remove content item
  const removeItem = (itemId: string) => {
    onContentChange(contentItems.filter((item) => item.id !== itemId));
  };

  // Reorder items
  const reorderItems = (startIndex: number, endIndex: number) => {
    const newItems = [...contentItems];
    const [removed] = newItems.splice(startIndex, 1);
    newItems.splice(endIndex, 0, removed);

    // Update priorities
    newItems.forEach((item, index) => {
      item.metadata.priority = index;
    });

    onContentChange(newItems);
  };

  // Duplicate item
  const duplicateItem = (itemId: string) => {
    const item = contentItems.find((i) => i.id === itemId);
    if (item) {
      const duplicated = {
        ...item,
        id: `item-${Date.now()}`,
        title: `${item.title} (Copy)`,
        metadata: {
          ...item.metadata,
          priority: contentItems.length,
        },
      };
      onContentChange([...contentItems, duplicated]);
    }
  };

  // Get content type icon
  const getContentIcon = (type: ContentItem['type']) => {
    const icons = {
      form: FileText,
      document: FileText,
      image: Image,
      text: FileText,
      link: FileText,
      video: Image,
      checklist: CheckSquare,
      countdown: Clock,
    };
    return icons[type] || FileText;
  };

  // Evaluate content visibility
  const evaluateVisibility = (
    item: ContentItem,
  ): { visible: boolean; reason: string } => {
    if (!clientContext) {
      return { visible: true, reason: 'No context for evaluation' };
    }

    switch (item.conditions.showWhen) {
      case 'always':
        return { visible: true, reason: 'Always visible' };

      case 'timeline':
        if (item.metadata.timelineDependency && clientContext.weddingDate) {
          // Timeline logic would go here
          return {
            visible: true,
            reason: `Timeline condition: ${item.metadata.timelineDependency}`,
          };
        }
        return { visible: false, reason: 'Timeline condition not met' };

      case 'form_complete':
        if (item.metadata.formDependency && clientContext.completedForms) {
          const formCompleted = clientContext.completedForms.includes(
            item.metadata.formDependency,
          );
          return {
            visible: formCompleted,
            reason: `Form ${item.metadata.formDependency} ${formCompleted ? 'completed' : 'not completed'}`,
          };
        }
        return { visible: false, reason: 'Form dependency not met' };

      case 'milestone':
        // Milestone logic would go here
        return { visible: true, reason: 'Milestone-based (not implemented)' };

      case 'custom':
        // Custom logic evaluation would go here
        return { visible: true, reason: 'Custom condition (not implemented)' };

      default:
        return { visible: true, reason: 'Default visibility' };
    }
  };

  const sortedItems = [...contentItems].sort(
    (a, b) => a.metadata.priority - b.metadata.priority,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {sectionTitle} Content Configuration
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Configure content items, their visibility rules, and presentation
          style
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Content Items</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Content Items Tab */}
        <TabsContent value="content" className="space-y-4">
          {/* Quick Add Buttons */}
          <Card className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Content
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FileText className="h-4 w-4" />}
                onClick={() => addBlankItem('form')}
              >
                Form
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FileText className="h-4 w-4" />}
                onClick={() => addBlankItem('document')}
              >
                Document
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Image className="h-4 w-4" />}
                onClick={() => addBlankItem('image')}
              >
                Image/Gallery
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<CheckSquare className="h-4 w-4" />}
                onClick={() => addBlankItem('checklist')}
              >
                Checklist
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Clock className="h-4 w-4" />}
                onClick={() => addBlankItem('countdown')}
              >
                Countdown
              </Button>
            </div>
          </Card>

          {/* Content Items List */}
          <div className="space-y-3">
            {sortedItems.map((item, index) => {
              const IconComponent = getContentIcon(item.type);
              const visibility = evaluateVisibility(item);
              const isExpanded = expandedItem === item.id;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    'p-4 transition-all',
                    visibility.visible
                      ? 'border-success-200 bg-success-50/30'
                      : 'border-gray-200',
                    draggedItem === item.id && 'opacity-50',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="mt-1 p-2 bg-gray-100 rounded cursor-move"
                        draggable
                        onDragStart={() => setDraggedItem(item.id)}
                        onDragEnd={() => setDraggedItem(null)}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            value={item.title}
                            onChange={(e) =>
                              updateItem(item.id, { title: e.target.value })
                            }
                            className="font-medium text-sm max-w-xs"
                          />

                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>

                          <Badge
                            variant={
                              visibility.visible ? 'success' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {visibility.visible ? 'VISIBLE' : 'HIDDEN'}
                          </Badge>

                          {item.metadata.isRequired && (
                            <Badge variant="warning" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>Priority: {item.metadata.priority}</span>
                          <span>•</span>
                          <span>{visibility.reason}</span>
                          {item.metadata.estimatedTime && (
                            <>
                              <span>•</span>
                              <span>{item.metadata.estimatedTime}min</span>
                            </>
                          )}
                        </div>

                        {item.metadata.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {item.metadata.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Expanded Configuration */}
                        {isExpanded && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-4">
                            <Input
                              label="Description"
                              value={item.description || ''}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Describe this content item..."
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-1 block">
                                  Show When
                                </label>
                                <select
                                  className="w-full px-2 py-1 text-xs border rounded"
                                  value={item.conditions.showWhen}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      conditions: {
                                        ...item.conditions,
                                        showWhen: e.target.value as any,
                                      },
                                    })
                                  }
                                >
                                  <option value="always">Always</option>
                                  <option value="timeline">
                                    Timeline-based
                                  </option>
                                  <option value="form_complete">
                                    Form Complete
                                  </option>
                                  <option value="milestone">Milestone</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-1 block">
                                  Hide When
                                </label>
                                <select
                                  className="w-full px-2 py-1 text-xs border rounded"
                                  value={item.conditions.hideWhen}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      conditions: {
                                        ...item.conditions,
                                        hideWhen: e.target.value as any,
                                      },
                                    })
                                  }
                                >
                                  <option value="never">Never</option>
                                  <option value="complete">
                                    When Complete
                                  </option>
                                  <option value="expired">When Expired</option>
                                  <option value="superseded">
                                    When Superseded
                                  </option>
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={item.metadata.isRequired}
                                    onCheckedChange={(checked) =>
                                      updateItem(item.id, {
                                        metadata: {
                                          ...item.metadata,
                                          isRequired: checked,
                                        },
                                      })
                                    }
                                    size="sm"
                                  />
                                  <span className="text-xs">Required</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={item.metadata.autoHideOnComplete}
                                    onCheckedChange={(checked) =>
                                      updateItem(item.id, {
                                        metadata: {
                                          ...item.metadata,
                                          autoHideOnComplete: checked,
                                        },
                                      })
                                    }
                                    size="sm"
                                  />
                                  <span className="text-xs">
                                    Auto-hide when complete
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <Input
                                  label="Estimated Time (min)"
                                  type="number"
                                  value={item.metadata.estimatedTime || ''}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      metadata: {
                                        ...item.metadata,
                                        estimatedTime:
                                          parseInt(e.target.value) || undefined,
                                      },
                                    })
                                  }
                                  className="w-20 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() =>
                          setExpandedItem(isExpanded ? null : item.id)
                        }
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => duplicateItem(item.id)}
                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-400 hover:text-error-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {contentItems.length === 0 && (
            <Card className="p-8 text-center">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h4 className="font-medium text-gray-900 mb-2">
                No Content Items
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Add content items to populate this section or use a template to
                get started quickly.
              </p>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setActiveTab('templates')}
              >
                Browse Templates
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {relevantTemplates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {template.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {template.items.length} items
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.sectionTypes.join(', ')}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1">
                      {template.items.map((item, index) => {
                        const IconComponent = getContentIcon(item.type);
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-xs text-gray-600"
                          >
                            <IconComponent className="h-3 w-3" />
                            <span>{item.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => addFromTemplate(template)}
                  >
                    Add Template
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {relevantTemplates.length === 0 && (
            <Card className="p-8 text-center">
              <Layers className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h4 className="font-medium text-gray-900 mb-2">
                No Templates Available
              </h4>
              <p className="text-sm text-gray-600">
                No content templates are available for the "{sectionType}"
                section type.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Content Preview
            </h4>

            {/* Context Info */}
            {clientContext && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="font-medium">Package:</span>{' '}
                    {clientContext.packageLevel || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium">Wedding Date:</span>{' '}
                    {clientContext.weddingDate
                      ? clientContext.weddingDate.toLocaleDateString()
                      : 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium">Completed Forms:</span>{' '}
                    {clientContext.completedForms?.length || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Items */}
            <div className="space-y-3">
              {sortedItems.map((item) => {
                const visibility = evaluateVisibility(item);
                const IconComponent = getContentIcon(item.type);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-3 border rounded-lg transition-all',
                      visibility.visible
                        ? 'border-primary-200 bg-primary-50/30'
                        : 'border-gray-200 bg-gray-50 opacity-50',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded',
                          visibility.visible ? 'bg-primary-100' : 'bg-gray-200',
                        )}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>

                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{item.title}</h5>
                        {item.description && (
                          <p className="text-xs text-gray-600 mt-1">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant={
                              visibility.visible ? 'success' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {visibility.visible ? 'Visible' : 'Hidden'}
                          </Badge>

                          <span className="text-xs text-gray-600">
                            {visibility.reason}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {contentItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No content items to preview</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
