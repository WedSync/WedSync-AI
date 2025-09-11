# 🎨 Journey Builder UI Style Guide
## Specialized Design System for Journey/Workflow Builder

**Version:** 1.0
**Last Updated:** 2025-01-22
**Status:** MANDATORY FOR JOURNEY BUILDER ONLY

---

## 📋 IMPORTANT NOTICE
This style guide is ONLY for the Journey Builder feature. For all other SaaS components, use the [General SaaS UI Style Guide](./SAAS-UI-STYLE-GUIDE.md).

---

## 🎯 Design Philosophy
The Journey Builder UI is inspired by workflow automation tools like make.com and n8n, providing a visual drag-and-drop interface for creating customer journeys and automations.

## 🎨 Color System

### Core Palette
```css
/* Grayscale - Untitled UI Inspired */
--gray-25: #FCFCFD;
--gray-50: #F9FAFB;
--gray-100: #F2F4F7;
--gray-200: #EAECF0;
--gray-300: #D0D5DD;
--gray-400: #98A2B3;
--gray-500: #667085;
--gray-600: #475467;
--gray-700: #344054;
--gray-800: #1D2939;
--gray-900: #101828;
--gray-950: #0C111D;

/* Primary - Wedding Elegance Purple */
--primary-600: #7F56D9;
--primary-500: #9E77ED;
--primary-400: #B692F6;

/* Node Type Colors */
--node-trigger: #7F56D9;     /* Purple - Primary actions */
--node-action: #1570EF;      /* Blue - Actions */
--node-condition: #DC6803;   /* Amber - Logic */
--node-delay: #475467;       /* Gray - Timing */
--node-email: #039855;       /* Green - Communications */
--node-sms: #2E90FA;         /* Light Blue - Messages */
--node-webhook: #9E77ED;     /* Light Purple - Integrations */
--node-filter: #F79009;      /* Orange - Filters */
--node-merge: #B692F6;       /* Light Purple - Merging */
--node-split: #F97066;       /* Red - Splitting */

/* Canvas Specific */
--canvas-bg: #FAFBFC;        /* Light grid background */
--canvas-grid: #E5E7EB;      /* Grid lines */
--connection-line: #98A2B3;  /* Default connection */
--connection-active: #7F56D9; /* Active connection */
```

## 🏗️ Component Architecture

### Canvas Layout
```typescript
interface JourneyCanvas {
  background: 'grid-pattern';
  gridSize: 20; // px
  zoom: {
    min: 0.25;
    max: 2;
    default: 1;
  };
  pannable: true;
  selectable: true;
}
```

### Node Structure
```typescript
interface JourneyNode {
  header: {
    icon: NodeTypeIcon;
    title: string;
    subtitle?: string;
    status?: 'active' | 'inactive' | 'error';
  };
  body: {
    fields: ConfigField[];
  };
  footer?: {
    stats: NodeStats[];
  };
  ports: {
    input?: boolean;
    output?: boolean;
  };
}
```

## 📦 Node Library Components

### Trigger Nodes
- **Form Submission**: When form is submitted
- **Date Trigger**: On specific date/time
- **Event Trigger**: When event occurs
- **Webhook Received**: External trigger

### Action Nodes
- **Send Email**: Email automation
- **Send SMS**: Text message
- **Update Record**: Database update
- **Create Task**: Task creation
- **Webhook Call**: External API

### Logic Nodes
- **Condition**: If/then branching
- **Split Path**: A/B testing
- **Merge Paths**: Combine flows
- **Filter**: Filter data

### Timing Nodes
- **Delay**: Wait duration
- **Schedule**: Time-based
- **Wait Until**: Conditional wait

## 🎯 Interaction Patterns

### Drag & Drop
```css
.draggable-node {
  cursor: grab;
  transition: transform 200ms;
}

.draggable-node:hover {
  transform: translateX(2px);
  border-color: var(--primary-300);
}

.draggable-node:active {
  cursor: grabbing;
  transform: scale(0.98);
}
```

### Node States
1. **Default**: Standard appearance
2. **Hover**: Elevated shadow, highlight border
3. **Selected**: Primary border, focus ring
4. **Running**: Pulsing animation
5. **Error**: Red border, error background
6. **Success**: Green indicators

### Connection Lines
- **Default**: Solid gray line with arrow
- **Active**: Animated dashed line
- **Hover**: Increased thickness
- **Error**: Red color
- **Conditional**: Split with different colors

## 🛠️ Implementation Guidelines

### Using with React Flow / XYFlow
```tsx
import { ReactFlow } from '@xyflow/react';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: {
    stroke: 'var(--connection-line)',
    strokeWidth: 2
  }
};
```

### Node Component Template
```tsx
const JourneyNode = ({ data, selected }) => {
  return (
    <div className={`journey-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      
      <div className="node-header">
        <div className="node-type-icon" style={{ background: data.color }}>
          {data.icon}
        </div>
        <div className="node-header-content">
          <div className="node-title">{data.title}</div>
          <div className="node-subtitle">{data.type}</div>
        </div>
        {data.status && <div className={`node-status ${data.status}`} />}
      </div>
      
      <div className="node-body">
        {data.fields.map(field => (
          <NodeField key={field.id} {...field} />
        ))}
      </div>
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
};
```

## 🎨 Visual Specifications

### Dimensions
- Node Width: 240px (min), 320px (max)
- Node Height: Auto (content-based)
- Port Size: 12px diameter
- Icon Size: 32px (header), 20px (inline)
- Border Radius: 10px (nodes), 6px (fields)

### Spacing
- Node Padding: 16px
- Header Padding: 12px 16px
- Field Spacing: 12px
- Canvas Padding: 80px

### Typography
- Node Title: 14px, 600 weight
- Node Subtitle: 12px, 400 weight
- Field Label: 11px, 500 weight, uppercase
- Field Value: 13px, 400 weight

### Shadows & Effects
```css
/* Node shadows */
--shadow-node: 0px 1px 2px rgba(16, 24, 40, 0.06), 
               0px 1px 3px rgba(16, 24, 40, 0.10);
--shadow-node-hover: 0px 4px 6px rgba(16, 24, 40, 0.03), 
                     0px 10px 15px rgba(16, 24, 40, 0.08);

/* Focus rings */
--focus-ring-node: 0px 0px 0px 4px rgba(158, 119, 237, 0.24);

/* Animations */
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46, 144, 250, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(46, 144, 250, 0); }
}

@keyframes flow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -10; }
}
```

## 🔧 Canvas Controls

### Toolbar Components
- **Select Tool**: For selecting nodes
- **Pan Tool**: For moving canvas
- **Zoom Controls**: +/- and percentage
- **Undo/Redo**: Action history
- **Play/Test**: Execute journey
- **Save**: Save journey

### Properties Panel
- Width: 320px
- Sections: General, Configuration, Advanced
- Field Types: Input, Select, Toggle, Textarea
- Real-time validation
- Contextual help

### Mini Map
- Position: Bottom left
- Size: 200px × 120px
- Viewport indicator
- Click to navigate

## 📊 Performance Considerations

### Optimization Guidelines
- Virtualize nodes outside viewport
- Debounce drag operations (16ms)
- Batch connection updates
- Use CSS transforms for movement
- Lazy load node configurations

### Maximum Limits
- Nodes per journey: 100
- Connections per node: 10
- Nesting depth: 5 levels
- Canvas size: 10000px × 10000px

## 🚫 DO NOT USE
- Radix UI components
- Catalyst UI components
- shadcn/ui components
- Any other UI library except for specialized journey builder needs

## 📚 Related Documentation
- [General SaaS UI Style Guide](./SAAS-UI-STYLE-GUIDE.md)
- [Forms Builder UI Guide](./FORMS-BUILDER-UI-GUIDE.md)
- [@xyflow/react Documentation](https://reactflow.dev/)
- [@dnd-kit Documentation](https://dndkit.com/)