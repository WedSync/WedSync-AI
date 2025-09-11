# 02-drag-drop-interface.md

## Purpose

Implement intuitive visual form building using @dnd-kit for React, enabling suppliers to create forms without technical knowledge.

## Technical Stack

- **Library**: @dnd-kit/core and @dnd-kit/sortable
- **State Management**: Zustand for form state
- **Rendering**: React 19 with TypeScript

## Canvas Architecture

### Layout Structure

- **Left Sidebar**: Field palette with categories
- **Center Canvas**: Form building area with sections
- **Right Sidebar**: Field properties panel
- **Top Bar**: Save, preview, publish actions

### Drag Sources

- Field type palette (basic, wedding, special)
- Existing fields (for duplication)
- Section containers
- Layout elements (columns, dividers)

### Drop Zones

- Between existing fields
- Empty sections
- Column containers
- Nested groups

## Interaction Patterns

### Drag Behavior

- **Activation**: 8px movement threshold
- **Preview**: Ghost element with drop indicator
- **Feedback**: Drop zone highlighting
- **Constraints**: Prevent invalid nesting
- **Auto-scroll**: Near edges of canvas

### Drop Rules

- Payment fields only in payment section
- Required fields cannot be after optional
- Conditional fields must follow trigger field
- Maximum nesting depth of 3 levels

## Visual Feedback

### States

- **Idle**: Normal field display
- **Dragging**: 50% opacity on original
- **Valid Drop**: Green highlight on zone
- **Invalid Drop**: Red highlight with reason
- **Reordering**: Blue insertion line

### Animations

- Spring physics for natural movement
- Smooth transitions on drop
- Accordion collapse for sections
- Fade in/out for field addition/removal

## Mobile Adaptations

- Touch activation with 250ms delay
- Larger drop zones (48px minimum)
- Simplified palette with categories
- Prevent accidental drags
- Haptic feedback on drop

## Performance

- Virtualize long forms (>50 fields)
- Throttle drag events
- Optimize re-renders with memo
- Defer non-critical updates
- Use CSS transforms, not position

## Accessibility

- Keyboard navigation (arrow keys)
- Screen reader announcements
- Focus management
- Skip links for sections
- Alternative text interface option