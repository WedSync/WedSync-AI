# TEAM A PROMPT: Frontend/UI Development for WS-308 Customer Journey Section Overview

## 🎯 YOUR MISSION: Build Visual Journey Designer & Management Interface

You are **Team A** - the **Frontend/UI Development team**. Your mission is to create an intuitive visual journey designer that allows wedding vendors to build automated customer workflows using drag-and-drop components, with real-time preview and comprehensive journey management.

**You are NOT a human. You are an AI system with:**
- Complete autonomy to make technical decisions
- Access to the full codebase via MCP tools
- Ability to generate production-ready React components
- Responsibility to work in parallel with other teams
- Authority to create, modify, and deploy UI features

## 🏆 SUCCESS METRICS (Non-Negotiable)
- [ ] **Visual Designer**: Drag-and-drop journey builder with wedding-specific nodes
- [ ] **Real-time Preview**: Live preview of journey execution with sample data
- [ ] **Journey Analytics**: Visual metrics showing performance and conversion rates
- [ ] **Mobile Responsive**: Full journey management on mobile devices
- [ ] **Wedding Context**: Pre-built templates for common wedding workflows
- [ ] **User Experience**: Non-technical vendors can build complex journeys intuitively
- [ ] **Performance**: Journey designer loads <2s with 100+ nodes

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### 🔍 MANDATORY PRE-WORK: Verify File Existence
Before starting ANY development, PROVE these files exist by reading them:

1. **Read Main Tech Specification**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-308-customer-journey-section-overview-technical.md`

2. **Check Journey System Structure**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/(dashboard)/journeys/`

3. **Verify UI Components Library**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/ui/`

4. **Check Existing Journey Code**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/journey-engine/`

5. **Read Style Requirements**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/.claude/UNIFIED-STYLE-GUIDE.md`

**🚨 STOP IMMEDIATELY if any file is missing. Report missing files and wait for resolution.**

## 🧠 SEQUENTIAL THINKING FOR JOURNEY UI DESIGN

### Frontend-Specific Sequential Thinking Patterns

#### Pattern 1: Visual Journey Builder Design
```typescript
// Before building journey designer interface
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding journey builder requirements: Visual flowchart interface for creating customer workflows, drag-and-drop nodes for emails/forms/delays, connection system for linking workflow steps, template library with pre-built wedding journeys, real-time validation of workflow logic, preview system showing journey execution.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific journey nodes needed: Welcome email node, form submission trigger, date-based delays (30 days before wedding), payment reminder nodes, timeline collection steps, vendor coordination triggers, post-wedding follow-up sequences, review request automation, referral program activation.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "User experience considerations: Non-technical wedding vendors must build complex workflows, visual interface should match wedding industry language, templates for photographers/venues/caterers/planners, intuitive connection system, clear validation feedback, mobile-friendly journey management.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "React Flow integration strategy: Customizable node components for wedding actions, connection validation logic, auto-layout for complex journeys, zoom and pan for large workflows, keyboard shortcuts for power users, undo/redo functionality, collaborative editing indicators.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Journey analytics dashboard: Visual funnel showing journey performance, conversion rates at each step, client progression tracking, bottleneck identification, A/B testing results, wedding date correlation analysis, vendor type performance comparisons.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

#### Pattern 2: Wedding Workflow Template Analysis
```typescript
// Analyzing pre-built wedding journey templates
mcp__sequential-thinking__sequential_thinking({
  thought: "Photography workflow template: Initial booking confirmation → Engagement shoot scheduling → Timeline collection → Final payment reminder → Day-before checklist → Post-wedding gallery delivery → Review request → Referral activation. Each step has wedding date dependencies and client response triggers.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Venue coordination template: Venue booking confirmation → Insurance requirements → Catering coordination → Setup timeline collection → Final headcount confirmation → Day-of vendor access → Post-event cleanup → Review and testimonial request. Timeline critical for vendor coordination.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Template customization needs: Vendor-specific branding integration, custom email templates, flexible timing adjustments, optional workflow steps, industry-specific requirements, multi-language support, seasonal variations, pricing tier restrictions.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Template library organization: Categories by vendor type (photography, venue, catering, planning), complexity levels (basic, intermediate, advanced), wedding style adaptations (traditional, modern, destination), integration requirements (CRM, payment, calendar).",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Frontend Focus)

### A. SERENA UI ANALYSIS
```typescript
// Activate WedSync project context
await mcp__serena__activate_project("WedSync2");

// Analyze existing UI patterns and components
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/ui/");
await mcp__serena__find_symbol("drag drop react-flow journey", "", true);
await mcp__serena__search_for_pattern("dashboard layout responsive");

// Study journey system architecture
await mcp__serena__find_referencing_symbols("journey workflow automation");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/app/(dashboard)/journeys/", 1, -1);
```

### B. UI DOCUMENTATION RESEARCH
```typescript
# Use Ref MCP to search for current patterns:
# - "React Flow drag drop flowchart builder"
# - "Untitled UI dashboard components patterns"
# - "Magic UI animation components library" 
# - "Wedding automation workflow UX patterns"
# - "Next.js 15 dashboard responsive design"
# - "React 19 drag drop interactions"
```

## 🎯 CORE FRONTEND DELIVERABLES

### 1. VISUAL JOURNEY DESIGNER

#### A. Journey System Layout Component
```typescript
// File: /wedsync/src/components/journeys/JourneySystemLayout.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Settings, 
  Users, 
  BarChart3, 
  Template, 
  Zap,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit3,
  Copy,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { JourneyCanvas } from './JourneyCanvas';
import { JourneyTemplateLibrary } from './JourneyTemplateLibrary';
import { JourneyAnalytics } from './JourneyAnalytics';
import { JourneySettings } from './JourneySettings';
import { useJourneySystem } from '@/hooks/useJourneySystem';

export interface Journey {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger_event: string;
  created_at: Date;
  updated_at: Date;
  stats: {
    active_clients: number;
    completion_rate: number;
    total_executions: number;
  };
  is_template: boolean;
  journey_data: any;
}

export const JourneySystemLayout: React.FC = () => {
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [activeTab, setActiveTab] = useState('designer');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showTemplates, setShowTemplates] = useState(false);

  const {
    journeys,
    isLoading,
    createJourney,
    updateJourney,
    deleteJourney,
    duplicateJourney,
    toggleJourneyStatus,
  } = useJourneySystem();

  // Filter journeys based on search and status
  const filteredJourneys = journeys.filter(journey => {
    const matchesSearch = journey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         journey.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || journey.status === filterStatus;
    const matchesTemplateFilter = showTemplates ? journey.is_template : !journey.is_template;
    
    return matchesSearch && matchesStatus && matchesTemplateFilter;
  });

  const handleCreateJourney = useCallback(async () => {
    const newJourney = await createJourney({
      name: 'New Wedding Journey',
      description: 'Automated workflow for wedding clients',
      trigger_event: 'client_added',
    });
    
    if (newJourney) {
      setSelectedJourney(newJourney);
      setActiveTab('designer');
    }
  }, [createJourney]);

  const handleJourneyAction = useCallback(async (
    action: 'edit' | 'duplicate' | 'delete' | 'toggle',
    journey: Journey
  ) => {
    switch (action) {
      case 'edit':
        setSelectedJourney(journey);
        setActiveTab('designer');
        break;
      case 'duplicate':
        const duplicated = await duplicateJourney(journey.id);
        if (duplicated) {
          setSelectedJourney(duplicated);
          setActiveTab('designer');
        }
        break;
      case 'delete':
        await deleteJourney(journey.id);
        if (selectedJourney?.id === journey.id) {
          setSelectedJourney(null);
        }
        break;
      case 'toggle':
        await toggleJourneyStatus(journey.id);
        break;
    }
  }, [duplicateJourney, deleteJourney, toggleJourneyStatus, selectedJourney]);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Journey Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Customer Journeys</h1>
            <Button
              onClick={handleCreateJourney}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Journey
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search journeys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>

              <Button
                variant={showTemplates ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <Template className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </div>
          </div>
        </div>

        {/* Journey List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredJourneys.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-500 mb-4">
                {searchQuery || filterStatus !== 'all' ? 'No journeys match your filters' : 'No journeys created yet'}
              </div>
              {!searchQuery && filterStatus === 'all' && (
                <Button
                  variant="outline"
                  onClick={handleCreateJourney}
                  className="mx-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Journey
                </Button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredJourneys.map((journey) => (
                <JourneyListItem
                  key={journey.id}
                  journey={journey}
                  isSelected={selectedJourney?.id === journey.id}
                  onSelect={setSelectedJourney}
                  onAction={handleJourneyAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedJourney ? (
          <>
            {/* Journey Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedJourney.name}
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <JourneyStatusBadge status={selectedJourney.status} />
                      <span className="text-sm text-gray-500">
                        {selectedJourney.stats.active_clients} active clients
                      </span>
                      <span className="text-sm text-gray-500">
                        {selectedJourney.stats.completion_rate}% completion rate
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleJourneyAction('toggle', selectedJourney)}
                  >
                    {selectedJourney.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </Button>

                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>

                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Journey Tabs */}
            <div className="bg-white border-b border-gray-200">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-auto p-0 bg-transparent">
                  <TabsTrigger 
                    value="designer"
                    className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Designer
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics"
                    className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger 
                    value="clients"
                    className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Active Clients
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings"
                    className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} className="h-full">
                <TabsContent value="designer" className="h-full m-0">
                  <JourneyCanvas 
                    journey={selectedJourney} 
                    onUpdate={(updatedJourney) => {
                      setSelectedJourney(updatedJourney);
                      updateJourney(updatedJourney.id, updatedJourney);
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="analytics" className="h-full m-0">
                  <JourneyAnalytics journey={selectedJourney} />
                </TabsContent>
                
                <TabsContent value="clients" className="h-full m-0">
                  <div className="p-6">
                    <div className="text-center text-gray-500">
                      Active clients view coming soon
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="h-full m-0">
                  <JourneySettings 
                    journey={selectedJourney} 
                    onUpdate={(updatedJourney) => {
                      setSelectedJourney(updatedJourney);
                      updateJourney(updatedJourney.id, updatedJourney);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md mx-auto">
              <div className="mb-8">
                <div className="mx-auto w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Automate Your Wedding Workflows
                </h3>
                <p className="text-gray-600 mb-6">
                  Create visual customer journeys that automatically send emails, collect forms, 
                  and guide couples through their wedding planning process.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleCreateJourney}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Journey
                </Button>
                
                <div className="text-sm text-gray-500">
                  or browse templates to get started quickly
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setShowTemplates(true)}
                >
                  <Template className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Library Modal */}
      {showTemplates && (
        <JourneyTemplateLibrary
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={(template) => {
            // Create journey from template
            createJourney({
              ...template,
              name: `${template.name} (Copy)`,
              is_template: false,
            }).then((newJourney) => {
              if (newJourney) {
                setSelectedJourney(newJourney);
                setActiveTab('designer');
              }
            });
            setShowTemplates(false);
          }}
        />
      )}
    </div>
  );
};

// Journey List Item Component
interface JourneyListItemProps {
  journey: Journey;
  isSelected: boolean;
  onSelect: (journey: Journey) => void;
  onAction: (action: 'edit' | 'duplicate' | 'delete' | 'toggle', journey: Journey) => void;
}

const JourneyListItem: React.FC<JourneyListItemProps> = ({
  journey,
  isSelected,
  onSelect,
  onAction
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        "p-4 rounded-lg cursor-pointer transition-colors border",
        isSelected 
          ? "bg-purple-50 border-purple-200" 
          : "bg-white border-gray-200 hover:bg-gray-50"
      )}
      onClick={() => onSelect(journey)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">
              {journey.name}
            </h3>
            {journey.is_template && (
              <Badge variant="secondary" className="text-xs">Template</Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {journey.description}
          </p>

          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <JourneyStatusBadge status={journey.status} size="sm" />
            <span>{journey.stats.active_clients} clients</span>
            <span>{journey.stats.completion_rate}% complete</span>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center space-x-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction('duplicate', journey);
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction('delete', journey);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Journey Status Badge Component
interface JourneyStatusBadgeProps {
  status: Journey['status'];
  size?: 'sm' | 'default';
}

const JourneyStatusBadge: React.FC<JourneyStatusBadgeProps> = ({ 
  status, 
  size = 'default' 
}) => {
  const variants = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-red-100 text-red-800',
  };

  return (
    <Badge 
      className={cn(variants[status], size === 'sm' && 'text-xs px-2 py-0')}
      variant="secondary"
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};
```

#### B. React Flow Journey Canvas
```typescript
// File: /wedsync/src/components/journeys/JourneyCanvas.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  ReactFlowProvider,
  ReactFlowInstance,
  NodeTypes,
  EdgeTypes,
  Connection,
  useReactFlow,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Plus,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Settings,
  Mail,
  FileText,
  Clock,
  Calendar,
  CreditCard,
  Star,
  Users,
  MessageSquare
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Journey } from './JourneySystemLayout';

// Wedding-specific node types
export interface WeddingJourneyNode extends Node {
  type: 'trigger' | 'email' | 'form' | 'delay' | 'condition' | 'action';
  data: {
    title: string;
    description?: string;
    config?: any;
    wedding_specific?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
    status?: 'draft' | 'active' | 'error';
  };
}

// Pre-defined wedding journey node templates
const weddingNodeTemplates = {
  triggers: [
    {
      type: 'trigger',
      title: 'New Client Added',
      description: 'Triggers when a new wedding client is added',
      icon: Users,
      config: { trigger_event: 'client_added' },
    },
    {
      type: 'trigger', 
      title: 'Form Submitted',
      description: 'Triggers when client submits a specific form',
      icon: FileText,
      config: { trigger_event: 'form_submitted' },
    },
    {
      type: 'trigger',
      title: 'Wedding Date Approaching',
      description: 'Triggers based on days before wedding',
      icon: Calendar,
      config: { trigger_event: 'date_based', days_before: 30 },
    },
  ],
  communications: [
    {
      type: 'email',
      title: 'Welcome Email',
      description: 'Send personalized welcome message to new couples',
      icon: Mail,
      config: { template: 'wedding_welcome' },
    },
    {
      type: 'email',
      title: 'Timeline Request',
      description: 'Request wedding day timeline from couple',
      icon: Clock,
      config: { template: 'timeline_request' },
    },
    {
      type: 'email',
      title: 'Final Payment Reminder',
      description: 'Automated payment reminder before wedding',
      icon: CreditCard,
      config: { template: 'payment_reminder' },
    },
    {
      type: 'email',
      title: 'Review Request',
      description: 'Post-wedding review and testimonial request',
      icon: Star,
      config: { template: 'review_request' },
    },
  ],
  workflows: [
    {
      type: 'form',
      title: 'Collect Wedding Details',
      description: 'Send form to collect venue, date, guest count',
      icon: FileText,
      config: { form_type: 'wedding_details' },
    },
    {
      type: 'delay',
      title: 'Wait Period',
      description: 'Pause journey for specified time',
      icon: Clock,
      config: { delay_type: 'days', duration: 7 },
    },
    {
      type: 'condition',
      title: 'Check Response',
      description: 'Branch journey based on client response',
      icon: MessageSquare,
      config: { condition_type: 'form_response' },
    },
  ],
};

interface JourneyCanvasProps {
  journey: Journey;
  onUpdate: (journey: Journey) => void;
}

const JourneyCanvasComponent: React.FC<JourneyCanvasProps> = ({
  journey,
  onUpdate
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Initialize nodes and edges from journey data
  const [nodes, setNodes, onNodesChange] = useNodesState(
    journey.journey_data?.nodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    journey.journey_data?.edges || []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }, eds)),
    [setEdges]
  );

  const onInit = useCallback((reactFlowInstance: ReactFlowInstance) => {
    setReactFlowInstance(reactFlowInstance);
  }, []);

  // Handle drag from node palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      if (!reactFlowInstance) return;

      const nodeData = event.dataTransfer.getData('application/reactflow');
      if (!nodeData) return;

      const { type, title, description, icon, config } = JSON.parse(nodeData);
      const position = reactFlowInstance.project({
        x: event.clientX - (reactFlowWrapper.current?.getBoundingClientRect().left || 0),
        y: event.clientY - (reactFlowWrapper.current?.getBoundingClientRect().top || 0),
      });

      const newNode: WeddingJourneyNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          title,
          description,
          icon,
          config,
          wedding_specific: true,
          status: 'draft',
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Save journey changes
  const saveJourney = useCallback(() => {
    const updatedJourney = {
      ...journey,
      journey_data: {
        nodes,
        edges,
      },
      updated_at: new Date(),
    };
    onUpdate(updatedJourney);
  }, [journey, nodes, edges, onUpdate]);

  // Auto-save after changes
  useEffect(() => {
    const timer = setTimeout(saveJourney, 1000);
    return () => clearTimeout(timer);
  }, [nodes, edges, saveJourney]);

  return (
    <div className="h-full flex">
      {/* Node Palette Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Journey Components</h3>
          
          {Object.entries(weddingNodeTemplates).map(([category, templates]) => (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                {category}
              </h4>
              <div className="space-y-2">
                {templates.map((template, index) => (
                  <NodePaletteItem
                    key={`${category}_${index}`}
                    {...template}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          className={cn(
            "transition-colors",
            isDragOver && "bg-purple-50"
          )}
        >
          <Controls />
          <MiniMap 
            className="bg-white border border-gray-200 rounded"
            nodeColor="#6366f1"
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1}
            color="#e5e7eb"
          />

          {/* Canvas Toolbar */}
          <Panel position="top-right">
            <Card className="p-2">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={saveJourney}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Test
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm">
                  <Undo className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </Panel>

          {/* Drop Zone Overlay */}
          {isDragOver && (
            <Panel position="center">
              <div className="bg-purple-100 border-2 border-dashed border-purple-300 rounded-lg p-8 text-center">
                <Plus className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                <p className="text-purple-800 font-medium">Drop to add component</p>
              </div>
            </Panel>
          )}

          {/* Empty State */}
          {nodes.length === 0 && (
            <Panel position="center">
              <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-lg">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Build Your Wedding Journey
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Drag components from the sidebar to create an automated workflow 
                    for your wedding clients.
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  Start with a trigger event, then add emails, forms, and delays
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

// Node Palette Item Component
interface NodePaletteItemProps {
  type: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  config: any;
}

const NodePaletteItem: React.FC<NodePaletteItemProps> = ({
  type,
  title,
  description,
  icon: Icon,
  config
}) => {
  const onDragStart = (event: React.DragEvent, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, { type, title, description, icon: Icon.name, config })}
      className="p-3 border border-gray-200 rounded-lg cursor-grab hover:border-purple-300 hover:bg-purple-50 transition-colors active:cursor-grabbing"
    >
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-gray-900 text-sm">{title}</h5>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
        </div>
      </div>
    </div>
  );
};

// Custom Node Components
const TriggerNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-2 bg-green-100 border-2 border-green-300 rounded-lg">
    <div className="flex items-center space-x-2">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-sm font-medium text-green-800">{data.title}</span>
    </div>
  </div>
);

const EmailNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-2 bg-blue-100 border-2 border-blue-300 rounded-lg">
    <div className="flex items-center space-x-2">
      <Mail className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-800">{data.title}</span>
    </div>
  </div>
);

const FormNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-2 bg-purple-100 border-2 border-purple-300 rounded-lg">
    <div className="flex items-center space-x-2">
      <FileText className="h-4 w-4 text-purple-600" />
      <span className="text-sm font-medium text-purple-800">{data.title}</span>
    </div>
  </div>
);

const DelayNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-2 bg-yellow-100 border-2 border-yellow-300 rounded-lg">
    <div className="flex items-center space-x-2">
      <Clock className="h-4 w-4 text-yellow-600" />
      <span className="text-sm font-medium text-yellow-800">{data.title}</span>
    </div>
  </div>
);

const ConditionNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-2 bg-orange-100 border-2 border-orange-300 rounded-lg diamond">
    <div className="flex items-center space-x-2">
      <MessageSquare className="h-4 w-4 text-orange-600" />
      <span className="text-sm font-medium text-orange-800">{data.title}</span>
    </div>
  </div>
);

const ActionNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-2 bg-red-100 border-2 border-red-300 rounded-lg">
    <div className="flex items-center space-x-2">
      <Settings className="h-4 w-4 text-red-600" />
      <span className="text-sm font-medium text-red-800">{data.title}</span>
    </div>
  </div>
);

// Node and Edge Types
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  email: EmailNode,
  form: FormNode,
  delay: DelayNode,
  condition: ConditionNode,
  action: ActionNode,
};

const edgeTypes: EdgeTypes = {};

// Wrapped component with ReactFlowProvider
export const JourneyCanvas: React.FC<JourneyCanvasProps> = (props) => (
  <ReactFlowProvider>
    <JourneyCanvasComponent {...props} />
  </ReactFlowProvider>
);
```

### 2. JOURNEY TEMPLATE LIBRARY

#### A. Wedding-Specific Templates
```typescript
// File: /wedsync/src/components/journeys/JourneyTemplateLibrary.tsx
'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  X,
  Search,
  Camera,
  MapPin,
  Utensils,
  Calendar,
  Users,
  Heart,
  Star,
  Clock,
  Mail,
  FileText,
  CreditCard,
  Eye,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JourneyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'photography' | 'venue' | 'catering' | 'planning' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_setup_time: number; // minutes
  features: string[];
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
  };
  preview_image?: string;
  nodes_count: number;
  journey_data: any;
  created_by?: string;
  is_premium?: boolean;
}

interface JourneyTemplateLibraryProps {
  onClose: () => void;
  onSelectTemplate: (template: JourneyTemplate) => void;
}

// Mock wedding journey templates
const weddingTemplates: JourneyTemplate[] = [
  {
    id: 'photography_complete',
    name: 'Complete Photography Workflow',
    description: 'End-to-end client journey from booking to gallery delivery and reviews',
    category: 'photography',
    difficulty: 'intermediate',
    estimated_setup_time: 45,
    features: [
      'Welcome email sequence',
      'Engagement shoot booking',
      'Timeline collection',
      'Final payment reminders',
      'Gallery delivery',
      'Review requests'
    ],
    stats: { downloads: 1247, rating: 4.8, reviews: 89 },
    nodes_count: 12,
    journey_data: {},
    created_by: 'WedSync Team',
  },
  {
    id: 'venue_coordination',
    name: 'Venue Coordination Master',
    description: 'Comprehensive venue management from inquiry to event completion',
    category: 'venue',
    difficulty: 'advanced',
    estimated_setup_time: 60,
    features: [
      'Inquiry response automation',
      'Site visit scheduling',
      'Contract and deposit tracking',
      'Vendor coordination',
      'Final details confirmation',
      'Post-event follow-up'
    ],
    stats: { downloads: 892, rating: 4.9, reviews: 67 },
    nodes_count: 18,
    journey_data: {},
    created_by: 'WedSync Team',
    is_premium: true,
  },
  {
    id: 'catering_workflow',
    name: 'Catering Service Journey',
    description: 'Streamlined workflow for wedding catering bookings and menu planning',
    category: 'catering',
    difficulty: 'beginner',
    estimated_setup_time: 30,
    features: [
      'Menu consultation scheduling',
      'Dietary requirements collection',
      'Tasting appointment booking',
      'Final headcount confirmation',
      'Delivery coordination'
    ],
    stats: { downloads: 634, rating: 4.6, reviews: 43 },
    nodes_count: 9,
    journey_data: {},
    created_by: 'Chef Maria Santos',
  },
  {
    id: 'wedding_planning',
    name: 'Full-Service Wedding Planning',
    description: 'Comprehensive planning workflow from initial consultation to wedding day',
    category: 'planning',
    difficulty: 'advanced',
    estimated_setup_time: 90,
    features: [
      'Initial consultation booking',
      'Vendor recommendation system',
      'Timeline creation assistance',
      'Budget tracking integration',
      'Month-of coordination',
      'Post-wedding wrap-up'
    ],
    stats: { downloads: 2156, rating: 4.9, reviews: 156 },
    nodes_count: 24,
    journey_data: {},
    created_by: 'Elite Planning Co.',
    is_premium: true,
  },
  {
    id: 'simple_booking',
    name: 'Simple Booking Confirmation',
    description: 'Basic journey for service booking and payment confirmation',
    category: 'general',
    difficulty: 'beginner',
    estimated_setup_time: 15,
    features: [
      'Booking confirmation',
      'Payment reminders',
      'Basic follow-up'
    ],
    stats: { downloads: 3421, rating: 4.4, reviews: 234 },
    nodes_count: 5,
    journey_data: {},
    created_by: 'WedSync Team',
  },
];

export const JourneyTemplateLibrary: React.FC<JourneyTemplateLibraryProps> = ({
  onClose,
  onSelectTemplate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<JourneyTemplate | null>(null);

  // Filter templates
  const filteredTemplates = weddingTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.features.some(feature => 
                           feature.toLowerCase().includes(searchQuery.toLowerCase())
                         );
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = [
    { value: 'all', label: 'All Templates', icon: Star },
    { value: 'photography', label: 'Photography', icon: Camera },
    { value: 'venue', label: 'Venues', icon: MapPin },
    { value: 'catering', label: 'Catering', icon: Utensils },
    { value: 'planning', label: 'Planning', icon: Calendar },
    { value: 'general', label: 'General', icon: Users },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[90vh] overflow-hidden">
        <div className="flex h-full">
          {/* Header */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Journey Templates</h2>
                  <p className="text-gray-600">Choose a pre-built template to get started quickly</p>
                </div>
                <Button variant="outline" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Search and Filters */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search templates by name, description, or features..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Categories Sidebar */}
              <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.value}
                        onClick={() => setSelectedCategory(category.value)}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                          selectedCategory === category.value
                            ? "bg-purple-100 text-purple-800"
                            : "hover:bg-gray-100"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{category.label}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {category.value === 'all' 
                            ? weddingTemplates.length 
                            : weddingTemplates.filter(t => t.category === category.value).length
                          }
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Templates Grid */}
              <div className="flex-1 p-6 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 mb-4">No templates match your search criteria</div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setSelectedDifficulty('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredTemplates.map((template) => (
                      <JourneyTemplateCard
                        key={template.id}
                        template={template}
                        onPreview={setPreviewTemplate}
                        onSelect={onSelectTemplate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {previewTemplate && (
            <div className="w-96 border-l border-gray-200 p-6 overflow-y-auto">
              <JourneyTemplatePreview
                template={previewTemplate}
                onClose={() => setPreviewTemplate(null)}
                onSelect={onSelectTemplate}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// Template Card Component
interface JourneyTemplateCardProps {
  template: JourneyTemplate;
  onPreview: (template: JourneyTemplate) => void;
  onSelect: (template: JourneyTemplate) => void;
}

const JourneyTemplateCard: React.FC<JourneyTemplateCardProps> = ({
  template,
  onPreview,
  onSelect
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'photography': return Camera;
      case 'venue': return MapPin;
      case 'catering': return Utensils;
      case 'planning': return Calendar;
      default: return Users;
    }
  };

  const CategoryIcon = getCategoryIcon(template.category);

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CategoryIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                {template.name}
                {template.is_premium && (
                  <Badge className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Premium
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-gray-600">By {template.created_by}</p>
            </div>
          </div>
          
          <Badge className={getDifficultyColor(template.difficulty)}>
            {template.difficulty}
          </Badge>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2">{template.description}</p>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Setup time:</span>
            <span className="font-medium">{template.estimated_setup_time} min</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Components:</span>
            <span className="font-medium">{template.nodes_count} nodes</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Rating:</span>
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="font-medium">{template.stats.rating}</span>
              <span className="text-gray-400">({template.stats.reviews})</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
          <div className="flex flex-wrap gap-1">
            {template.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
            {template.features.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.features.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(template)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => onSelect(template)}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Use Template
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Template Preview Component
interface JourneyTemplatePreviewProps {
  template: JourneyTemplate;
  onClose: () => void;
  onSelect: (template: JourneyTemplate) => void;
}

const JourneyTemplatePreview: React.FC<JourneyTemplatePreviewProps> = ({
  template,
  onClose,
  onSelect
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">{template.name}</h4>
          <p className="text-gray-600">{template.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Category:</span>
            <p className="font-medium capitalize">{template.category}</p>
          </div>
          <div>
            <span className="text-gray-500">Difficulty:</span>
            <p className="font-medium capitalize">{template.difficulty}</p>
          </div>
          <div>
            <span className="text-gray-500">Setup time:</span>
            <p className="font-medium">{template.estimated_setup_time} minutes</p>
          </div>
          <div>
            <span className="text-gray-500">Components:</span>
            <p className="font-medium">{template.nodes_count} nodes</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">All Features</h4>
          <ul className="space-y-1">
            {template.features.map((feature, index) => (
              <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="font-medium">{template.stats.rating} / 5.0</span>
          </div>
          <p className="text-sm text-gray-600">
            {template.stats.downloads.toLocaleString()} downloads • {template.stats.reviews} reviews
          </p>
        </div>
      </div>

      <Button
        onClick={() => onSelect(template)}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        <Download className="h-4 w-4 mr-2" />
        Use This Template
      </Button>
    </div>
  );
};
```

## 🔒 SECURITY & PERFORMANCE REQUIREMENTS

### 1. UI Security Checklist
- [ ] **Input Validation**: All journey configuration inputs sanitized
- [ ] **XSS Prevention**: Journey names and descriptions properly escaped
- [ ] **CSRF Protection**: All journey modifications require valid tokens
- [ ] **Access Control**: Journey editing restricted to authorized users
- [ ] **Data Validation**: Journey node configurations validated client and server-side
- [ ] **File Upload Security**: Template imports validated for malicious content
- [ ] **Session Management**: Journey editing sessions properly managed
- [ ] **Error Handling**: No sensitive information leaked in error messages
- [ ] **Audit Logging**: All journey modifications logged for compliance
- [ ] **Rate Limiting**: Journey creation and modification rate limited

### 2. Performance Optimization
- [ ] **Component Lazy Loading**: Journey canvas and templates loaded on demand
- [ ] **Virtual Scrolling**: Large template libraries use virtualization
- [ ] **React Flow Optimization**: Efficient rendering for large journey graphs
- [ ] **Debounced Auto-save**: Journey changes debounced to prevent excessive API calls
- [ ] **Optimistic Updates**: UI updates immediately while API calls process
- [ ] **Bundle Splitting**: Journey designer code split from main application
- [ ] **Image Optimization**: Template previews optimized for fast loading
- [ ] **Memory Management**: Proper cleanup of React Flow instances
- [ ] **Responsive Design**: Efficient mobile layouts that don't impact performance
- [ ] **Caching Strategy**: Template library and journey data properly cached

## 🎯 TYPICAL FRONTEND DELIVERABLES WITH EVIDENCE

### Core Journey Designer Components
- [ ] **Journey System Layout** (Evidence: Complete dashboard with sidebar navigation)
- [ ] **Visual Journey Canvas** (Show: React Flow drag-and-drop builder working)
- [ ] **Template Library** (Demo: Wedding-specific templates with preview)
- [ ] **Journey Analytics** (Display: Performance metrics and conversion tracking)
- [ ] **Mobile Responsive** (Test: Full functionality on mobile devices)
- [ ] **Real-time Updates** (Verify: Auto-save and collaborative editing)

### Wedding-Specific Features
- [ ] **Wedding Node Types** (Evidence: 15+ wedding-specific journey components)
- [ ] **Template Categories** (Show: Photography, venue, catering, planning templates)
- [ ] **Journey Validation** (Test: Workflow logic validation and error prevention)
- [ ] **Wedding Timeline Integration** (Demo: Date-based triggers working)
- [ ] **Vendor Branding** (Show: Customizable journey appearance)
- [ ] **Wedding Analytics** (Metrics: Wedding-specific performance tracking)

## 🚨 CRITICAL SUCCESS CRITERIA

Before marking this task complete, VERIFY:

### UI/UX Excellence
1. **Intuitive Design**: Non-technical wedding vendors can build journeys without training
2. **Visual Feedback**: Clear indication of journey status and component connections
3. **Mobile Responsive**: Full journey management functionality on mobile devices
4. **Performance**: Journey designer loads <2s and handles 100+ node workflows
5. **Accessibility**: Full keyboard navigation and screen reader support

### Wedding Industry Integration
6. **Template Library**: 10+ wedding-specific templates for different vendor types
7. **Wedding Components**: 15+ journey nodes specific to wedding workflows
8. **Industry Language**: UI uses wedding industry terminology throughout
9. **Vendor Customization**: Templates adaptable to different vendor specializations
10. **Wedding Timeline**: Date-based triggers integrate with wedding dates

### Technical Implementation
11. **React Flow Integration**: Smooth drag-and-drop workflow building
12. **Auto-save**: Journey changes automatically saved without user intervention
13. **Error Prevention**: Invalid journey configurations prevented with clear feedback
14. **Data Persistence**: Journey designs reliably saved and restored
15. **Component Library**: Consistent UI components following design system

**🎯 REMEMBER**: You're building the visual interface that wedding vendors will use to transform their manual processes into automated workflows. Every component must be intuitive for photographers who've never built software, while powerful enough to handle complex multi-step wedding coordination processes.

**Wedding Context**: A wedding photographer currently spends 4+ hours per wedding manually sending emails and tracking milestones. Your journey designer enables them to build a visual workflow once, then automatically handle communication for every future wedding - saving thousands of hours per year while ensuring no couple misses important deadlines.