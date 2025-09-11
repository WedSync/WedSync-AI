# DND Kit Quick Start for WedSync

## Installation
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Basic Setup (Copy & Paste)

### 1. Minimal Draggable List
```tsx
import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Main Component
function SortableList({ items, onReorder }) {
  const [localItems, setLocalItems] = useState(items);

  function handleDragEnd(event) {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setLocalItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onReorder?.(newOrder);
        return newOrder;
      });
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={localItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {localItems.map(item => (
          <SortableItem key={item.id} id={item.id}>{item.name}</SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

// Sortable Item
function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
```

### 2. Drag Between Containers
```tsx
function DragBetweenContainers() {
  const [containers, setContainers] = useState({
    available: ['item1', 'item2', 'item3'],
    selected: [],
  });

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = over.id in containers ? over.id : findContainer(over.id);

    if (activeContainer !== overContainer) {
      setContainers(prev => {
        const activeItems = [...prev[activeContainer]];
        const overItems = [...prev[overContainer]];
        const activeIndex = activeItems.indexOf(active.id);
        
        activeItems.splice(activeIndex, 1);
        overItems.push(active.id);

        return {
          ...prev,
          [activeContainer]: activeItems,
          [overContainer]: overItems,
        };
      });
    }
  }

  function findContainer(id) {
    return Object.keys(containers).find(key => containers[key].includes(id));
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {Object.entries(containers).map(([id, items]) => (
        <DroppableContainer key={id} id={id} items={items} />
      ))}
    </DndContext>
  );
}
```

## WedSync-Specific Patterns

### Vendor Service Reordering
```tsx
const services = [
  { id: '1', name: 'Photography', price: 2500 },
  { id: '2', name: 'Videography', price: 3000 },
  { id: '3', name: 'DJ Service', price: 1500 },
];

<SortableList 
  items={services} 
  onReorder={(newOrder) => updateServiceOrder(newOrder)} 
/>
```

### Timeline Builder
```tsx
const events = [
  { id: '1', time: '10:00', title: 'Guest Arrival' },
  { id: '2', time: '10:30', title: 'Ceremony' },
  { id: '3', time: '11:30', title: 'Cocktail Hour' },
];

<DragBetweenContainers
  available={events}
  timeline={[]}
  onUpdate={(timeline) => saveTimeline(timeline)}
/>
```

### Guest Seating
```tsx
const tables = [
  { id: 'table1', name: 'Table 1', capacity: 8 },
  { id: 'table2', name: 'Table 2', capacity: 8 },
];

const guests = [
  { id: 'g1', name: 'John Doe' },
  { id: 'g2', name: 'Jane Smith' },
];

<GuestSeatingArrangement
  guests={guests}
  tables={tables}
  onUpdate={(arrangement) => saveSeatingChart(arrangement)}
/>
```

## Common Patterns

### 1. Add Drag Handle
```tsx
function ItemWithHandle({ id, children }) {
  const { attributes, listeners, setNodeRef, transform } = useSortable({ id });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform) }}>
      <span {...attributes} {...listeners}>⋮⋮</span> {/* Drag handle */}
      {children}
    </div>
  );
}
```

### 2. Disable During Action
```tsx
const [isLoading, setIsLoading] = useState(false);

<DndContext onDragEnd={handleDragEnd} {...(isLoading && { sensors: [] })}>
  {/* Content */}
</DndContext>
```

### 3. Visual Feedback
```tsx
function SortableWithFeedback({ id, children }) {
  const { isDragging, isOver } = useSortable({ id });

  return (
    <div className={`
      ${isDragging ? 'opacity-50' : ''}
      ${isOver ? 'bg-blue-50' : ''}
    `}>
      {children}
    </div>
  );
}
```

### 4. Keyboard Support
```tsx
import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(MouseSensor),
  useSensor(TouchSensor),
  useSensor(KeyboardSensor)
);

<DndContext sensors={sensors}>
```

### 5. Auto-scroll
```tsx
<DndContext autoScroll={{ enabled: true }}>
  <div style={{ height: '400px', overflow: 'auto' }}>
    {/* Scrollable content */}
  </div>
</DndContext>
```

## Styling with Tailwind

### Basic Sortable Item
```tsx
<div className="bg-white rounded-lg shadow-sm border p-4 cursor-move hover:shadow-md transition-shadow">
  {/* Content */}
</div>
```

### Droppable Zone
```tsx
<div className={`
  border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-colors
  ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}
`}>
  {items.length === 0 ? (
    <p className="text-gray-400 text-center">Drop items here</p>
  ) : (
    <div className="space-y-2">{/* Items */}</div>
  )}
</div>
```

### Drag Handle Icon
```jsx
<svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
</svg>
```

## Testing

### Basic Test Setup
```tsx
import { render, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';

test('items can be dragged', () => {
  const onReorder = jest.fn();
  const { getByText } = render(
    <DndContext>
      <YourComponent onReorder={onReorder} />
    </DndContext>
  );
  
  const item = getByText('Item 1');
  fireEvent.dragStart(item);
  fireEvent.dragEnd(item);
  
  expect(onReorder).toHaveBeenCalled();
});
```

## Performance Tips

1. **Use React.memo** for expensive items
2. **Virtualize long lists** (>100 items)
3. **Debounce onReorder callbacks**
4. **Use CSS transforms** instead of position changes
5. **Minimize re-renders** with proper state management

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Items not dragging | Check `{...attributes} {...listeners}` are spread |
| Jumpy animations | Use `CSS.Transform.toString(transform)` |
| Can't drop items | Verify `collisionDetection` is set |
| Touch not working | Add `TouchSensor` to sensors |
| Keyboard not working | Add `KeyboardSensor` with `sortableKeyboardCoordinates` |

## Next Steps

1. Check `/docs/dnd-kit-guide.md` for comprehensive documentation
2. Use components from `/docs/dnd-kit-wedsync-components.tsx`
3. Join DND Kit Slack for community support
4. Review examples at https://github.com/clauderic/dnd-kit/tree/master/stories

## Package Versions

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "@dnd-kit/modifiers": "^7.0.0"
}
```

Check npm for latest versions: `npm view @dnd-kit/core version`