# WS-309: Journey Module Types Overview - Team A UI Prompt

## COMPREHENSIVE TEAM A PROMPT
### Frontend UI Development for WedSync Journey Module Types System

---

## 🎯 DEVELOPMENT MANAGER DIRECTIVE

**Project**: WedSync Enterprise Wedding Platform  
**Feature**: WS-309 - Journey Module Types Overview  
**Team**: A (Frontend UI & User Experience)  
**Sprint**: Journey Module Types Interface Development  
**Priority**: P0 (Foundation for modular journey building)

**Context**: You are Team A, responsible for creating the user interface that allows wedding vendors to access and configure 7 different module types (email, SMS, forms, meetings, info, reviews, referrals) when building customer journeys. This interface must be intuitive enough for non-technical wedding professionals while powerful enough to handle complex automation workflows.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### MANDATORY FILE VERIFICATION (Non-Negotiable)
Before proceeding, you MUST verify these files exist and read their contents:

```typescript
// CRITICAL: These files must exist before you begin development
const requiredFiles = [
  '/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-309-journey-module-types-overview-technical.md',
  '/wedsync/src/components/journeys/JourneySystemLayout.tsx', // From WS-308 Team A
  '/wedsync/src/lib/services/journey-execution-engine.ts',   // From WS-308 Team B
  '/wedsync/src/lib/services/journey-module-service.ts',     // From backend teams
  '/wedsync/src/components/journeys/modules/ModuleTypeRegistry.tsx', // Your foundation
  '/wedsync/src/components/journeys/modules/EmailModule.tsx'          // Your component
];

// VERIFY: Each file must be read and understood before creating UI
requiredFiles.forEach(file => {
  if (!fileExists(file)) {
    throw new Error(`EVIDENCE FAILURE: Required file ${file} does not exist. Cannot create UI without backend services to integrate with.`);
  }
});
```

### ARCHITECTURAL CONTEXT VERIFICATION
You must understand the complete journey module system architecture:

1. **Module Registry** (Team A): Visual palette and drag-drop interface
2. **Module Services** (Team B): Backend module execution and validation
3. **Module Integrations** (Team C): External service connections
4. **Module Infrastructure** (Team D): Platform services and monitoring
5. **Module Quality** (Team E): Testing and validation

---

## 🧠 SEQUENTIAL THINKING INTEGRATION

### MANDATORY: Use Sequential Thinking MCP for UI Strategy

For every major UI design decision, you MUST use the Sequential Thinking MCP to analyze user experience requirements:

```typescript
// REQUIRED: Before implementing any module interface
await mcp__sequential_thinking__sequential_thinking({
  thought: "I need to design the UI for WedSync's journey module types system. Wedding vendors need to build complex customer journeys using 7 different module types. Let me analyze the UI requirements: 1) Module Palette - Visual registry showing all 7 module types categorized (communication, scheduling, feedback, etc.), 2) Drag-and-Drop Interface - Intuitive way to add modules to journey canvas, 3) Module Configuration - Type-specific forms for each module (email templates, SMS settings, form selection), 4) Visual Preview - Show vendors what each module will do before adding to journey, 5) Mobile Interface - Many wedding vendors work on tablets/phones at venues.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
});

// Continue analysis through all UI considerations
```

### WEDDING INDUSTRY UX ANALYSIS
```typescript
await mcp__sequential_thinking__sequential_thinking({
  thought: "Wedding vendor UI needs have unique characteristics I must address: 1) Non-Technical Users - Photographers and venue coordinators aren't developers, need simple drag-drop, 2) Visual Workflow Thinking - Wedding vendors think in timelines and steps, need visual representation, 3) Template-First Approach - Vendors want to start with proven workflows, not build from scratch, 4) Mobile Usage - 60% of wedding vendor work happens on mobile devices at venues, 5) Time Pressure - Vendors are busy during wedding season, need efficient interfaces, 6) Preview Essential - Must see what clients will receive before sending.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 8
});
```

---

## 🎨 WEDSYNC UI STACK INTEGRATION

### REQUIRED COMPONENT ARCHITECTURE
All module type components must follow WedSync design system:

```typescript
// MANDATORY: Use these exact imports for consistency
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Module-specific UI components
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ReactFlow, Controls, Background } from '@xyflow/react';
```

### DESIGN SYSTEM COMPLIANCE
- **Colors**: Use `module-communication`, `module-scheduling`, `module-feedback` theme colors
- **Typography**: `font-inter` for module descriptions, `font-display` for module names
- **Spacing**: Follow 4px grid system (`space-4`, `space-8`, `space-12`)
- **Mobile**: Touch-friendly module selection with minimum 48px touch targets

---

## 🔧 SERENA MCP INTEGRATION REQUIREMENTS

### MANDATORY SETUP PROTOCOL
```bash
# REQUIRED: Before any UI development work
serena activate_project WedSync2
serena get_symbols_overview src/components/journeys/modules/
serena find_symbol "ModuleTypeRegistry"
serena write_memory "WS-309-team-a-module-ui" "Journey module types UI development with drag-drop interface and configuration forms"
```

### SEMANTIC CODE REQUIREMENTS
All module UI code must be written using Serena MCP for consistency:

```typescript
// Use Serena for intelligent UI component generation
serena replace_symbol_body "ModuleTypeRegistry" "
interface ModuleTypeRegistryProps {
  onModuleSelect: (moduleType: ModuleTypeDefinition) => void;
  categories: ModuleTypeCategory[];
}

const ModuleTypeRegistry: React.FC<ModuleTypeRegistryProps> = ({
  onModuleSelect,
  categories
}) => {
  // Module palette with drag-drop interface
}
";

// Maintain UI consistency across all module components
```

---

## 🔐 SECURITY REQUIREMENTS CHECKLIST

### FRONTEND SECURITY COMPLIANCE
```typescript
interface ModuleUISecurityChecklist {
  inputValidation: {
    // ✅ All module configuration inputs must be validated
    xss_prevention: boolean;              // Required: Sanitize all text inputs
    template_validation: boolean;         // Required: Validate email templates
    form_data_sanitization: boolean;      // Required: Clean form field data
    file_upload_restrictions: boolean;    // Required: Restrict attachment types
  };
  
  dataProtection: {
    client_data_masking: boolean;         // Required: Mask PII in previews
    template_content_filtering: boolean;  // Required: Filter sensitive content
    module_config_validation: boolean;    // Required: Validate all configurations
  };
  
  userInterface: {
    csp_compliance: boolean;              // Required: Content Security Policy
    secure_defaults: boolean;             // Required: Safe default configurations
    error_handling: boolean;              // Required: No data leaks in errors
  };
}
```

---

## 🎯 TEAM A SPECIALIZATION: FRONTEND UI EXCELLENCE

### PRIMARY RESPONSIBILITIES
You are the **Frontend UI team** responsible for:

1. **Module Type Registry**
   - Visual palette showing all 7 module types
   - Category-based organization
   - Drag-and-drop interface
   - Search and filter functionality

2. **Module Configuration Forms**
   - Type-specific configuration interfaces
   - Dynamic form generation
   - Real-time validation
   - Preview functionality

3. **Journey Canvas Integration**
   - Seamless module placement
   - Visual connections between modules
   - Module editing and deletion
   - Canvas state management

4. **Mobile-First Design**
   - Responsive module palette
   - Touch-optimized interactions
   - Mobile configuration forms
   - Offline capability

---

## 📊 CORE DELIVERABLES

### 1. MODULE TYPE REGISTRY COMPONENT
```typescript
// FILE: /src/components/journeys/modules/ModuleTypeRegistry.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Palette, Zap, Calendar, MessageCircle, Star, Users } from 'lucide-react';

interface ModuleTypeDefinition {
  id: string;
  display_name: string;
  description: string;
  icon: string;
  category: string;
  config_schema: Record<string, ConfigField>;
  is_popular?: boolean;
}

interface ModuleTypeCategory {
  name: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  modules: ModuleTypeDefinition[];
}

interface ModuleTypeRegistryProps {
  onModuleSelect: (moduleType: ModuleTypeDefinition) => void;
  onModuleDragStart: (moduleType: ModuleTypeDefinition, event: React.DragEvent) => void;
  categories: ModuleTypeCategory[];
  searchTerm?: string;
  selectedCategory?: string;
}

export const ModuleTypeRegistry: React.FC<ModuleTypeRegistryProps> = ({
  onModuleSelect,
  onModuleDragStart,
  categories,
  searchTerm = '',
  selectedCategory = 'all'
}) => {
  const [filteredModules, setFilteredModules] = useState<ModuleTypeDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchTerm);
  const [activeCategory, setActiveCategory] = useState(selectedCategory);

  useEffect(() => {
    filterModules();
  }, [categories, searchQuery, activeCategory]);

  function filterModules() {
    let allModules = categories.flatMap(category => 
      category.modules.map(module => ({ ...module, categoryInfo: category }))
    );

    // Filter by category
    if (activeCategory !== 'all') {
      allModules = allModules.filter(module => module.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allModules = allModules.filter(module =>
        module.display_name.toLowerCase().includes(query) ||
        module.description.toLowerCase().includes(query)
      );
    }

    setFilteredModules(allModules);
  }

  function handleModuleDrag(module: ModuleTypeDefinition, event: React.DragEvent) {
    event.dataTransfer.setData('application/json', JSON.stringify(module));
    event.dataTransfer.effectAllowed = 'copy';
    onModuleDragStart(module, event);
  }

  function getIconComponent(iconName: string): React.ReactNode {
    const iconMap: Record<string, React.ReactNode> = {
      'mail': <MessageCircle className="w-5 h-5" />,
      'message-circle': <MessageCircle className="w-5 h-5" />,
      'clipboard': <Palette className="w-5 h-5" />,
      'calendar': <Calendar className="w-5 h-5" />,
      'info': <Zap className="w-5 h-5" />,
      'star': <Star className="w-5 h-5" />,
      'users': <Users className="w-5 h-5" />
    };
    return iconMap[iconName] || <Zap className="w-5 h-5" />;
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    communication: <MessageCircle className="w-4 h-4" />,
    data_collection: <Palette className="w-4 h-4" />,
    scheduling: <Calendar className="w-4 h-4" />,
    feedback: <Star className="w-4 h-4" />,
    growth: <Users className="w-4 h-4" />
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Journey Modules</h3>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-3 w-full mx-4 mt-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="communication" className="text-xs">Comm</TabsTrigger>
            <TabsTrigger value="scheduling" className="text-xs">Schedule</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="all" className="space-y-3 mt-0">
              {filteredModules.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Palette className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No modules found</p>
                </div>
              ) : (
                filteredModules.map((module) => (
                  <ModuleTypeCard
                    key={module.id}
                    module={module}
                    onSelect={onModuleSelect}
                    onDragStart={handleModuleDrag}
                    getIconComponent={getIconComponent}
                  />
                ))
              )}
            </TabsContent>

            {categories.map((category) => (
              <TabsContent key={category.name} value={category.name} className="space-y-3 mt-0">
                <div className="flex items-center gap-2 mb-4">
                  {categoryIcons[category.name]}
                  <h4 className="font-medium text-gray-900">{category.label}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {category.modules.length}
                  </Badge>
                </div>
                
                {category.modules.map((module) => (
                  <ModuleTypeCard
                    key={module.id}
                    module={module}
                    onSelect={onModuleSelect}
                    onDragStart={handleModuleDrag}
                    getIconComponent={getIconComponent}
                  />
                ))}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

interface ModuleTypeCardProps {
  module: ModuleTypeDefinition;
  onSelect: (module: ModuleTypeDefinition) => void;
  onDragStart: (module: ModuleTypeDefinition, event: React.DragEvent) => void;
  getIconComponent: (iconName: string) => React.ReactNode;
}

const ModuleTypeCard: React.FC<ModuleTypeCardProps> = ({
  module,
  onSelect,
  onDragStart,
  getIconComponent
}) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
      draggable
      onDragStart={(e) => onDragStart(module, e)}
      onClick={() => onSelect(module)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            {getIconComponent(module.icon)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="font-medium text-gray-900 text-sm truncate">
                {module.display_name}
              </h5>
              {module.is_popular && (
                <Badge variant="secondary" className="text-xs">Popular</Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
              {module.description}
            </p>
            <div className="flex items-center justify-between mt-2">
              <Badge 
                variant="outline" 
                className={`text-xs capitalize ${getCategoryColor(module.category)}`}
              >
                {module.category.replace('_', ' ')}
              </Badge>
              <Button variant="ghost" size="sm" className="text-xs px-2 py-1 h-6">
                Add
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    communication: 'border-blue-200 text-blue-700',
    data_collection: 'border-green-200 text-green-700',
    scheduling: 'border-orange-200 text-orange-700',
    feedback: 'border-purple-200 text-purple-700',
    growth: 'border-pink-200 text-pink-700'
  };
  return colors[category] || 'border-gray-200 text-gray-700';
}
```

### 2. EMAIL MODULE CONFIGURATION COMPONENT
```typescript
// FILE: /src/components/journeys/modules/EmailModule.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Clock, Eye, Settings, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preview_text: string;
  category: string;
  is_wedding_optimized: boolean;
}

interface EmailModuleConfig {
  template_id: string;
  send_delay?: number;
  personalization?: Record<string, string>;
  subject_override?: string;
  send_time?: string; // 'immediate' | 'business_hours' | 'custom'
  custom_send_time?: string;
}

interface EmailModuleProps {
  config: EmailModuleConfig;
  onChange: (config: EmailModuleConfig) => void;
  onValidate: (isValid: boolean) => void;
  onPreview?: () => void;
  isConfiguring: boolean;
}

export const EmailModule: React.FC<EmailModuleProps> = ({
  config,
  onChange,
  onValidate,
  onPreview,
  isConfiguring
}) => {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [previewData, setPreviewData] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEmailTemplates();
  }, []);

  useEffect(() => {
    validateConfiguration();
    if (config.template_id) {
      const template = emailTemplates.find(t => t.id === config.template_id);
      setSelectedTemplate(template || null);
    }
  }, [config, emailTemplates]);

  async function loadEmailTemplates() {
    try {
      const response = await fetch('/api/email/templates');
      if (!response.ok) throw new Error('Failed to load templates');
      
      const templates = await response.json();
      setEmailTemplates(templates);
    } catch (error) {
      toast({
        title: "Error loading templates",
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    }
  }

  function validateConfiguration() {
    const isValid = config.template_id && config.template_id.length > 0;
    onValidate(isValid);
  }

  function updateConfig(updates: Partial<EmailModuleConfig>) {
    const newConfig = { ...config, ...updates };
    onChange(newConfig);
  }

  async function generatePreview() {
    if (!config.template_id) return;

    setIsLoadingPreview(true);
    try {
      const response = await fetch('/api/journeys/preview-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_type: 'email',
          config,
          sample_data: {
            couple_name: 'John & Jane Smith',
            wedding_date: '2025-06-15',
            venue_name: 'Grand Wedding Venue',
            supplier_name: 'Sarah Photography'
          }
        })
      });

      if (!response.ok) throw new Error('Preview failed');

      const preview = await response.json();
      setPreviewData(preview.html_content);
      
      if (onPreview) onPreview();
    } catch (error) {
      toast({
        title: "Preview failed",
        description: "Please check your configuration and try again",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function addPersonalizationToken(token: string, value: string) {
    const personalization = config.personalization || {};
    personalization[token] = value;
    updateConfig({ personalization });
  }

  if (!isConfiguring) {
    // Compact display mode for journey canvas
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
        <Mail className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          {selectedTemplate?.name || 'Email Module'}
        </span>
        {config.send_delay && config.send_delay > 0 && (
          <Badge variant="secondary" className="text-xs">
            +{config.send_delay}m
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border border-gray-200 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Email Module</h3>
        </div>
        <p className="text-sm text-gray-600">Send automated emails with templates</p>
      </div>

      <div className="p-4">
        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="template-select">Email Template *</Label>
              <Select
                value={config.template_id || ''}
                onValueChange={(value) => updateConfig({ template_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose email template" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.is_wedding_optimized && (
                          <Badge variant="secondary" className="text-xs">Wedding</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-gray-600 mt-1">
                  {selectedTemplate.preview_text}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="subject-override">Subject Override</Label>
              <Input
                id="subject-override"
                placeholder="Leave blank to use template subject"
                value={config.subject_override || ''}
                onChange={(e) => updateConfig({ subject_override: e.target.value })}
              />
              {selectedTemplate && (
                <p className="text-xs text-gray-500 mt-1">
                  Default: {selectedTemplate.subject}
                </p>
              )}
            </div>

            <div>
              <Label>Personalization Tokens</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { label: 'Couple Name', token: 'couple_name', value: '{{client.couple_name}}' },
                  { label: 'Wedding Date', token: 'wedding_date', value: '{{client.wedding_date}}' },
                  { label: 'Venue Name', token: 'venue_name', value: '{{client.venue_name}}' },
                  { label: 'Supplier Name', token: 'supplier_name', value: '{{supplier.name}}' }
                ].map((tokenInfo) => (
                  <Button
                    key={tokenInfo.token}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => addPersonalizationToken(tokenInfo.token, tokenInfo.value)}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {tokenInfo.label}
                  </Button>
                ))}
              </div>
              {config.personalization && Object.keys(config.personalization).length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <strong>Active tokens:</strong> {Object.keys(config.personalization).join(', ')}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="timing" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="send-delay">Send Delay (minutes)</Label>
              <Input
                id="send-delay"
                type="number"
                min="0"
                placeholder="0 (immediate)"
                value={config.send_delay || ''}
                onChange={(e) => updateConfig({ 
                  send_delay: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
            </div>

            <div>
              <Label>Send Time Preference</Label>
              <Select
                value={config.send_time || 'immediate'}
                onValueChange={(value) => updateConfig({ send_time: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="When to send" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="business_hours">Business Hours Only</SelectItem>
                  <SelectItem value="custom">Custom Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.send_time === 'custom' && (
              <div>
                <Label htmlFor="custom-time">Custom Send Time</Label>
                <Input
                  id="custom-time"
                  type="time"
                  value={config.custom_send_time || ''}
                  onChange={(e) => updateConfig({ custom_send_time: e.target.value })}
                />
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded text-xs text-blue-800">
              <Clock className="w-4 h-4 inline mr-1" />
              <strong>Wedding Tip:</strong> Schedule final details emails for weekday mornings, 
              when couples are most likely to read and respond.
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <Label>Email Preview</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generatePreview}
                disabled={!config.template_id || isLoadingPreview}
                className="flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                {isLoadingPreview ? 'Generating...' : 'Generate Preview'}
              </Button>
            </div>
            
            {previewData ? (
              <div className="border rounded p-3 bg-gray-50 max-h-64 overflow-y-auto">
                <div className="text-xs text-gray-600 mb-2 border-b pb-2">
                  <strong>Subject:</strong> {selectedTemplate?.subject || 'No subject'}
                </div>
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: previewData }}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center text-gray-500">
                <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Select a template and click "Generate Preview" to see email content</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between gap-2 mt-6 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button 
            type="button" 
            className="flex-1"
            disabled={!config.template_id}
          >
            Save Module
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### 3. FORM MODULE CONFIGURATION COMPONENT
```typescript
// FILE: /src/components/journeys/modules/FormModule.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clipboard, Clock, Bell, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FormOption {
  id: string;
  name: string;
  description: string;
  field_count: number;
  is_wedding_optimized: boolean;
  category: string;
}

interface FormModuleConfig {
  form_id: string;
  reminder_enabled?: boolean;
  reminder_frequency?: number; // days
  deadline?: string;
  completion_redirect?: string;
  auto_follow_up?: boolean;
}

interface FormModuleProps {
  config: FormModuleConfig;
  onChange: (config: FormModuleConfig) => void;
  onValidate: (isValid: boolean) => void;
  isConfiguring: boolean;
}

export const FormModule: React.FC<FormModuleProps> = ({
  config,
  onChange,
  onValidate,
  isConfiguring
}) => {
  const [availableForms, setAvailableForms] = useState<FormOption[]>([]);
  const [selectedForm, setSelectedForm] = useState<FormOption | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableForms();
  }, []);

  useEffect(() => {
    validateConfiguration();
    if (config.form_id) {
      const form = availableForms.find(f => f.id === config.form_id);
      setSelectedForm(form || null);
    }
  }, [config, availableForms]);

  async function loadAvailableForms() {
    try {
      const response = await fetch('/api/forms');
      if (!response.ok) throw new Error('Failed to load forms');
      
      const forms = await response.json();
      setAvailableForms(forms);
    } catch (error) {
      toast({
        title: "Error loading forms",
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    }
  }

  function validateConfiguration() {
    const isValid = config.form_id && config.form_id.length > 0;
    onValidate(isValid);
  }

  function updateConfig(updates: Partial<FormModuleConfig>) {
    const newConfig = { ...config, ...updates };
    onChange(newConfig);
  }

  if (!isConfiguring) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
        <Clipboard className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-900">
          {selectedForm?.name || 'Form Module'}
        </span>
        {config.reminder_enabled && (
          <Badge variant="secondary" className="text-xs">
            <Bell className="w-3 h-3 mr-1" />
            Reminders
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border border-gray-200 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
            <Clipboard className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Form Module</h3>
        </div>
        <p className="text-sm text-gray-600">Send forms and collect responses</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label htmlFor="form-select">Select Form *</Label>
          <Select
            value={config.form_id || ''}
            onValueChange={(value) => updateConfig({ form_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a form" />
            </SelectTrigger>
            <SelectContent>
              {availableForms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{form.name}</span>
                        {form.is_wedding_optimized && (
                          <Badge variant="secondary" className="text-xs">Wedding</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{form.field_count} fields</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedForm && (
            <p className="text-xs text-gray-600 mt-1">
              {selectedForm.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="reminder-enabled">Send Reminders</Label>
            <p className="text-xs text-gray-600">Automatically remind clients to complete form</p>
          </div>
          <Switch
            id="reminder-enabled"
            checked={config.reminder_enabled || false}
            onCheckedChange={(checked) => updateConfig({ reminder_enabled: checked })}
          />
        </div>

        {config.reminder_enabled && (
          <div>
            <Label htmlFor="reminder-frequency">Reminder Frequency</Label>
            <Select
              value={config.reminder_frequency?.toString() || '3'}
              onValueChange={(value) => updateConfig({ reminder_frequency: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="How often to remind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Daily</SelectItem>
                <SelectItem value="3">Every 3 days</SelectItem>
                <SelectItem value="7">Weekly</SelectItem>
                <SelectItem value="14">Bi-weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="deadline">Completion Deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={config.deadline || ''}
            onChange={(e) => updateConfig({ deadline: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="completion-redirect">After Completion URL</Label>
          <Input
            id="completion-redirect"
            placeholder="https://yoursite.com/thank-you"
            value={config.completion_redirect || ''}
            onChange={(e) => updateConfig({ completion_redirect: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-follow-up">Auto Follow-up</Label>
            <p className="text-xs text-gray-600">Send thank you email after completion</p>
          </div>
          <Switch
            id="auto-follow-up"
            checked={config.auto_follow_up || false}
            onCheckedChange={(checked) => updateConfig({ auto_follow_up: checked })}
          />
        </div>

        {selectedForm && (
          <div className="p-3 bg-green-50 rounded text-xs text-green-800">
            <CheckCircle className="w-4 h-4 inline mr-1" />
            <strong>Wedding Tip:</strong> Forms sent 6-8 weeks before the wedding 
            have the highest completion rates.
          </div>
        )}

        <div className="flex justify-between gap-2 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button 
            type="button" 
            className="flex-1"
            disabled={!config.form_id}
          >
            Save Module
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📊 WEDDING INDUSTRY UI CONSIDERATIONS

### WEDDING VENDOR SPECIFIC UI PATTERNS
```typescript
// Wedding-optimized module configurations
export const weddingModulePatterns = {
  photographyWorkflow: {
    modules: ['email', 'form', 'meeting', 'review'],
    commonSequence: ['welcome_email', 'questionnaire_form', 'engagement_scheduling', 'final_review'],
    popularTemplates: ['booking_confirmation', 'engagement_reminder', 'wedding_day_timeline', 'gallery_delivery']
  },
  
  venueCoordination: {
    modules: ['email', 'form', 'meeting', 'info'],
    commonSequence: ['booking_confirmation', 'venue_tour', 'catering_form', 'final_walkthrough'],
    criticalDeadlines: ['final_headcount', 'menu_selection', 'timeline_approval']
  },
  
  weddingPlanning: {
    modules: ['email', 'sms', 'form', 'meeting', 'referral'],
    commonSequence: ['welcome_package', 'vendor_recommendations', 'timeline_creation', 'day_of_coordination'],
    automatedTouchpoints: ['60_days_out', '30_days_out', '7_days_out', 'day_after']
  }
};
```

---

## 🧪 UI TESTING REQUIREMENTS

### COMPONENT TESTING FRAMEWORK
```typescript
// FILE: /src/__tests__/journeys/modules/module-ui.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ModuleTypeRegistry } from '@/components/journeys/modules/ModuleTypeRegistry';
import { EmailModule } from '@/components/journeys/modules/EmailModule';
import { mockModuleCategories, mockEmailConfig } from '@/test-utils/module-mocks';

describe('Module UI Components', () => {
  describe('ModuleTypeRegistry', () => {
    it('should display all module categories', () => {
      const onModuleSelect = vi.fn();
      const onModuleDragStart = vi.fn();
      
      render(
        <ModuleTypeRegistry
          onModuleSelect={onModuleSelect}
          onModuleDragStart={onModuleDragStart}
          categories={mockModuleCategories}
        />
      );
      
      expect(screen.getByText('Journey Modules')).toBeInTheDocument();
      expect(screen.getByText('Email Module')).toBeInTheDocument();
      expect(screen.getByText('Form Module')).toBeInTheDocument();
    });
    
    it('should filter modules by search query', async () => {
      const user = userEvent.setup();
      const onModuleSelect = vi.fn();
      const onModuleDragStart = vi.fn();
      
      render(
        <ModuleTypeRegistry
          onModuleSelect={onModuleSelect}
          onModuleDragStart={onModuleDragStart}
          categories={mockModuleCategories}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search modules...');
      await user.type(searchInput, 'email');
      
      await waitFor(() => {
        expect(screen.getByText('Email Module')).toBeInTheDocument();
        expect(screen.queryByText('Form Module')).not.toBeInTheDocument();
      });
    });
  });
  
  describe('EmailModule', () => {
    it('should validate email template selection', () => {
      const onChange = vi.fn();
      const onValidate = vi.fn();
      
      render(
        <EmailModule
          config={{} as any}
          onChange={onChange}
          onValidate={onValidate}
          isConfiguring={true}
        />
      );
      
      expect(onValidate).toHaveBeenCalledWith(false);
    });
    
    it('should update configuration when template selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onValidate = vi.fn();
      
      render(
        <EmailModule
          config={mockEmailConfig}
          onChange={onChange}
          onValidate={onValidate}
          isConfiguring={true}
        />
      );
      
      const templateSelect = screen.getByText('Choose email template');
      await user.click(templateSelect);
      
      const welcomeTemplate = screen.getByText('Welcome Email');
      await user.click(welcomeTemplate);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          template_id: 'welcome-email'
        })
      );
    });
  });
});
```

---

## ✅ DEFINITION OF DONE

### UI ACCEPTANCE CRITERIA
- [ ] **Module Type Registry**: Visual palette with all 7 module types displayed and searchable
- [ ] **Drag-and-Drop Interface**: Modules can be dragged from palette to journey canvas
- [ ] **Configuration Forms**: Type-specific forms for each module with validation
- [ ] **Preview Functionality**: Email and other modules show accurate previews
- [ ] **Mobile Responsive**: All interfaces work on tablet and mobile devices
- [ ] **Wedding Optimization**: UI patterns optimized for wedding vendor workflows
- [ ] **Accessibility**: WCAG 2.1 AA compliance for all module interfaces
- [ ] **Performance**: Module configuration forms load in under 1 second

### QUALITY GATES
- [ ] **Visual Design**: Matches WedSync design system perfectly
- [ ] **User Experience**: Wedding vendors can configure modules without training
- [ ] **Error Handling**: Clear validation messages and error states
- [ ] **Browser Support**: Works in Chrome, Safari, Firefox, Edge
- [ ] **Touch Interface**: Optimized for touch interactions on mobile
- [ ] **Loading States**: Proper loading indicators for all async operations

---

## 🚀 EXECUTION TIMELINE

### UI DEVELOPMENT SPRINT
**Week 1**: Module Type Registry and basic drag-drop interface
**Week 2**: Email and Form module configuration components
**Week 3**: Remaining module types (SMS, Meeting, Info, Review, Referral)
**Week 4**: Mobile optimization and accessibility testing

---

## 📞 TEAM COORDINATION

**Daily Design Reviews**: Share UI progress and get feedback
**User Testing**: Test interfaces with actual wedding vendor users
**Integration Testing**: Coordinate with backend teams for API integration
**Documentation**: Create UI component documentation and style guides

---

**Frontend Excellence: Beautiful, intuitive interfaces for wedding automation! 🎨💍**