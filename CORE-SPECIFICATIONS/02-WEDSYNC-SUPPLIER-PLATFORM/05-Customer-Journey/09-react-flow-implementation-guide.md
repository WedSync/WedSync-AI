# WedSync Journey Builder: Complete React Flow Implementation Guide
*Consolidated guide for Claude Code Sessions A, B, C - Focus on Core Functionality*

## 🎯 Executive Summary

After systematic analysis of our requirements and 5 leading workflow platforms, this guide provides everything needed to transform our wedding journey builder from a simple visual editor into a professional workflow automation platform.

**Key Focus**: Core journey builder functionality first. Advanced features (collaboration, enterprise) come later.

## 📊 Current Status & Context

**Project**: WedSync Journey Builder (wedding vendor automation)
**Status**: 65-70% complete, Journey Builder blocking Beta Launch (Week 8)
**Technology**: @xyflow/react v12.8.3 (latest React Flow)
**Goal**: Professional workflow automation for wedding suppliers

## 🏗 Technical Architecture Overview

### Current Tech Stack (CONFIRMED CORRECT)
```typescript
"@xyflow/react": "^12.8.3",      // Main workflow library
"@xyflow/system": "^0.0.67",     // System utilities  
"@dnd-kit/core": "^6.3.1"        // Forms Builder only (NOT Journey Builder)
```

### Strategic Decision: Specialized Tools
- **React Flow**: Journey Builder (node-based workflows)
- **DND-Kit**: Forms Builder (grid-based layouts)
- **Rationale**: Different UX patterns need different solutions

### Wedding-Specific Requirements Summary
```typescript
interface WeddingJourneyRequirements {
  timeline: {
    orientation: 'horizontal'
    milestones: ['6months_before', '3months_before', '6weeks_before', 
                '1week_before', 'day_of', '1week_after', '1month_after']
    calculations: 'wedding_date_changes_cascade_all_nodes'
  }
  
  nodeTypes: {
    timeline: 'TimelineNode'           // Wedding date calculations
    modules: [                         // 7 automation types
      'EmailNode', 'SmsNode', 'FormNode', 'MeetingNode',
      'InfoNode', 'ReviewNode', 'ReferralNode'
    ]
    flow: ['StartNode', 'EndNode', 'ConditionNode', 'SplitNode']
  }
  
  execution: {
    realTime: 'live_progress_indicators'
    monitoring: 'queue_visualization'  
    analytics: 'heat_maps_and_performance_metrics'
  }
}
```

## 🔧 Critical Implementation Requirements

### 1. Timeline Layout System (NO BUILT-IN SOLUTION)
**Problem**: React Flow has NO built-in layouting
**Solution**: External layout library required

```typescript
// Wedding timeline positioning algorithm needed
const calculateWeddingTimeline = (nodes: TimelineNode[], weddingDate: Date) => {
  return nodes.map(node => {
    const offset = calculateWeddingOffset(node.timing, weddingDate)
    return {
      id: node.id,
      x: offset * TIMELINE_SCALE,           // Horizontal timeline
      y: getWeddingCategory(node) * LANE_HEIGHT  // Swim lanes
    }
  })
}

// External library options:
// - Dagre: Simple tree layouts (RECOMMENDED for timeline)
// - D3-Force: Dynamic positioning  
// - ElkJS: Most configurable but complex
```

### 2. Real-Time Execution Monitoring
```typescript
// Zustand store for execution state
interface ExecutionStore {
  nodes: Node[]
  executionStatus: Record<string, ExecutionStatus>
  
  updateNodeStatus: (nodeId: string, status: ExecutionStatus) => void
  syncSupabaseUpdates: (payload: SupabasePayload) => void
}

// Supabase realtime integration
const useExecutionSync = () => {
  useEffect(() => {
    const subscription = supabase
      .channel('journey_executions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journey_instances' },
        (payload) => updateExecutionStatus(payload.new)
      )
      .subscribe()
    return () => subscription.unsubscribe()
  }, [])
}
```

### 3. Conditional Branch Visualization  
```typescript
// Custom edge for wedding decision flows
const WeddingConditionalEdge: React.FC<EdgeProps> = ({ data, ...props }) => {
  return (
    <BaseEdge {...props}>
      <EdgeLabelRenderer>
        <div className={`wedding-branch-label ${data.pathType}`}>
          <span className="condition">{data.weddingCondition}</span>
          <span className="percentage">{data.percentage}%</span>
        </div>
      </EdgeLabelRenderer>
    </BaseEdge>
  )
}

// Wedding-specific branching logic
const weddingBranchConditions = {
  venueType: {
    condition: "client.venue.type === 'outdoor'",
    truePath: ['weather-contingency', 'tent-rental-info'],
    falsePath: ['indoor-setup-checklist']
  },
  timeline: {
    condition: "daysBetween(booking_date, wedding_date) < 60", 
    truePath: ['rush-wedding-checklist'],
    falsePath: ['standard-timeline']
  }
}
```

### 4. Wedding Timeline Business Logic
```typescript
// Wedding-specific scheduling calculations
const calculateModuleExecution = (
  timelineNode: TimelineNode,
  weddingDate: Date,
  clientData: ClientData
) => {
  // Reference point calculation
  const referenceDate = timelineNode.referencePoint === 'wedding_date' 
    ? weddingDate 
    : timelineNode.referencePoint === 'booking_date'
    ? clientData.bookingDate
    : new Date(timelineNode.fixedDate)
    
  // Apply wedding timeline offset
  const offset = timelineNode.offset
  const executionDate = addTime(referenceDate, offset.value, offset.unit, offset.direction)
  
  // Wedding industry business rules
  if (timelineNode.skipWeekends && isWeekend(executionDate)) {
    return findNextWeekday(executionDate)
  }
  
  if (hasHolidayConflict(executionDate)) {
    return findNextAvailableSlot(executionDate)
  }
  
  return executionDate
}
```

## 🚀 GAME-CHANGING INDUSTRY INSIGHTS

### Overflow UI Components (MIT License - IMMEDIATE OPPORTUNITY)
```typescript
// Ready-to-use React Flow components we can use commercially
npm install overflow-ui

import { WorkflowNode, ConditionalNode, ActionNode } from 'overflow-ui'

const WeddingJourneyCanvas = () => (
  <ReactFlow nodeTypes={{
    timeline: TimelineNode,        // Our custom wedding node
    email: ActionNode,             // From Overflow UI (MIT licensed)
    condition: ConditionalNode,    // From Overflow UI
    meeting: WorkflowNode          // From Overflow UI
  }} />
)
```

**Benefits**:
- Save 2-3 weeks of UI component development
- Professional visual design system
- Mobile responsive out-of-the-box
- Themeable for WedSync branding

### Domino's Execution Architecture Pattern
```typescript
// Revolutionary separation of concerns
interface WeddingExecutionArchitecture {
  visualLayer: 'React Flow'           // Supplier designs journey  
  executionEngine: 'Background Jobs'  // Reliable execution system
  monitoring: 'Real-time status'      // Live progress tracking
}

// Current approach (everything in React Flow)
ReactFlow → Custom execution logic → Database updates

// Industry best practice (separation of concerns) 
ReactFlow (Visual Design) → Background Job Queue → Rich Monitoring
```

**Why This Matters**:
- **Reliability**: Battle-tested execution patterns
- **Scalability**: Handle thousands of wedding journeys
- **Monitoring**: Professional-grade execution tracking
- **Debugging**: Proper error handling and logging

### Performance Optimization Patterns
```typescript
// Node virtualization for large wedding workflows
const OptimizedFlow: React.FC<FlowProps> = ({ nodes, edges }) => {
  const viewport = useViewport()
  
  const visibleNodes = useMemo(() => {
    return nodes.filter(node => 
      isNodeInViewport(node.position, viewport)
    )
  }, [nodes, viewport])
  
  return (
    <ReactFlow
      nodes={visibleNodes}
      edges={visibleEdges}
      onViewportChange={throttledViewportChange}
    />
  )
}

// Contextual detail levels
const AdaptiveWeddingNode: React.FC<NodeProps> = ({ data }) => {
  const viewport = useViewport()
  const showFullDetails = viewport.zoom > 0.8
  
  if (showFullDetails) {
    return <DetailedWeddingNodeView data={data} />
  }
  
  return <SimpleWeddingNodeView data={data} />
}
```

## 📋 Critical Files Reference

### CORE-SPECIFICATIONS (Business Requirements)
```bash
CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/05-Customer-Journey/
├── 01-journey-canvas md.md           # Canvas UX requirements
├── 02-timeline-nodes md.md           # Wedding timeline calculations  
├── 03-module-types.md                # 7 automation module types
├── 04-conditional-branching md.md    # Decision node logic
├── 07-execution-engine md.md         # Runtime requirements
└── 08-journey-analytics md.md        # Performance metrics
```

### Current Implementation (65-70% Complete)
```bash
wedsync/src/components/journey-builder/
├── JourneyCanvas.tsx                 # Main React Flow component
├── NodePalette.tsx                   # Drag & drop palette  
├── nodes/                            # 10 implemented node types
├── config/                           # Configuration panels
└── hooks/useCanvasState.ts           # State management
```

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: Core Functionality (Week 1-2)
**Priority**: Get Journey Builder working professionally

```bash
# 1. Clone and integrate Overflow UI components
git clone https://github.com/synergycodes/overflow-ui.git
npm install overflow-ui

# 2. Implement timeline layout algorithm  
npm install dagre  # For wedding timeline positioning

# 3. Enhanced state management
# Upgrade existing useCanvasState.ts with real-time patterns
```

**Key Deliverables**:
- Professional UI components from Overflow UI
- Wedding timeline layout algorithm
- Real-time execution status updates

### Phase 2: Wedding Business Logic (Week 3-4)
**Priority**: Wedding-specific functionality

```typescript
// 1. Wedding timeline calculations
// 2. Conditional branching for wedding scenarios
// 3. Module configuration for wedding automation
// 4. Analytics for wedding journey performance
```

**Key Deliverables**:
- Wedding date cascade calculations
- Venue/package/timeline conditional logic
- Wedding-specific analytics dashboard

### Phase 3: Production Ready (Week 5-8) 
**Priority**: Beta Launch readiness

```typescript
// 1. Performance optimization (100+ node workflows)
// 2. Mobile responsive wedding supplier experience
// 3. Error handling and monitoring  
// 4. Export/import journey functionality
```

**Key Deliverables**:
- Scalable performance for large workflows
- Mobile supplier app integration
- Production monitoring and error handling

## 📊 SUCCESS CRITERIA

### Technical Success
- [ ] Smooth rendering of 100+ node wedding workflows
- [ ] Wedding timeline calculations work correctly
- [ ] Real-time execution monitoring functional
- [ ] Mobile responsive for suppliers
- [ ] Professional UI using Overflow UI components

### Business Success  
- [ ] Wedding suppliers can create journeys intuitively
- [ ] Journey execution is reliable and monitored
- [ ] Analytics provide actionable wedding insights
- [ ] Journey Builder unblocks Beta Launch (Week 8)

## 🚨 CRITICAL WARNINGS

### Technical Blockers
1. **No Built-in Layout**: Must implement timeline algorithm with Dagre
2. **State Synchronization**: Careful with React Flow re-renders
3. **Performance**: Large workflows need node virtualization
4. **Wedding Logic**: Date calculations must be bulletproof

### Implementation Priorities
1. **Core Functionality First**: Basic journey creation and execution
2. **Wedding Logic**: Industry-specific business rules
3. **Professional UI**: Overflow UI components integration
4. **Performance**: Optimization for production scale

## 🔧 PRACTICAL NEXT STEPS FOR NON-DEVELOPERS

### What You Should Do Now
1. **Clone Overflow UI**: 
   ```bash
   cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/
   git clone https://github.com/synergycodes/overflow-ui.git
   ```

2. **Brief Claude Code Sessions**: Point them to this consolidated guide

3. **Focus Sessions On**:
   - Session A: Timeline layout + Overflow UI integration
   - Session B: Real-time execution monitoring
   - Session C: Wedding business logic + analytics

### What You DON'T Need To Do Yet
- Don't clone WorkflowBuilder SDK (evaluation license)
- Don't implement collaboration features
- Don't worry about enterprise features
- Don't clone other repositories yet

## 🎊 THE BIG PICTURE

**Current State**: 65-70% complete React Flow implementation
**Target State**: Professional wedding workflow automation platform
**Key Advantage**: First wedding industry-specific workflow builder
**Timeline**: Beta Launch Week 8

With this consolidated approach focusing on **core functionality first**, the Journey Builder should become the competitive advantage that differentiates WedSync in the wedding vendor market.

---

*This consolidated guide provides everything Claude Code Sessions A, B, C need to complete the Journey Builder with professional quality and wedding industry focus.*