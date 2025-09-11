# WS-310: React Flow Implementation Guide - Team B Backend Prompt

## COMPREHENSIVE TEAM B PROMPT
### Backend Services for WedSync React Flow Wedding Timeline System

---

## 🎯 DEVELOPMENT MANAGER DIRECTIVE

**Project**: WedSync Enterprise Wedding Platform  
**Feature**: WS-310 - React Flow Implementation Guide  
**Team**: B (Backend Development & Services)  
**Sprint**: React Flow Backend Services with Timeline Calculations  
**Priority**: P0 (Critical backend for visual workflow builder)

**Context**: You are Team B, responsible for building the backend services that power WedSync's React Flow wedding timeline canvas. You must create robust APIs for timeline layout calculations, wedding date-aware positioning algorithms, and real-time execution status management.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### MANDATORY FILE VERIFICATION (Non-Negotiable)
```typescript
// CRITICAL: These files must exist before you begin development
const requiredFiles = [
  '/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-310-react-flow-implementation-guide-technical.md',
  '/wedsync/src/components/journey-builder/WeddingJourneyCanvas.tsx', // From Team A
  '/wedsync/src/lib/services/journey-module-service.ts',     // From WS-309
  '/wedsync/src/lib/services/timeline-layout-service.ts',    // Your foundation
  '/wedsync/src/app/api/journeys/[id]/layout/route.ts'       // Your API routes
];

// VERIFY: Each file must be read and understood before coding
requiredFiles.forEach(file => {
  if (!fileExists(file)) {
    throw new Error(`EVIDENCE FAILURE: Required file ${file} does not exist. Cannot create backend services without understanding canvas requirements.`);
  }
});
```

---

## 🧠 SEQUENTIAL THINKING INTEGRATION

### MANDATORY: Use Sequential Thinking MCP for Service Architecture

```typescript
// REQUIRED: Before implementing any backend service
await mcp__sequential_thinking__sequential_thinking({
  thought: "I need to design the backend services for WedSync's React Flow wedding timeline system. This must handle sophisticated timeline calculations and real-time workflow execution. Let me analyze the backend requirements: 1) Timeline Layout Service - Calculate node positions using Dagre graph layout with wedding date offsets, 2) Wedding Date Calculator - Handle complex date arithmetic for various time units (days, weeks, months), 3) Canvas State Management - Store and retrieve journey canvas configurations, 4) Real-time Execution API - Track and broadcast workflow execution status, 5) Node Position Persistence - Save drag-drop positions with wedding timeline context, 6) Layout Algorithm Integration - Use Dagre.js for professional workflow layouts.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
});
```

---

## 🎨 WEDSYNC BACKEND STACK INTEGRATION

### REQUIRED SERVICE ARCHITECTURE
```typescript
// MANDATORY: Use these exact backend patterns
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// Timeline calculation dependencies
import dagre from 'dagre';
import { addDays, addWeeks, addMonths, differenceInDays, format } from 'date-fns';

// Wedding industry service integration
import { WeddingDateCalculator } from '@/lib/services/wedding-date-calculator';
import { JourneyExecutionEngine } from '@/lib/services/journey-execution-engine';
```

---

## 📊 CORE DELIVERABLES

### 1. TIMELINE LAYOUT SERVICE
```typescript
// FILE: /src/lib/services/timeline-layout-service.ts
import dagre from 'dagre';
import { addDays, addWeeks, addMonths, differenceInDays } from 'date-fns';
import { logger } from '@/lib/utils/logger';

interface LayoutNode {
  id: string;
  module_type: string;
  wedding_offset: WeddingOffset;
  config?: any;
}

interface WeddingOffset {
  value: number;
  unit: 'days' | 'weeks' | 'months';
  direction: 'before' | 'after';
}

interface PositionedNode {
  id: string;
  position: { x: number; y: number };
  execution_date: Date;
  timeline_position: number;
  wedding_offset: WeddingOffset;
}

interface TimelineLayoutSettings {
  timeline_orientation: 'horizontal' | 'vertical';
  timeline_scale: number;
  lane_height: number;
  node_spacing: number;
  show_grid: boolean;
  snap_to_grid: boolean;
}

interface TimelineBounds {
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
}

export class TimelineLayoutService {
  private weddingDateCalculator: WeddingDateCalculator;

  constructor() {
    this.weddingDateCalculator = new WeddingDateCalculator();
  }

  async calculateWeddingTimeline(
    nodes: LayoutNode[],
    weddingDate: Date,
    settings: TimelineLayoutSettings
  ): Promise<{ positioned_nodes: PositionedNode[]; timeline_bounds: TimelineBounds }> {
    try {
      logger.info('Calculating wedding timeline layout', {
        nodeCount: nodes.length,
        weddingDate: weddingDate.toISOString(),
        orientation: settings.timeline_orientation
      });

      // Calculate execution dates for all nodes
      const nodesWithDates = nodes.map(node => ({
        ...node,
        execution_date: this.calculateExecutionDate(node.wedding_offset, weddingDate),
        timeline_position: this.calculateTimelinePosition(node.wedding_offset, weddingDate)
      }));

      // Sort nodes by execution date for timeline ordering
      nodesWithDates.sort((a, b) => a.execution_date.getTime() - b.execution_date.getTime());

      // Create Dagre graph for layout
      const g = new dagre.graphlib.Graph();
      
      g.setGraph({
        rankdir: settings.timeline_orientation === 'horizontal' ? 'LR' : 'TB',
        ranksep: settings.node_spacing,
        nodesep: settings.lane_height,
        marginx: 50,
        marginy: 50
      });

      // Add nodes to graph
      nodesWithDates.forEach((node, index) => {
        g.setNode(node.id, {
          width: this.getNodeWidth(node.module_type),
          height: this.getNodeHeight(node.module_type),
          timeline_rank: index, // Timeline ordering
          wedding_offset_days: differenceInDays(node.execution_date, weddingDate)
        });
      });

      // Add edges based on timeline sequence
      for (let i = 0; i < nodesWithDates.length - 1; i++) {
        const currentNode = nodesWithDates[i];
        const nextNode = nodesWithDates[i + 1];
        
        // Only add edge if nodes are within reasonable timeline distance
        const daysDifference = differenceInDays(nextNode.execution_date, currentNode.execution_date);
        if (daysDifference <= 180) { // 6 months max
          g.setEdge(currentNode.id, nextNode.id, {
            timeline_connection: true,
            days_apart: daysDifference
          });
        }
      }

      // Apply Dagre layout algorithm
      dagre.layout(g);

      // Convert graph positions to positioned nodes
      const positionedNodes: PositionedNode[] = nodesWithDates.map(node => {
        const graphNode = g.node(node.id);
        
        return {
          id: node.id,
          position: {
            x: graphNode.x * settings.timeline_scale,
            y: graphNode.y * settings.timeline_scale
          },
          execution_date: node.execution_date,
          timeline_position: node.timeline_position,
          wedding_offset: node.wedding_offset
        };
      });

      // Calculate timeline bounds
      const timeline_bounds = this.calculateTimelineBounds(positionedNodes);

      logger.info('Wedding timeline layout calculated successfully', {
        positionedNodes: positionedNodes.length,
        bounds: timeline_bounds
      });

      return { positioned_nodes: positionedNodes, timeline_bounds };

    } catch (error) {
      logger.error('Timeline layout calculation failed:', error);
      throw new Error(`Timeline layout calculation failed: ${error.message}`);
    }
  }

  private calculateExecutionDate(offset: WeddingOffset, weddingDate: Date): Date {
    const multiplier = offset.direction === 'before' ? -1 : 1;
    const value = offset.value * multiplier;

    switch (offset.unit) {
      case 'days':
        return addDays(weddingDate, value);
      case 'weeks':
        return addWeeks(weddingDate, value);
      case 'months':
        return addMonths(weddingDate, value);
      default:
        return weddingDate;
    }
  }

  private calculateTimelinePosition(offset: WeddingOffset, weddingDate: Date): number {
    const executionDate = this.calculateExecutionDate(offset, weddingDate);
    return differenceInDays(executionDate, weddingDate);
  }

  private getNodeWidth(moduleType: string): number {
    const widths: Record<string, number> = {
      email: 250,
      form: 280,
      meeting: 260,
      sms: 240,
      info: 220,
      review: 270,
      referral: 290,
      weddingTimeline: 300
    };
    return widths[moduleType] || 250;
  }

  private getNodeHeight(moduleType: string): number {
    const heights: Record<string, number> = {
      email: 120,
      form: 140,
      meeting: 130,
      sms: 110,
      info: 100,
      review: 150,
      referral: 160,
      weddingTimeline: 140
    };
    return heights[moduleType] || 120;
  }

  private calculateTimelineBounds(nodes: PositionedNode[]): TimelineBounds {
    if (nodes.length === 0) {
      return { min_x: 0, max_x: 0, min_y: 0, max_y: 0 };
    }

    const positions = nodes.map(node => node.position);
    
    return {
      min_x: Math.min(...positions.map(p => p.x)) - 150,
      max_x: Math.max(...positions.map(p => p.x)) + 150,
      min_y: Math.min(...positions.map(p => p.y)) - 100,
      max_y: Math.max(...positions.map(p => p.y)) + 100
    };
  }

  async recalculateForWeddingDateChange(
    journeyId: string,
    newWeddingDate: Date
  ): Promise<PositionedNode[]> {
    try {
      // Get existing nodes from database
      const { data: nodePositions } = await supabase
        .from('journey_node_positions')
        .select('*')
        .eq('journey_id', journeyId);

      if (!nodePositions) {
        throw new Error('No node positions found for journey');
      }

      // Convert database positions to layout nodes
      const layoutNodes: LayoutNode[] = nodePositions.map(pos => ({
        id: pos.step_id,
        module_type: pos.module_type || 'email',
        wedding_offset: this.daysToOffset(pos.wedding_offset_days || 0)
      }));

      // Get layout settings
      const { data: settings } = await supabase
        .from('timeline_layout_settings')
        .select('*')
        .eq('journey_id', journeyId)
        .single();

      const layoutSettings: TimelineLayoutSettings = settings || {
        timeline_orientation: 'horizontal',
        timeline_scale: 1.0,
        lane_height: 120,
        node_spacing: 200,
        show_grid: true,
        snap_to_grid: true
      };

      // Recalculate layout
      const { positioned_nodes } = await this.calculateWeddingTimeline(
        layoutNodes,
        newWeddingDate,
        layoutSettings
      );

      // Update database with new positions
      for (const node of positioned_nodes) {
        await supabase
          .from('journey_node_positions')
          .update({
            position_x: node.position.x,
            position_y: node.position.y,
            wedding_offset_days: differenceInDays(node.execution_date, newWeddingDate)
          })
          .eq('journey_id', journeyId)
          .eq('step_id', node.id);
      }

      return positioned_nodes;

    } catch (error) {
      logger.error('Wedding date recalculation failed:', error);
      throw error;
    }
  }

  private daysToOffset(days: number): WeddingOffset {
    const direction = days < 0 ? 'before' : 'after';
    const absValue = Math.abs(days);

    // Convert to most appropriate unit
    if (absValue >= 30 && absValue % 30 === 0) {
      return { value: absValue / 30, unit: 'months', direction };
    } else if (absValue >= 7 && absValue % 7 === 0) {
      return { value: absValue / 7, unit: 'weeks', direction };
    } else {
      return { value: absValue, unit: 'days', direction };
    }
  }

  async optimizeTimelineLayout(
    nodes: LayoutNode[],
    weddingDate: Date,
    settings: TimelineLayoutSettings
  ): Promise<PositionedNode[]> {
    // Advanced layout optimization for wedding workflows
    const { positioned_nodes } = await this.calculateWeddingTimeline(nodes, weddingDate, settings);

    // Apply wedding-specific layout optimizations
    return this.applyWeddingOptimizations(positioned_nodes, weddingDate);
  }

  private applyWeddingOptimizations(
    nodes: PositionedNode[],
    weddingDate: Date
  ): PositionedNode[] {
    return nodes.map(node => {
      // Highlight wedding week nodes
      const daysToWedding = differenceInDays(node.execution_date, weddingDate);
      const isWeddingWeek = Math.abs(daysToWedding) <= 7;

      // Adjust positioning for wedding week prominence
      if (isWeddingWeek) {
        return {
          ...node,
          position: {
            ...node.position,
            y: node.position.y - 20 // Elevate wedding week nodes
          }
        };
      }

      return node;
    });
  }
}
```

### 2. WEDDING DATE CALCULATOR SERVICE
```typescript
// FILE: /src/lib/services/wedding-date-calculator.ts
import { addDays, addWeeks, addMonths, differenceInDays, differenceInWeeks, differenceInMonths, format } from 'date-fns';
import { logger } from '@/lib/utils/logger';

interface WeddingOffset {
  value: number;
  unit: 'days' | 'weeks' | 'months';
  direction: 'before' | 'after';
}

interface WeddingMilestone {
  name: string;
  offset: WeddingOffset;
  importance: 'critical' | 'high' | 'medium' | 'low';
  vendor_types: string[];
  description: string;
}

export class WeddingDateCalculator {
  private weddingMilestones: WeddingMilestone[] = [
    {
      name: 'Initial Booking',
      offset: { value: 12, unit: 'months', direction: 'before' },
      importance: 'critical',
      vendor_types: ['photographer', 'venue', 'planner'],
      description: 'First contact and booking confirmation'
    },
    {
      name: 'Engagement Session',
      offset: { value: 6, unit: 'months', direction: 'before' },
      importance: 'high',
      vendor_types: ['photographer'],
      description: 'Engagement photo session'
    },
    {
      name: 'Menu Tasting',
      offset: { value: 3, unit: 'months', direction: 'before' },
      importance: 'high',
      vendor_types: ['venue', 'caterer'],
      description: 'Final menu selection and tasting'
    },
    {
      name: 'Final Details',
      offset: { value: 6, unit: 'weeks', direction: 'before' },
      importance: 'critical',
      vendor_types: ['photographer', 'venue', 'planner', 'caterer'],
      description: 'Timeline, guest count, special requirements'
    },
    {
      name: 'Final Payment',
      offset: { value: 2, unit: 'weeks', direction: 'before' },
      importance: 'critical',
      vendor_types: ['photographer', 'venue', 'caterer'],
      description: 'Final payment and contract completion'
    },
    {
      name: 'Wedding Day',
      offset: { value: 0, unit: 'days', direction: 'before' },
      importance: 'critical',
      vendor_types: ['photographer', 'venue', 'planner', 'caterer'],
      description: 'The big day!'
    },
    {
      name: 'Thank You Follow-up',
      offset: { value: 1, unit: 'weeks', direction: 'after' },
      importance: 'medium',
      vendor_types: ['photographer', 'venue', 'planner'],
      description: 'Thank you message and service feedback'
    },
    {
      name: 'Gallery Delivery',
      offset: { value: 4, unit: 'weeks', direction: 'after' },
      importance: 'high',
      vendor_types: ['photographer'],
      description: 'Wedding photo gallery delivery'
    },
    {
      name: 'Review Request',
      offset: { value: 2, unit: 'months', direction: 'after' },
      importance: 'medium',
      vendor_types: ['photographer', 'venue', 'caterer'],
      description: 'Request for online reviews and testimonials'
    }
  ];

  calculateExecutionDate(offset: WeddingOffset, weddingDate: Date): Date {
    try {
      const multiplier = offset.direction === 'before' ? -1 : 1;
      const value = offset.value * multiplier;

      switch (offset.unit) {
        case 'days':
          return addDays(weddingDate, value);
        case 'weeks':
          return addWeeks(weddingDate, value);
        case 'months':
          return addMonths(weddingDate, value);
        default:
          throw new Error(`Invalid offset unit: ${offset.unit}`);
      }
    } catch (error) {
      logger.error('Execution date calculation failed:', { offset, weddingDate, error });
      return weddingDate; // Fallback to wedding date
    }
  }

  calculateWeddingOffset(targetDate: Date, weddingDate: Date): WeddingOffset {
    const daysDifference = differenceInDays(targetDate, weddingDate);
    const direction = daysDifference < 0 ? 'before' : 'after';
    const absValue = Math.abs(daysDifference);

    // Determine most appropriate unit
    const monthsDiff = Math.abs(differenceInMonths(targetDate, weddingDate));
    const weeksDiff = Math.abs(differenceInWeeks(targetDate, weddingDate));

    if (monthsDiff >= 1 && absValue >= 28) {
      return { value: monthsDiff, unit: 'months', direction };
    } else if (weeksDiff >= 1 && absValue >= 7) {
      return { value: weeksDiff, unit: 'weeks', direction };
    } else {
      return { value: absValue, unit: 'days', direction };
    }
  }

  getWeddingMilestones(vendorType: string): WeddingMilestone[] {
    return this.weddingMilestones.filter(milestone =>
      milestone.vendor_types.includes(vendorType)
    );
  }

  calculateMilestoneDate(milestone: WeddingMilestone, weddingDate: Date): Date {
    return this.calculateExecutionDate(milestone.offset, weddingDate);
  }

  isWeddingWeek(targetDate: Date, weddingDate: Date): boolean {
    const daysDifference = Math.abs(differenceInDays(targetDate, weddingDate));
    return daysDifference <= 7;
  }

  getWeddingSeason(weddingDate: Date): 'peak' | 'mid' | 'off' {
    const month = weddingDate.getMonth() + 1; // 1-12
    
    if (month >= 5 && month <= 9) return 'peak';    // May-Sep
    if (month === 4 || month === 10) return 'mid';  // Apr, Oct
    return 'off';                                    // Nov-Mar
  }

  formatWeddingOffset(offset: WeddingOffset): string {
    const unit = offset.value === 1 ? offset.unit.slice(0, -1) : offset.unit; // Singular/plural
    return `${offset.value} ${unit} ${offset.direction} wedding`;
  }

  validateWeddingDate(weddingDate: Date): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // Check if date is in the past
    if (weddingDate < new Date()) {
      warnings.push('Wedding date is in the past');
      isValid = false;
    }

    // Check if date is too far in the future
    const twoYearsFromNow = addMonths(new Date(), 24);
    if (weddingDate > twoYearsFromNow) {
      warnings.push('Wedding date is more than 2 years away');
    }

    // Check for common wedding days (Friday-Sunday)
    const dayOfWeek = weddingDate.getDay();
    if (dayOfWeek < 5) { // Monday-Thursday
      warnings.push('Wedding is scheduled for a weekday');
    }

    // Check for peak season
    const season = this.getWeddingSeason(weddingDate);
    if (season === 'peak') {
      warnings.push('Wedding is during peak season - expect higher demand');
    }

    return { isValid, warnings };
  }

  calculateTimelineSpan(offsets: WeddingOffset[], weddingDate: Date): {
    startDate: Date;
    endDate: Date;
    totalDays: number;
  } {
    const dates = offsets.map(offset => this.calculateExecutionDate(offset, weddingDate));
    dates.push(weddingDate); // Include wedding date itself

    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const totalDays = differenceInDays(endDate, startDate);

    return { startDate, endDate, totalDays };
  }

  suggestOptimalTiming(moduleType: string, vendorType: string): WeddingOffset[] {
    const suggestions: Record<string, Record<string, WeddingOffset[]>> = {
      email: {
        photographer: [
          { value: 6, unit: 'months', direction: 'before' }, // Booking confirmation
          { value: 8, unit: 'weeks', direction: 'before' },  // Engagement session
          { value: 2, unit: 'weeks', direction: 'before' },  // Final details
          { value: 1, unit: 'weeks', direction: 'after' },   // Thank you
        ],
        venue: [
          { value: 12, unit: 'months', direction: 'before' }, // Initial booking
          { value: 3, unit: 'months', direction: 'before' },  // Menu tasting
          { value: 1, unit: 'months', direction: 'before' },  // Final details
          { value: 3, unit: 'days', direction: 'after' },     // Thank you
        ]
      },
      form: {
        photographer: [
          { value: 4, unit: 'months', direction: 'before' }, // Photography questionnaire
          { value: 6, unit: 'weeks', direction: 'before' },  // Shot list
        ],
        venue: [
          { value: 6, unit: 'months', direction: 'before' }, // Venue requirements
          { value: 2, unit: 'months', direction: 'before' }, // Final headcount
        ]
      }
    };

    return suggestions[moduleType]?.[vendorType] || [
      { value: 1, unit: 'months', direction: 'before' }
    ];
  }
}
```

### 3. LAYOUT CALCULATION API
```typescript
// FILE: /src/app/api/journeys/[id]/layout/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';
import { TimelineLayoutService } from '@/lib/services/timeline-layout-service';
import { logger } from '@/lib/utils/logger';

const calculateLayoutSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    module_type: z.string(),
    wedding_offset: z.object({
      value: z.number(),
      unit: z.enum(['days', 'weeks', 'months']),
      direction: z.enum(['before', 'after'])
    })
  })),
  wedding_date: z.string(),
  layout_type: z.enum(['horizontal_timeline', 'vertical_timeline', 'free_form'])
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies: request.cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const journeyId = params.id;
    
    // Validate request body
    const body = await request.json();
    const validation = calculateLayoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { nodes, wedding_date, layout_type } = validation.data;
    const weddingDate = new Date(wedding_date);

    // Verify user owns this journey
    const { data: journey } = await supabase
      .from('journeys')
      .select('supplier_id')
      .eq('id', journeyId)
      .single();

    if (!journey || journey.supplier_id !== user.id) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Get layout settings
    const { data: settings } = await supabase
      .from('timeline_layout_settings')
      .select('*')
      .eq('journey_id', journeyId)
      .single();

    const layoutSettings = settings || {
      timeline_orientation: layout_type === 'horizontal_timeline' ? 'horizontal' : 'vertical',
      timeline_scale: 1.0,
      lane_height: 120,
      node_spacing: 200,
      show_grid: true,
      snap_to_grid: true
    };

    // Calculate timeline layout
    const layoutService = new TimelineLayoutService();
    const result = await layoutService.calculateWeddingTimeline(
      nodes,
      weddingDate,
      layoutSettings
    );

    // Log layout calculation
    logger.info('Timeline layout calculated', {
      journeyId,
      nodeCount: nodes.length,
      weddingDate: wedding_date,
      layoutType: layout_type
    });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Layout calculation failed:', {
      journeyId: params.id,
      error: error.message
    });
    
    return NextResponse.json(
      { error: 'Layout calculation failed', message: error.message },
      { status: 500 }
    );
  }
}

// GET /api/journeys/{id}/layout/settings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies: request.cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const journeyId = params.id;

    // Get current layout settings
    const { data: settings, error } = await supabase
      .from('timeline_layout_settings')
      .select('*')
      .eq('journey_id', journeyId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    const defaultSettings = {
      journey_id: journeyId,
      timeline_orientation: 'horizontal',
      timeline_scale: 1.0,
      lane_height: 120,
      node_spacing: 200,
      show_grid: true,
      snap_to_grid: true
    };

    return NextResponse.json(settings || defaultSettings);

  } catch (error) {
    logger.error('Failed to get layout settings:', error);
    return NextResponse.json(
      { error: 'Failed to get layout settings' },
      { status: 500 }
    );
  }
}
```

### 4. EXECUTION STATUS API
```typescript
// FILE: /src/app/api/journeys/[id]/execution/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { logger } from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies: request.cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const journeyId = params.id;

    // Get active journey instance
    const { data: instance } = await supabase
      .from('journey_instances')
      .select(`
        *,
        journey_step_executions(*)
      `)
      .eq('journey_id', journeyId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!instance) {
      return NextResponse.json({
        instance_id: null,
        current_step: null,
        status: 'idle',
        step_statuses: {},
        progress_percentage: 0
      });
    }

    // Calculate step statuses
    const stepStatuses: Record<string, string> = {};
    let completedSteps = 0;

    if (instance.journey_step_executions) {
      instance.journey_step_executions.forEach((execution: any) => {
        stepStatuses[execution.step_id] = execution.status;
        if (execution.status === 'completed') {
          completedSteps++;
        }
      });
    }

    const totalSteps = instance.journey_step_executions?.length || 0;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return NextResponse.json({
      instance_id: instance.id,
      current_step: instance.current_step,
      status: instance.status,
      step_statuses: stepStatuses,
      progress_percentage: Math.round(progressPercentage),
      started_at: instance.started_at,
      total_steps: totalSteps,
      completed_steps: completedSteps
    });

  } catch (error) {
    logger.error('Failed to get execution status:', error);
    return NextResponse.json(
      { error: 'Failed to get execution status' },
      { status: 500 }
    );
  }
}
```

---

## ✅ DEFINITION OF DONE

### Backend Acceptance Criteria
- [ ] **Timeline Layout Service**: Dagre.js-powered layout calculations with wedding date awareness
- [ ] **Wedding Date Calculator**: Robust date arithmetic for timeline positioning
- [ ] **Canvas State APIs**: Store and retrieve React Flow configurations
- [ ] **Real-time Status**: Broadcasting workflow execution status
- [ ] **Performance**: Sub-500ms API response times for layout calculations
- [ ] **Security**: All endpoints authenticated with proper validation

---

**Backend Excellence: Robust services powering professional wedding workflow automation! ⚡💍**