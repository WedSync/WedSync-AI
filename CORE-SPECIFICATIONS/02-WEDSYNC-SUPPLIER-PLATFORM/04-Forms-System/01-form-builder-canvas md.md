# 01-form-builder-canvas.md

## Overview

Visual drag-and-drop interface for creating forms with responsive grid layout and real-time preview.

## Canvas Architecture

### Layout System

- **Grid**: 1-4 columns responsive
- **Sections**: Collapsible groups of fields
- **Breakpoints**: Mobile-first responsive design
- **Auto-flow**: Smart field arrangement

### Component Structure

```
interface FormCanvas {
  sections: FormSection[]
  settings: FormSettings
  preview: PreviewMode
}

interface FormSection {
  id: string
  title: string
  description?: string
  columns: 1 | 2 | 3 | 4
  fields: FormField[]
  collapsed: boolean
}
```

## Drag & Drop Implementation

### Using dnd-kit

```
// Three drop zones:
// 1. Field Palette (source)
// 2. Canvas (destination)
// 3. Trash (delete)

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor) // Accessibility
)
```

### Drag Behaviors

- **Field to Canvas**: Create new instance
- **Within Canvas**: Reorder fields
- **Between Sections**: Move fields
- **To Trash**: Delete with confirmation

## Visual Feedback

- Ghost preview while dragging
- Drop zone highlighting
- Invalid drop indicators
- Auto-scroll near edges

## Field Palette Organization

- **Basic**: Text, email, phone, number
- **Wedding**: Date, venue, guests, budget
- **Media**: Photo upload, signature
- **Advanced**: Matrix, repeater, conditional

## Canvas Features

- Undo/Redo (Ctrl+Z/Y)
- Copy/Paste fields
- Duplicate sections
- Keyboard navigation
- Real-time validation preview