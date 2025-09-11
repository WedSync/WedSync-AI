'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Plus,
  Save,
  Eye,
  Settings,
  Smartphone,
  Monitor,
  ChevronRight,
  Trash2,
  Copy,
  MoreHorizontal,
  Layers,
  PaintBucket,
  Type,
  Mail,
  Calendar,
  Users,
  CreditCard,
  Image as ImageIcon,
  FileText,
  Play,
  Pause,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplateComponent {
  id: string;
  type: 'text' | 'image' | 'form' | 'rsvp' | 'timeline' | 'vendor' | 'payment';
  name: string;
  content: any;
  styles: {
    width: string;
    height: string;
    padding: string;
    margin: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    fontSize: string;
    textAlign: 'left' | 'center' | 'right';
  };
  settings: any;
}

interface TemplateData {
  id: string;
  title: string;
  description: string;
  components: TemplateComponent[];
  metadata: {
    category: string;
    tags: string[];
    version: string;
  };
}

const WEDDING_COMPONENT_LIBRARY = [
  {
    type: 'text',
    name: 'Welcome Message',
    icon: Type,
    description: 'Personalized welcome text for couples',
    defaultContent: {
      text: 'Welcome to your wedding dashboard, {{couple_names}}!',
      placeholder: 'Your personalized welcome message',
    },
  },
  {
    type: 'rsvp',
    name: 'RSVP Block',
    icon: Users,
    description: 'RSVP response form with guest details',
    defaultContent: {
      title: 'Please respond by {{rsvp_date}}',
      fields: ['attending', 'guest_count', 'dietary_requirements', 'contact'],
    },
  },
  {
    type: 'timeline',
    name: 'Timeline Element',
    icon: Calendar,
    description: 'Wedding day timeline with customizable events',
    defaultContent: {
      title: 'Wedding Day Timeline',
      events: [
        { time: '2:00 PM', event: 'Ceremony begins' },
        { time: '3:00 PM', event: 'Cocktail hour' },
        { time: '6:00 PM', event: 'Reception starts' },
      ],
    },
  },
  {
    type: 'vendor',
    name: 'Vendor Contact',
    icon: FileText,
    description: 'Vendor contact information and services',
    defaultContent: {
      title: 'Your Wedding Team',
      contacts: [
        {
          type: 'photographer',
          name: 'Example Photography',
          phone: '+44 7700 900000',
        },
        { type: 'venue', name: 'Example Venue', email: 'info@venue.com' },
      ],
    },
  },
  {
    type: 'payment',
    name: 'Payment Reminder',
    icon: CreditCard,
    description: 'Payment schedule and reminder block',
    defaultContent: {
      title: 'Payment Schedule',
      amount: '£{{amount}}',
      dueDate: '{{due_date}}',
      description: 'Final payment for your wedding services',
    },
  },
  {
    type: 'image',
    name: 'Photo Gallery',
    icon: ImageIcon,
    description: 'Wedding photo gallery or placeholder',
    defaultContent: {
      src: '/api/placeholder/400/300',
      alt: 'Wedding photo',
      caption: 'Your special moments',
    },
  },
  {
    type: 'form',
    name: 'Contact Form',
    icon: Mail,
    description: 'Custom contact form for couples',
    defaultContent: {
      title: 'Get in Touch',
      fields: [
        { type: 'text', name: 'name', label: 'Full Name', required: true },
        {
          type: 'email',
          name: 'email',
          label: 'Email Address',
          required: true,
        },
        {
          type: 'textarea',
          name: 'message',
          label: 'Message',
          required: false,
        },
      ],
    },
  },
];

function ComponentPalette() {
  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Components</h3>
        <p className="text-sm text-gray-600">Drag components to the canvas</p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Wedding Elements
          </h4>
          <div className="space-y-2">
            {WEDDING_COMPONENT_LIBRARY.map((component) => {
              const IconComponent = component.icon;
              return (
                <DraggableComponent
                  key={component.type}
                  id={`palette-${component.type}`}
                  component={component}
                >
                  <div className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing border border-gray-200 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <IconComponent className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">
                        {component.name}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {component.description}
                      </div>
                    </div>
                  </div>
                </DraggableComponent>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Basic Elements
          </h4>
          <div className="space-y-2">
            <div className="flex items-center p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded cursor-grab">
              <Type className="w-4 h-4 mr-2 text-gray-600" />
              Heading
            </div>
            <div className="flex items-center p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded cursor-grab">
              <FileText className="w-4 h-4 mr-2 text-gray-600" />
              Paragraph
            </div>
            <div className="flex items-center p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded cursor-grab">
              <ImageIcon className="w-4 h-4 mr-2 text-gray-600" />
              Image
            </div>
            <div className="flex items-center p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded cursor-grab">
              <Layers className="w-4 h-4 mr-2 text-gray-600" />
              Spacer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraggableComponent({
  id,
  component,
  children,
}: {
  id: string;
  component: any;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: component,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

function CanvasArea({
  components,
  selectedComponent,
  onSelectComponent,
  onDeleteComponent,
  onDuplicateComponent,
}: {
  components: TemplateComponent[];
  selectedComponent: string | null;
  onSelectComponent: (id: string | null) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-area',
  });

  return (
    <div className="flex-1 bg-gray-100 p-6 relative overflow-auto">
      <div className="max-w-2xl mx-auto">
        {/* Canvas Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Email Template Canvas
              </h3>
              <p className="text-sm text-gray-600">
                Design your template by dragging components here
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Desktop View
              </Badge>
              <Button variant="outline" size="sm">
                <Smartphone className="w-4 h-4 mr-2" />
                Mobile
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas Drop Zone */}
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-[600px] bg-white rounded-lg shadow-sm border-2 border-dashed transition-colors',
            isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
            components.length === 0 && 'flex items-center justify-center',
          )}
        >
          {components.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Start Building Your Template
              </h4>
              <p className="text-gray-600 max-w-sm mx-auto">
                Drag wedding components from the left panel to create your email
                template
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <SortableContext
                items={components.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {components.map((component) => (
                  <CanvasComponent
                    key={component.id}
                    component={component}
                    isSelected={selectedComponent === component.id}
                    onSelect={() => onSelectComponent(component.id)}
                    onDelete={() => onDeleteComponent(component.id)}
                    onDuplicate={() => onDuplicateComponent(component.id)}
                  />
                ))}
              </SortableContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CanvasComponent({
  component,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  component: TemplateComponent;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const renderComponentContent = () => {
    switch (component.type) {
      case 'text':
        return (
          <div className="p-4">
            <div className="text-lg font-medium text-gray-900">
              {component.content.text || 'Welcome Message'}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {component.content.placeholder}
            </div>
          </div>
        );
      case 'rsvp':
        return (
          <div className="p-4">
            <div className="text-lg font-semibold text-gray-900 mb-4">
              {component.content.title}
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input type="radio" name="attending" className="w-4 h-4" />
                <label className="text-sm">Yes, I will attend</label>
              </div>
              <div className="flex items-center space-x-3">
                <input type="radio" name="attending" className="w-4 h-4" />
                <label className="text-sm">Sorry, I cannot attend</label>
              </div>
              <Input placeholder="Number of guests" className="mt-3" />
            </div>
          </div>
        );
      case 'timeline':
        return (
          <div className="p-4">
            <div className="text-lg font-semibold text-gray-900 mb-4">
              {component.content.title}
            </div>
            <div className="space-y-3">
              {component.content.events.map((event: any, index: number) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-blue-600">
                    {event.time}
                  </div>
                  <div className="text-sm text-gray-900">{event.event}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'vendor':
        return (
          <div className="p-4">
            <div className="text-lg font-semibold text-gray-900 mb-4">
              {component.content.title}
            </div>
            <div className="space-y-3">
              {component.content.contacts.map((contact: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <div className="font-medium text-sm">{contact.name}</div>
                    <div className="text-xs text-gray-600 capitalize">
                      {contact.type}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {contact.phone || contact.email}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 mb-2">
              {component.content.title}
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {component.content.amount}
            </div>
            <div className="text-sm text-gray-700">
              Due: {component.content.dueDate}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {component.content.description}
            </div>
            <Button size="sm" className="mt-3">
              Pay Now
            </Button>
          </div>
        );
      case 'image':
        return (
          <div className="p-4">
            <img
              src={component.content.src}
              alt={component.content.alt}
              className="w-full h-48 object-cover rounded-lg"
            />
            {component.content.caption && (
              <div className="text-sm text-gray-600 text-center mt-2">
                {component.content.caption}
              </div>
            )}
          </div>
        );
      case 'form':
        return (
          <div className="p-4">
            <div className="text-lg font-semibold text-gray-900 mb-4">
              {component.content.title}
            </div>
            <div className="space-y-4">
              {component.content.fields.map((field: any, index: number) => (
                <div key={index}>
                  <Label className="text-sm font-medium">
                    {field.label}{' '}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded mt-1"
                      placeholder={`Enter your ${field.label.toLowerCase()}`}
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={field.type}
                      placeholder={`Enter your ${field.label.toLowerCase()}`}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
              <Button className="w-full mt-4">Submit</Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 text-gray-600">Component: {component.type}</div>
        );
    }
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative border-2 rounded-lg cursor-pointer transition-all group',
        isSelected
          ? 'border-blue-500 shadow-lg bg-blue-50'
          : 'border-transparent hover:border-gray-300 bg-white shadow-sm hover:shadow-md',
      )}
    >
      {renderComponentContent()}

      {/* Component Controls */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 flex items-center space-x-1 bg-white rounded-lg shadow-lg border p-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="w-8 h-8 p-0"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-8 h-8 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Component Type Badge */}
      <Badge
        variant="secondary"
        className="absolute top-2 left-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {component.type}
      </Badge>
    </div>
  );
}

function PropertyPanel({
  selectedComponent,
  components,
  onUpdateComponent,
}: {
  selectedComponent: string | null;
  components: TemplateComponent[];
  onUpdateComponent: (id: string, updates: Partial<TemplateComponent>) => void;
}) {
  const component = components.find((c) => c.id === selectedComponent);

  if (!component) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-center py-12">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            No Component Selected
          </h4>
          <p className="text-xs text-gray-600">
            Select a component on the canvas to edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
        <p className="text-sm text-gray-600">{component.name} Settings</p>
      </div>

      <ScrollArea className="h-full p-4">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            {component.type === 'text' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Text Content</Label>
                  <Input
                    value={component.content.text || ''}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        content: { ...component.content, text: e.target.value },
                      })
                    }
                    className="mt-1"
                    placeholder="Enter text content"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Placeholder</Label>
                  <Input
                    value={component.content.placeholder || ''}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        content: {
                          ...component.content,
                          placeholder: e.target.value,
                        },
                      })
                    }
                    className="mt-1"
                    placeholder="Enter placeholder text"
                  />
                </div>
              </div>
            )}

            {component.type === 'rsvp' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">RSVP Title</Label>
                  <Input
                    value={component.content.title || ''}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        content: {
                          ...component.content,
                          title: e.target.value,
                        },
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {component.type === 'payment' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Payment Title</Label>
                  <Input
                    value={component.content.title || ''}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        content: {
                          ...component.content,
                          title: e.target.value,
                        },
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <Input
                    value={component.content.amount || ''}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        content: {
                          ...component.content,
                          amount: e.target.value,
                        },
                      })
                    }
                    className="mt-1"
                    placeholder="£1000"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <Input
                    value={component.content.dueDate || ''}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        content: {
                          ...component.content,
                          dueDate: e.target.value,
                        },
                      })
                    }
                    className="mt-1"
                    placeholder="{{due_date}}"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <textarea
                    value={component.content.description || ''}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        content: {
                          ...component.content,
                          description: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2 text-sm border border-gray-300 rounded mt-1"
                    rows={3}
                    placeholder="Payment description"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="style" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Background Color</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="color"
                    value={component.styles.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        styles: {
                          ...component.styles,
                          backgroundColor: e.target.value,
                        },
                      })
                    }
                    className="w-10 h-8 border rounded cursor-pointer"
                  />
                  <Input
                    value={component.styles.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        styles: {
                          ...component.styles,
                          backgroundColor: e.target.value,
                        },
                      })
                    }
                    className="flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Text Color</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="color"
                    value={component.styles.textColor || '#000000'}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        styles: {
                          ...component.styles,
                          textColor: e.target.value,
                        },
                      })
                    }
                    className="w-10 h-8 border rounded cursor-pointer"
                  />
                  <Input
                    value={component.styles.textColor || '#000000'}
                    onChange={(e) =>
                      onUpdateComponent(component.id, {
                        styles: {
                          ...component.styles,
                          textColor: e.target.value,
                        },
                      })
                    }
                    className="flex-1"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Font Size</Label>
                <select
                  value={component.styles.fontSize || '16px'}
                  onChange={(e) =>
                    onUpdateComponent(component.id, {
                      styles: { ...component.styles, fontSize: e.target.value },
                    })
                  }
                  className="w-full p-2 text-sm border border-gray-300 rounded mt-1"
                >
                  <option value="12px">12px (Small)</option>
                  <option value="14px">14px (Normal)</option>
                  <option value="16px">16px (Medium)</option>
                  <option value="18px">18px (Large)</option>
                  <option value="24px">24px (X-Large)</option>
                  <option value="32px">32px (Heading)</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium">Text Alignment</Label>
                <select
                  value={component.styles.textAlign || 'left'}
                  onChange={(e) =>
                    onUpdateComponent(component.id, {
                      styles: {
                        ...component.styles,
                        textAlign: e.target.value as any,
                      },
                    })
                  }
                  className="w-full p-2 text-sm border border-gray-300 rounded mt-1"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium">Padding</Label>
                <Input
                  value={component.styles.padding || '16px'}
                  onChange={(e) =>
                    onUpdateComponent(component.id, {
                      styles: { ...component.styles, padding: e.target.value },
                    })
                  }
                  className="mt-1"
                  placeholder="16px"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

export default function TemplateBuilderPage() {
  const [template, setTemplate] = useState<TemplateData>({
    id: 'new-template',
    title: 'New Email Template',
    description: '',
    components: [],
    metadata: {
      category: 'email',
      tags: [],
      version: '1.0.0',
    },
  });

  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null,
  );
  const [activeComponent, setActiveComponent] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(
    'desktop',
  );
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (template.components.length > 0) {
        performAutoSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [template]);

  const performAutoSave = useCallback(async () => {
    setIsAutoSaving(true);
    try {
      // Mock auto-save API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Template auto-saved:', template);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [template]);

  const generateComponentId = () => {
    return 'component-' + Math.random().toString(36).substr(2, 9);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveComponent(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveComponent(null);

    const { active, over } = event;

    if (!over) return;

    if (over.id === 'canvas-area') {
      const componentData = active.data.current as any;

      if (componentData && active.id.toString().startsWith('palette-')) {
        // Add new component from palette
        const newComponent: TemplateComponent = {
          id: generateComponentId(),
          type: componentData.type,
          name: componentData.name,
          content: componentData.defaultContent,
          styles: {
            width: '100%',
            height: 'auto',
            padding: '16px',
            margin: '0',
            backgroundColor: '#ffffff',
            textColor: '#000000',
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            textAlign: 'left',
          },
          settings: {},
        };

        setTemplate((prev) => ({
          ...prev,
          components: [...prev.components, newComponent],
        }));

        setSelectedComponent(newComponent.id);
      }
    }
  };

  const handleDeleteComponent = (componentId: string) => {
    setTemplate((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== componentId),
    }));
    setSelectedComponent(null);
  };

  const handleDuplicateComponent = (componentId: string) => {
    const componentToDuplicate = template.components.find(
      (c) => c.id === componentId,
    );
    if (!componentToDuplicate) return;

    const duplicatedComponent: TemplateComponent = {
      ...componentToDuplicate,
      id: generateComponentId(),
      name: componentToDuplicate.name + ' (Copy)',
    };

    const componentIndex = template.components.findIndex(
      (c) => c.id === componentId,
    );
    const newComponents = [...template.components];
    newComponents.splice(componentIndex + 1, 0, duplicatedComponent);

    setTemplate((prev) => ({
      ...prev,
      components: newComponents,
    }));

    setSelectedComponent(duplicatedComponent.id);
  };

  const handleUpdateComponent = (
    componentId: string,
    updates: Partial<TemplateComponent>,
  ) => {
    setTemplate((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === componentId ? { ...c, ...updates } : c,
      ),
    }));
  };

  const handleSaveTemplate = async () => {
    try {
      // Mock save API call
      console.log('Saving template:', template);
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save template');
    }
  };

  const handlePreviewTemplate = () => {
    // Open preview in new tab
    const previewData = encodeURIComponent(JSON.stringify(template));
    window.open(`/wedme/templates/preview?data=${previewData}`, '_blank');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {template.title}
              </h1>
              <p className="text-sm text-gray-600">
                Wedding Email Template Builder
                {isAutoSaving && (
                  <span className="ml-2 text-blue-600">• Auto-saving...</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                onClick={() => setPreviewMode('desktop')}
                className="flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                Desktop
              </Button>
              <Button
                size="sm"
                variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                onClick={() => setPreviewMode('mobile')}
                className="flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Mobile
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Button variant="outline" onClick={handlePreviewTemplate}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>

            <Button onClick={handleSaveTemplate}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          <ComponentPalette />

          <CanvasArea
            components={template.components}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
            onDeleteComponent={handleDeleteComponent}
            onDuplicateComponent={handleDuplicateComponent}
          />

          <PropertyPanel
            selectedComponent={selectedComponent}
            components={template.components}
            onUpdateComponent={handleUpdateComponent}
          />
        </div>

        <DragOverlay>
          {activeComponent ? (
            <div className="bg-white p-4 rounded-lg shadow-lg border">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <activeComponent.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {activeComponent.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {activeComponent.description}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
