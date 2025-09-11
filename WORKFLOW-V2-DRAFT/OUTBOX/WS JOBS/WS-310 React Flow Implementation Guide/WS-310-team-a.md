# WS-310: React Flow Implementation Guide - Team A UI Prompt

## COMPREHENSIVE TEAM A PROMPT
### Frontend UI Development for WedSync React Flow Wedding Timeline Canvas

---

## 🎯 DEVELOPMENT MANAGER DIRECTIVE

**Project**: WedSync Enterprise Wedding Platform  
**Feature**: WS-310 - React Flow Implementation Guide  
**Team**: A (Frontend UI & User Experience)  
**Sprint**: React Flow Canvas with Wedding Timeline Integration  
**Priority**: P0 (Visual workflow builder for wedding vendor automation)

**Context**: You are Team A, responsible for creating the React Flow-powered visual canvas that allows wedding vendors to build sophisticated automation workflows with wedding date-aware timeline positioning. This professional interface must handle complex drag-drop interactions while maintaining wedding industry context throughout.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### MANDATORY FILE VERIFICATION (Non-Negotiable)
```typescript
// CRITICAL: These files must exist before you begin development
const requiredFiles = [
  '/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-310-react-flow-implementation-guide-technical.md',
  '/wedsync/src/components/journeys/modules/ModuleTypeRegistry.tsx', // From WS-309
  '/wedsync/src/lib/services/journey-module-service.ts',     // From WS-309
  '/wedsync/src/components/journey-builder/JourneyCanvas.tsx', // Your foundation
  '/wedsync/src/components/journey-builder/WeddingTimeline.tsx', // Your component
  '/wedsync/src/components/journey-builder/nodes/WeddingTimelineNode.tsx' // Your nodes
];

// VERIFY: Each file must be read and understood before coding
requiredFiles.forEach(file => {
  if (!fileExists(file)) {
    throw new Error(`EVIDENCE FAILURE: Required file ${file} does not exist. Cannot create React Flow interface without module foundations.`);
  }
});
```

---

## 🧠 SEQUENTIAL THINKING INTEGRATION

### MANDATORY: Use Sequential Thinking MCP for Canvas Design

```typescript
// REQUIRED: Before implementing React Flow canvas
await mcp__sequential_thinking__sequential_thinking({
  thought: "I need to design a React Flow-powered visual canvas for WedSync's wedding workflow builder. Wedding vendors need to create timeline-based automation workflows that understand wedding dates and industry milestones. Let me analyze the UI requirements: 1) React Flow Canvas - Professional drag-drop interface with wedding timeline layout, 2) Wedding Timeline Component - Horizontal timeline with wedding date as reference point, automatic node positioning, 3) Custom Node Types - Wedding-specific nodes for each of the 7 module types, 4) Real-time Status - Live execution status overlay on running workflows, 5) Mobile Support - Touch-friendly interface for mobile wedding vendor usage, 6) Wedding Date Integration - Date picker that recalculates entire timeline automatically.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
});
```

---

## 🎨 WEDSYNC UI STACK INTEGRATION

### REQUIRED COMPONENT ARCHITECTURE
```typescript
// MANDATORY: Use these exact React Flow patterns
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  NodeTypes,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// WedSync UI components
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Wedding industry date utilities
import { addDays, addWeeks, addMonths, format, differenceInDays } from 'date-fns';
```

---

## 🔧 SERENA MCP INTEGRATION REQUIREMENTS

```bash
# REQUIRED: Before development work
serena activate_project WedSync2
serena get_symbols_overview src/components/journey-builder/
serena find_symbol "WeddingJourneyCanvas"
serena write_memory "WS-310-team-a-react-flow-canvas" "React Flow wedding timeline canvas with professional drag-drop workflow building"
```

---

## 📊 CORE DELIVERABLES

### 1. WEDDING JOURNEY CANVAS COMPONENT
```typescript
// FILE: /src/components/journey-builder/WeddingJourneyCanvas.tsx
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  NodeTypes,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { addDays, addWeeks, addMonths, format, differenceInDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// Wedding-specific node types
import { WeddingTimelineNode } from './nodes/WeddingTimelineNode';
import { EmailModuleNode } from './nodes/EmailModuleNode';
import { FormModuleNode } from './nodes/FormModuleNode';
import { MeetingModuleNode } from './nodes/MeetingModuleNode';
import { SMSModuleNode } from './nodes/SMSModuleNode';
import { InfoModuleNode } from './nodes/InfoModuleNode';
import { ReviewModuleNode } from './nodes/ReviewModuleNode';
import { ReferralModuleNode } from './nodes/ReferralModuleNode';

// UI Components
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Play, Pause, RotateCcw, Save, Settings } from 'lucide-react';

const nodeTypes: NodeTypes = {
  weddingTimeline: WeddingTimelineNode,
  email: EmailModuleNode,
  form: FormModuleNode,
  meeting: MeetingModuleNode,
  sms: SMSModuleNode,
  info: InfoModuleNode,
  review: ReviewModuleNode,
  referral: ReferralModuleNode,
};

interface WeddingJourneyCanvasProps {
  journeyId: string;
  initialWeddingDate?: Date;
  readonly?: boolean;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

const WeddingJourneyCanvasComponent: React.FC<WeddingJourneyCanvasProps> = ({
  journeyId,
  initialWeddingDate = new Date(),
  readonly = false,
  onSave
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [weddingDate, setWeddingDate] = useState<Date>(initialWeddingDate);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<Record<string, string>>({});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [timelineSettings, setTimelineSettings] = useState({
    showGrid: true,
    snapToGrid: true,
    orientation: 'horizontal' as 'horizontal' | 'vertical',
    scale: 1.0
  });

  const { toast } = useToast();
  const { fitView, getViewport, setViewport } = useReactFlow();

  // Initialize canvas with wedding timeline
  useEffect(() => {
    loadJourneyData();
    subscribeToExecutionUpdates();
    initializeWeddingTimeline();
  }, [journeyId]);

  // Recalculate node positions when wedding date changes
  useEffect(() => {
    recalculateTimelinePositions();
  }, [weddingDate]);

  async function loadJourneyData() {
    try {
      const { data: journey, error } = await supabase
        .from('journeys')
        .select(`
          *,
          journey_steps(*),
          timeline_layout_settings(*)
        `)
        .eq('id', journeyId)
        .single();

      if (error) throw error;

      if (journey?.canvas_config?.nodes) {
        setNodes(journey.canvas_config.nodes);
        setEdges(journey.canvas_config.edges || []);
      }

      if (journey.timeline_layout_settings?.length > 0) {
        const settings = journey.timeline_layout_settings[0];
        setTimelineSettings({
          showGrid: settings.show_grid,
          snapToGrid: settings.snap_to_grid,
          orientation: settings.timeline_orientation,
          scale: settings.timeline_scale
        });
      }

      // Load journey steps as nodes
      if (journey.journey_steps?.length > 0) {
        const stepNodes = await convertStepsToNodes(journey.journey_steps);
        setNodes(stepNodes);
      }

    } catch (error) {
      console.error('Failed to load journey data:', error);
      toast({
        title: "Error loading journey",
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    }
  }

  function subscribeToExecutionUpdates() {
    // Supabase realtime subscription for execution status
    const subscription = supabase
      .channel(`journey_execution_${journeyId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'journey_step_executions',
          filter: `instance_id=eq.${journeyId}`
        },
        (payload) => {
          setExecutionStatus(prev => ({
            ...prev,
            [payload.new.step_id]: payload.new.status
          }));
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }

  function initializeWeddingTimeline() {
    // Add wedding timeline reference node if it doesn't exist
    const hasTimelineNode = nodes.some(node => node.type === 'weddingTimeline');
    if (!hasTimelineNode) {
      const timelineNode: Node = {
        id: 'wedding-timeline',
        type: 'weddingTimeline',
        position: { x: 400, y: 50 },
        data: {
          weddingDate,
          label: 'Wedding Day',
          isReference: true
        },
        draggable: false,
        selectable: false
      };
      setNodes(prevNodes => [timelineNode, ...prevNodes]);
    }
  }

  async function recalculateTimelinePositions() {
    if (nodes.length === 0) return;

    try {
      const response = await fetch(`/api/journeys/${journeyId}/layout/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes.map(node => ({
            id: node.id,
            module_type: node.type,
            wedding_offset: node.data.weddingOffset || { value: 0, unit: 'days', direction: 'before' }
          })),
          wedding_date: weddingDate.toISOString(),
          layout_type: timelineSettings.orientation === 'horizontal' ? 'horizontal_timeline' : 'vertical_timeline'
        })
      });

      if (!response.ok) throw new Error('Layout calculation failed');

      const { positioned_nodes, timeline_bounds } = await response.json();

      // Update node positions with smooth animation
      setNodes(prevNodes => 
        prevNodes.map(node => {
          const positioned = positioned_nodes.find((p: any) => p.id === node.id);
          if (!positioned) return node;

          return {
            ...node,
            position: positioned.position,
            data: {
              ...node.data,
              executionDate: positioned.execution_date,
              weddingOffset: positioned.wedding_offset,
              timelinePosition: positioned.timeline_position
            }
          };
        })
      );

      // Auto-fit view to show timeline bounds
      setTimeout(() => {
        fitView({ padding: 0.1 });
      }, 100);

    } catch (error) {
      console.error('Failed to recalculate timeline:', error);
      toast({
        title: "Timeline calculation failed",
        description: "Please try again or refresh the page",
        variant: "destructive"
      });
    }
  }

  const onConnect = useCallback(
    (params: Connection) => {
      // Add wedding-specific connection logic
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (sourceNode && targetNode) {
        const newEdge = {
          ...params,
          type: 'smoothstep',
          data: {
            sourceExecution: sourceNode.data.executionDate,
            targetExecution: targetNode.data.executionDate,
            timingLogic: 'sequential'
          }
        };
        setEdges((eds) => addEdge(newEdge, eds));
      }
    },
    [nodes, setEdges]
  );

  async function handleWeddingDateChange(newDate: Date) {
    setWeddingDate(newDate);
    
    // Show loading state while recalculating
    setIsExecuting(true);
    await recalculateTimelinePositions();
    setIsExecuting(false);

    toast({
      title: "Wedding date updated",
      description: "Timeline has been recalculated automatically"
    });
  }

  async function executeJourney() {
    try {
      setIsExecuting(true);
      
      const response = await fetch(`/api/journeys/${journeyId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_date: weddingDate.toISOString(),
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            config: node.data,
            position: node.position
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            data: edge.data
          }))
        })
      });

      if (response.ok) {
        const { instance_id } = await response.json();
        toast({
          title: "Journey started",
          description: `Execution instance ${instance_id} is now running`
        });
      } else {
        throw new Error('Journey execution failed');
      }
    } catch (error) {
      console.error('Failed to execute journey:', error);
      toast({
        title: "Execution failed",
        description: "Please check your workflow configuration",
        variant: "destructive"
      });
    }
  }

  async function saveJourney() {
    try {
      const { error } = await supabase
        .from('journeys')
        .update({
          canvas_config: {
            nodes,
            edges,
            viewport: getViewport(),
            wedding_date: weddingDate.toISOString()
          }
        })
        .eq('id', journeyId);

      if (error) throw error;

      // Save individual node positions
      const nodePositions = nodes.map(node => ({
        journey_id: journeyId,
        step_id: node.id,
        position_x: node.position.x,
        position_y: node.position.y,
        wedding_offset_days: node.data.weddingOffset ? 
          calculateOffsetDays(node.data.weddingOffset) : 0
      }));

      await supabase
        .from('journey_node_positions')
        .upsert(nodePositions, { onConflict: 'journey_id,step_id' });

      if (onSave) {
        onSave(nodes, edges);
      }

      toast({
        title: "Journey saved",
        description: "All changes have been saved successfully"
      });

    } catch (error) {
      console.error('Failed to save journey:', error);
      toast({
        title: "Save failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }

  function calculateOffsetDays(offset: any): number {
    if (!offset) return 0;
    
    const multiplier = offset.direction === 'before' ? -1 : 1;
    let days = offset.value * multiplier;
    
    switch (offset.unit) {
      case 'weeks':
        days *= 7;
        break;
      case 'months':
        days *= 30; // Approximate
        break;
    }
    
    return days;
  }

  async function convertStepsToNodes(steps: any[]): Promise<Node[]> {
    return steps.map((step, index) => ({
      id: step.step_id,
      type: step.module_type,
      position: { x: index * 300 + 100, y: 200 },
      data: {
        ...step.config_data,
        stepName: step.step_name,
        moduleType: step.module_type,
        weddingOffset: step.conditions?.wedding_offset,
        executionStatus: 'idle'
      }
    }));
  }

  const weddingTimelineMarkers = useMemo(() => {
    const markers = [];
    const referenceDate = weddingDate;
    
    // Create timeline markers
    const offsets = [
      { label: '6 months before', months: -6 },
      { label: '3 months before', months: -3 },
      { label: '6 weeks before', weeks: -6 },
      { label: '1 week before', weeks: -1 },
      { label: 'Wedding Day', days: 0 },
      { label: '1 week after', weeks: 1 },
      { label: '1 month after', months: 1 }
    ];

    offsets.forEach((offset, index) => {
      let markerDate = referenceDate;
      if (offset.months) markerDate = addMonths(referenceDate, offset.months);
      if (offset.weeks) markerDate = addWeeks(referenceDate, offset.weeks);
      if (offset.days) markerDate = addDays(referenceDate, offset.days);

      markers.push({
        id: `marker-${index}`,
        label: offset.label,
        date: markerDate,
        position: index * 200 + 50,
        isWeddingDay: offset.days === 0
      });
    });

    return markers;
  }, [weddingDate]);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            executionStatus: executionStatus[node.id] || 'idle',
            weddingDate,
            isExecuting,
            readonly
          }
        }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid={timelineSettings.snapToGrid}
        snapGrid={[20, 20]}
        className="wedding-flow-canvas"
        onNodeClick={(event, node) => setSelectedNode(node)}
      >
        <Background 
          variant={timelineSettings.showGrid ? "dots" : "lines"} 
          gap={20} 
          size={1} 
        />
        <Controls />
        
        {/* Wedding Date Control Panel */}
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg border">
          <Card className="w-80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Wedding Timeline</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="wedding-date">Wedding Date</Label>
                <Input
                  id="wedding-date"
                  type="date"
                  value={format(weddingDate, 'yyyy-MM-dd')}
                  onChange={(e) => handleWeddingDateChange(new Date(e.target.value))}
                  disabled={readonly}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Timeline will adjust automatically
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Days until wedding:</span>
                <Badge variant="outline">
                  {differenceInDays(weddingDate, new Date())} days
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Panel>

        {/* Execution Controls */}
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg border">
          <Card className="w-72">
            <CardHeader className="pb-3">
              <h3 className="font-semibold">Journey Controls</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={executeJourney}
                  disabled={isExecuting || readonly}
                  className="flex-1"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isExecuting ? 'Running...' : 'Start Journey'}
                </Button>
                
                <Button
                  onClick={saveJourney}
                  disabled={readonly}
                  variant="outline"
                  size="sm"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
              
              {Object.keys(executionStatus).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Execution Status:</h4>
                  <div className="space-y-1 text-xs">
                    {Object.entries(executionStatus).map(([stepId, status]) => (
                      <div key={stepId} className="flex justify-between items-center">
                        <span className="truncate">{stepId}</span>
                        <Badge 
                          variant={
                            status === 'completed' ? 'default' :
                            status === 'failed' ? 'destructive' :
                            status === 'running' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Panel>

        {/* Timeline Markers */}
        <Panel position="bottom-center" className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 border">
          <div className="flex items-center gap-6 text-xs">
            {weddingTimelineMarkers.map(marker => (
              <div
                key={marker.id}
                className={`text-center ${
                  marker.isWeddingDay ? 'font-bold text-blue-600' : 'text-gray-600'
                }`}
              >
                <div>{marker.label}</div>
                <div className="text-gray-400">
                  {format(marker.date, 'MMM dd')}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Timeline Settings */}
        <Panel position="top-center" className="bg-white rounded-lg shadow-lg border">
          <Card className="w-64">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Canvas Settings</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Show Grid</span>
                <input
                  type="checkbox"
                  checked={timelineSettings.showGrid}
                  onChange={(e) => setTimelineSettings(prev => ({
                    ...prev,
                    showGrid: e.target.checked
                  }))}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Snap to Grid</span>
                <input
                  type="checkbox"
                  checked={timelineSettings.snapToGrid}
                  onChange={(e) => setTimelineSettings(prev => ({
                    ...prev,
                    snapToGrid: e.target.checked
                  }))}
                  className="rounded"
                />
              </div>
            </CardContent>
          </Card>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Wrapper with ReactFlowProvider
export const WeddingJourneyCanvas: React.FC<WeddingJourneyCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WeddingJourneyCanvasComponent {...props} />
    </ReactFlowProvider>
  );
};
```

### 2. WEDDING TIMELINE NODE COMPONENT
```typescript
// FILE: /src/components/journey-builder/nodes/WeddingTimelineNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Heart } from 'lucide-react';
import { format } from 'date-fns';

interface WeddingTimelineNodeData {
  weddingDate: Date;
  label: string;
  isReference: boolean;
  executionStatus?: string;
}

export const WeddingTimelineNode = memo<NodeProps<WeddingTimelineNodeData>>(({
  data
}) => {
  return (
    <Card className="min-w-[200px] bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-pink-600" />
          <h3 className="font-semibold text-pink-900">{data.label}</h3>
        </div>
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{format(data.weddingDate, 'EEEE, MMMM do, yyyy')}</span>
          </div>
          
          <Badge variant="secondary" className="bg-pink-100 text-pink-800">
            Timeline Reference
          </Badge>
        </div>

        {/* Connection handles */}
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-pink-500 border-pink-600"
        />
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-pink-500 border-pink-600"
        />
      </CardContent>
    </Card>
  );
});

WeddingTimelineNode.displayName = 'WeddingTimelineNode';
```

### 3. EMAIL MODULE NODE COMPONENT
```typescript
// FILE: /src/components/journey-builder/nodes/EmailModuleNode.tsx
'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Settings, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface EmailModuleNodeData {
  stepName: string;
  templateId?: string;
  templateName?: string;
  weddingOffset?: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
    direction: 'before' | 'after';
  };
  executionStatus: 'idle' | 'running' | 'completed' | 'failed';
  executionDate?: Date;
  weddingDate: Date;
  isExecuting?: boolean;
  readonly?: boolean;
}

export const EmailModuleNode = memo<NodeProps<EmailModuleNodeData>>(({
  id,
  data,
  selected
}) => {
  const [isConfiguring, setIsConfiguring] = useState(false);

  const getStatusIcon = () => {
    switch (data.executionStatus) {
      case 'running':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (data.executionStatus) {
      case 'running':
        return 'border-blue-300 bg-blue-50';
      case 'completed':
        return 'border-green-300 bg-green-50';
      case 'failed':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const calculateExecutionDate = () => {
    if (!data.weddingOffset) return null;
    
    const { value, unit, direction } = data.weddingOffset;
    const multiplier = direction === 'before' ? -value : value;
    
    switch (unit) {
      case 'days':
        return addDays(data.weddingDate, multiplier);
      case 'weeks':
        return addDays(data.weddingDate, multiplier * 7);
      case 'months':
        return addDays(data.weddingDate, multiplier * 30); // Approximate
      default:
        return null;
    }
  };

  const executionDate = data.executionDate || calculateExecutionDate();

  return (
    <Card className={`min-w-[250px] transition-all duration-200 ${
      selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
    } ${getStatusColor()}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-sm">Email Module</h3>
          </div>
          
          {!data.readonly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfiguring(true)}
              className="h-6 w-6 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-2">
        <div>
          <h4 className="font-medium text-sm text-gray-900">{data.stepName}</h4>
          {data.templateName && (
            <p className="text-xs text-gray-600">Template: {data.templateName}</p>
          )}
        </div>

        {executionDate && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span>Executes: {format(executionDate, 'MMM dd, yyyy')}</span>
          </div>
        )}

        {data.weddingOffset && (
          <Badge variant="outline" className="text-xs">
            {data.weddingOffset.value} {data.weddingOffset.unit} {data.weddingOffset.direction} wedding
          </Badge>
        )}

        <Badge 
          variant={data.executionStatus === 'idle' ? 'secondary' : 'default'}
          className="text-xs capitalize"
        >
          {data.executionStatus}
        </Badge>
      </CardContent>

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-blue-600"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-blue-600"
      />
    </Card>
  );
});

EmailModuleNode.displayName = 'EmailModuleNode';
```

---

## ✅ DEFINITION OF DONE

### UI ACCEPTANCE CRITERIA
- [ ] **React Flow Canvas**: Professional drag-drop interface with wedding timeline layout
- [ ] **Wedding Timeline**: Horizontal timeline with automatic node positioning based on wedding dates
- [ ] **Custom Node Types**: 7 wedding-specific node types with execution status indicators
- [ ] **Real-time Updates**: Live execution status overlay on running workflows
- [ ] **Mobile Responsive**: Touch-friendly interface for mobile wedding vendor usage
- [ ] **Wedding Date Integration**: Date picker that recalculates entire timeline automatically
- [ ] **Performance**: Smooth rendering of 100+ node workflows
- [ ] **Accessibility**: Keyboard navigation and screen reader support

### Quality Gates
- [ ] **Visual Design**: Matches WedSync design system with wedding industry aesthetics
- [ ] **User Experience**: Wedding vendors can build workflows without training
- [ ] **Cross-browser**: Works in Chrome, Safari, Firefox, Edge
- [ ] **Touch Interface**: Optimized for tablet and mobile touch interactions

---

**Frontend Excellence: Beautiful, intuitive React Flow canvas for wedding workflow automation! 🎨💍**