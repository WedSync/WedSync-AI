# DND Kit Complete Guide for WedSync

## Overview
@dnd-kit is a lightweight, modular, performant, accessible and extensible drag & drop toolkit for React with zero dependencies. This guide covers everything needed to implement drag-and-drop functionality in the WedSync project.

## 🔌 MCP Server Integration
The dnd-kit GitHub repository is now accessible through MCP (Model Context Protocol), providing Claude Code with direct access to the source code and examples for accurate implementation.

### MCP Configuration
```json
{
  "mcpServers": {
    "dnd-kit Docs": {
      "url": "https://gitmcp.io/clauderic/dnd-kit"
    }
  }
}
```

### When to Use MCP Server
- **Building Features**: Reference actual source code for correct prop types and patterns
- **Debugging Issues**: Check repository examples for proper usage
- **Complex Implementations**: Access advanced examples directly from the repo
- **Performance Optimization**: Review optimized patterns in the source

### MCP Usage Benefits
1. **Accurate Implementation**: Direct access to source ensures correct API usage
2. **Up-to-date Patterns**: Always references the latest code patterns
3. **Complete Examples**: Access to all repository examples and tests
4. **Type Safety**: Verify TypeScript interfaces directly from source

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [Core Concepts](#core-concepts)
3. [Basic Implementation](#basic-implementation)
4. [Sortable Lists](#sortable-lists)
5. [WedSync Use Cases](#wedsync-use-cases)
6. [Advanced Features](#advanced-features)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Installation & Setup

### Core Installation
```bash
# Install core library
npm install @dnd-kit/core

# Install peer dependencies (if not already installed)
npm install react react-dom

# Optional: Install sortable preset for list sorting
npm install @dnd-kit/sortable

# Optional: Install modifiers for advanced features
npm install @dnd-kit/modifiers

# Optional: Install utilities
npm install @dnd-kit/utilities
```

### TypeScript Support
DND Kit includes TypeScript definitions out of the box. No additional @types packages needed.

---

## Core Concepts

### 1. DndContext
The root provider that manages all drag and drop interactions.

```jsx
import { DndContext } from '@dnd-kit/core';

function App() {
  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* Your draggable and droppable components */}
    </DndContext>
  );
}
```

### 2. Draggable
Items that can be dragged.

```jsx
import { useDraggable } from '@dnd-kit/core';

function DraggableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
```

### 3. Droppable
Areas where items can be dropped.

```jsx
import { useDroppable } from '@dnd-kit/core';

function DroppableArea({ id, children }) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  const style = {
    backgroundColor: isOver ? '#f0f0f0' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}
```

### 4. Sensors
Detect different input methods (mouse, touch, keyboard).

```jsx
import {
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

function App() {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Drag must move 8px to activate
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Touch must be held for 200ms
        tolerance: 5, // Can move 5px during delay
      },
    }),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext sensors={sensors}>
      {/* Content */}
    </DndContext>
  );
}
```

---

## Basic Implementation

### Simple Drag and Drop Example
```jsx
import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

function SimpleExample() {
  const [isDropped, setIsDropped] = useState(false);

  function handleDragEnd(event) {
    if (event.over && event.over.id === 'droppable') {
      setIsDropped(true);
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {!isDropped ? <DraggableItem /> : null}
      <DroppableZone>
        {isDropped ? <DraggableItem /> : 'Drop here'}
      </DroppableZone>
    </DndContext>
  );
}

function DraggableItem() {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'draggable',
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      Drag me
    </button>
  );
}

function DroppableZone({ children }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'droppable',
  });

  const style = {
    padding: '20px',
    backgroundColor: isOver ? '#e0e0e0' : '#f5f5f5',
    border: '2px dashed #ccc',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}
```

---

## Sortable Lists

### Basic Sortable List
```jsx
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableList() {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items}
        strategy={verticalListSortingStrategy}
      >
        {items.map(id => <SortableItem key={id} id={id} />)}
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {id}
    </div>
  );
}
```

---

## WedSync Use Cases

### 1. Vendor Service Ordering
Reorder services offered by vendors (e.g., photography packages).

```jsx
function VendorServiceList({ services, onReorder }) {
  const [items, setItems] = useState(services);

  function handleDragEnd(event) {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      setItems(newOrder);
      onReorder(newOrder);
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(s => s.id)}>
        {items.map(service => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### 2. Wedding Timeline Builder
Drag and drop to create and organize wedding day timeline.

```jsx
function TimelineBuilder({ events }) {
  const [timeline, setTimeline] = useState([]);
  const [availableEvents, setAvailableEvents] = useState(events);

  function handleDragEnd(event) {
    const { active, over } = event;
    
    if (over && over.id === 'timeline') {
      // Add event to timeline
      const draggedEvent = availableEvents.find(e => e.id === active.id);
      setTimeline([...timeline, draggedEvent]);
      setAvailableEvents(availableEvents.filter(e => e.id !== active.id));
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        <div className="flex-1">
          <h3>Available Events</h3>
          {availableEvents.map(event => (
            <DraggableEvent key={event.id} event={event} />
          ))}
        </div>
        <TimelineDropZone id="timeline" events={timeline} />
      </div>
    </DndContext>
  );
}
```

### 3. Guest Seating Arrangement
Drag guests to assign them to tables.

```jsx
function SeatingArrangement({ guests, tables }) {
  const [seatingPlan, setSeatingPlan] = useState(
    tables.reduce((acc, table) => ({
      ...acc,
      [table.id]: []
    }), { unassigned: guests })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    
    if (!over) return;

    const guestId = active.id;
    const fromTable = Object.keys(seatingPlan).find(
      tableId => seatingPlan[tableId].some(g => g.id === guestId)
    );
    const toTable = over.id;

    if (fromTable !== toTable) {
      const guest = seatingPlan[fromTable].find(g => g.id === guestId);
      
      setSeatingPlan({
        ...seatingPlan,
        [fromTable]: seatingPlan[fromTable].filter(g => g.id !== guestId),
        [toTable]: [...seatingPlan[toTable], guest]
      });
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {tables.map(table => (
          <TableDropZone
            key={table.id}
            table={table}
            guests={seatingPlan[table.id]}
          />
        ))}
      </div>
      <div>
        <h3>Unassigned Guests</h3>
        {seatingPlan.unassigned.map(guest => (
          <DraggableGuest key={guest.id} guest={guest} />
        ))}
      </div>
    </DndContext>
  );
}
```

### 4. Photo Gallery Organization
Organize and categorize wedding photos.

```jsx
function PhotoGalleryOrganizer({ photos, categories }) {
  const [organizedPhotos, setOrganizedPhotos] = useState(
    categories.reduce((acc, cat) => ({
      ...acc,
      [cat.id]: []
    }), { uncategorized: photos })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    
    if (!over) return;

    const photoId = active.id;
    const fromCategory = Object.keys(organizedPhotos).find(
      catId => organizedPhotos[catId].some(p => p.id === photoId)
    );
    const toCategory = over.id;

    if (fromCategory !== toCategory) {
      const photo = organizedPhotos[fromCategory].find(p => p.id === photoId);
      
      setOrganizedPhotos({
        ...organizedPhotos,
        [fromCategory]: organizedPhotos[fromCategory].filter(p => p.id !== photoId),
        [toCategory]: [...organizedPhotos[toCategory], photo]
      });
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {categories.map(category => (
        <CategoryDropZone
          key={category.id}
          category={category}
          photos={organizedPhotos[category.id]}
        />
      ))}
    </DndContext>
  );
}
```

---

## Advanced Features

### 1. Drag Overlay
Show a custom preview while dragging.

```jsx
import { DragOverlay } from '@dnd-kit/core';

function AppWithOverlay() {
  const [activeId, setActiveId] = useState(null);

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    setActiveId(null);
    // Handle drop logic
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Your components */}
      <DragOverlay>
        {activeId ? <ItemPreview id={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### 2. Multiple Containers
Support dragging between different containers.

```jsx
function MultiContainerExample() {
  const [containers, setContainers] = useState({
    container1: ['item1', 'item2'],
    container2: ['item3', 'item4'],
    container3: ['item5', 'item6'],
  });

  function handleDragEnd(event) {
    const { active, over } = event;
    
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id) || over.id;

    if (activeContainer !== overContainer) {
      setContainers(containers => {
        const activeItems = containers[activeContainer];
        const overItems = containers[overContainer];
        const activeIndex = activeItems.indexOf(active.id);
        const overIndex = overItems.indexOf(over.id);

        return {
          ...containers,
          [activeContainer]: activeItems.filter(item => item !== active.id),
          [overContainer]: [
            ...overItems.slice(0, overIndex),
            active.id,
            ...overItems.slice(overIndex)
          ]
        };
      });
    }
  }

  function findContainer(id) {
    if (id in containers) {
      return id;
    }

    return Object.keys(containers).find(key =>
      containers[key].includes(id)
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {Object.keys(containers).map(containerId => (
        <Container
          key={containerId}
          id={containerId}
          items={containers[containerId]}
        />
      ))}
    </DndContext>
  );
}
```

### 3. Auto-scroll
Enable auto-scrolling when dragging near container edges.

```jsx
import { AutoScrollActivator } from '@dnd-kit/core';

function ScrollableList() {
  return (
    <DndContext
      autoScroll={{
        enabled: true,
        activationConstraint: {
          y: { startDelta: 10, endDelta: 10 },
          x: { startDelta: 10, endDelta: 10 }
        }
      }}
    >
      <div style={{ height: '400px', overflow: 'auto' }}>
        {/* Scrollable content */}
      </div>
    </DndContext>
  );
}
```

### 4. Collision Detection Algorithms
Choose the best algorithm for your use case.

```jsx
import {
  closestCenter,     // Default, works well for most cases
  closestCorners,    // Good for grid layouts
  rectIntersection,  // Simple rectangle intersection
  pointerWithin,     // Requires pointer to be within droppable
} from '@dnd-kit/core';

<DndContext collisionDetection={closestCorners}>
  {/* Content */}
</DndContext>
```

### 5. Modifiers
Apply constraints and modifications to drag behavior.

```jsx
import { restrictToWindowEdges, restrictToParentElement } from '@dnd-kit/modifiers';

<DndContext modifiers={[restrictToWindowEdges]}>
  {/* Content */}
</DndContext>
```

---

## Best Practices

### 1. Performance Optimization
```jsx
// Use React.memo for expensive components
const SortableItem = React.memo(({ id, data }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      {/* Content */}
    </div>
  );
});

// Use stable references for event handlers
const handleDragEnd = useCallback((event) => {
  // Handle drag end
}, [dependencies]);
```

### 2. Accessibility
```jsx
// Provide keyboard navigation
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

// Add ARIA labels
<div
  {...attributes}
  {...listeners}
  role="button"
  aria-roledescription="sortable"
  aria-describedby={`${id}-description`}
>
  {/* Content */}
</div>
```

### 3. State Management
```jsx
// Use immutable updates
function handleDragEnd(event) {
  setItems(items => {
    const newItems = [...items];
    // Modify newItems
    return newItems;
  });
}

// Consider using a state management library for complex cases
// Redux, Zustand, or Context API for shared state
```

### 4. Error Handling
```jsx
function handleDragEnd(event) {
  try {
    const { active, over } = event;
    
    if (!over || !active) {
      console.warn('Invalid drag operation');
      return;
    }
    
    // Handle drag logic
  } catch (error) {
    console.error('Error during drag operation:', error);
    // Show user feedback
  }
}
```

### 5. Testing
```jsx
// Test drag and drop functionality
import { render, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';

test('items can be reordered', () => {
  const { getByText } = render(
    <DndContext>
      <SortableList items={['Item 1', 'Item 2']} />
    </DndContext>
  );
  
  // Test drag interactions
  const item1 = getByText('Item 1');
  fireEvent.dragStart(item1);
  // ... continue test
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Items not dragging
```jsx
// Ensure you're spreading listeners and attributes
<div ref={setNodeRef} {...listeners} {...attributes}>
  {/* Content */}
</div>

// Check sensor configuration
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Reduce if too high
    },
  })
);
```

#### 2. Transform not applying
```jsx
// For useDraggable
const style = transform ? {
  transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
} : undefined;

// For useSortable (use CSS utility)
import { CSS } from '@dnd-kit/utilities';

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
};
```

#### 3. Items jumping during drag
```jsx
// Use DragOverlay for smooth dragging
<DragOverlay>
  {activeId ? <ItemPreview id={activeId} /> : null}
</DragOverlay>

// Hide original item while dragging
const style = {
  opacity: isDragging ? 0.5 : 1,
};
```

#### 4. Collision detection issues
```jsx
// Try different algorithms
import { closestCenter, closestCorners, rectIntersection } from '@dnd-kit/core';

// Use closestCorners for grid layouts
<DndContext collisionDetection={closestCorners}>
```

#### 5. Memory leaks
```jsx
// Clean up event listeners
useEffect(() => {
  return () => {
    // Cleanup code if needed
  };
}, []);

// Use proper dependencies in hooks
const handleDragEnd = useCallback((event) => {
  // Handler logic
}, [/* dependencies */]);
```

### Debug Mode
```jsx
// Enable debug logging
function DebugDndContext({ children }) {
  function handleDragStart(event) {
    console.log('Drag Start:', event);
  }

  function handleDragMove(event) {
    console.log('Drag Move:', event);
  }

  function handleDragEnd(event) {
    console.log('Drag End:', event);
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
```

---

## Resources

### Official Documentation
- Main Docs: https://docs.dndkit.com
- GitHub: https://github.com/clauderic/dnd-kit
- Examples: https://examples.dndkit.com (Note: May redirect to Chromatic)

### Community
- Slack: https://dnd-kit.slack.com
- GitHub Discussions: Available on the GitHub repository

### Related Packages
- @dnd-kit/core - Core functionality
- @dnd-kit/sortable - Sortable preset
- @dnd-kit/modifiers - Drag modifiers
- @dnd-kit/utilities - Utility functions
- @dnd-kit/accessibility - Accessibility utilities

### Version Information
- Latest stable: Check npm for latest version
- Development: Install with @next tag for preview features

---

## Quick Reference

### Essential Imports
```jsx
// Core
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';

// Sortable
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';

// Sensors
import { MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';

// Utilities
import { CSS } from '@dnd-kit/utilities';

// Collision Detection
import { closestCenter, closestCorners, rectIntersection } from '@dnd-kit/core';

// Modifiers
import { restrictToWindowEdges, restrictToParentElement } from '@dnd-kit/modifiers';
```

### Hook Returns
```jsx
// useDraggable returns:
{
  attributes,     // Accessibility attributes
  listeners,      // Event listeners
  setNodeRef,     // Ref callback
  transform,      // Current transform
  isDragging,     // Boolean flag
  node,          // DOM node reference
  over,          // Current droppable
}

// useDroppable returns:
{
  setNodeRef,    // Ref callback
  isOver,        // Boolean flag
  node,          // DOM node reference
  active,        // Active draggable
  over,          // Over data
  rect,          // Bounding rect
}

// useSortable returns:
{
  attributes,    // Accessibility attributes
  listeners,     // Event listeners
  setNodeRef,    // Ref callback
  transform,     // Current transform
  transition,    // CSS transition
  isDragging,    // Boolean flag
  isSorting,     // Boolean flag
  node,          // DOM node reference
  over,          // Current droppable
}
```

---

## Migration from Other Libraries

### From react-beautiful-dnd
Key differences:
- DND Kit uses hooks instead of render props
- More granular control over drag behavior
- Better TypeScript support
- Supports multiple input methods by default

### From react-dnd
Key differences:
- Simpler API with less boilerplate
- No HTML5 backend configuration needed
- Built-in touch support
- Better performance with large lists

---

This documentation should provide the WedSync team with everything needed to implement drag-and-drop functionality effectively using DND Kit.