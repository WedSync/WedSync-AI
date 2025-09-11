# 01-client-list-views.md

## Purpose

Provide suppliers with flexible ways to view and organize their entire client base, supporting both visual and data-focused workflows.

## Core Requirements

### View Types

- **List View**: Traditional table format with sortable columns (couple names, wedding date, venue, status, last activity)
- **Grid View**: Visual card-based layout ideal for photographers showing couple photos
- **Calendar View**: Timeline-based organization by wedding dates
- **Kanban View**: Drag-and-drop boards organized by planning stage or status

### Essential Features

- **Search**: Real-time filtering across all client fields
- **Filters**: Status (active/past/upcoming), date ranges, tags, connection status
- **Bulk Selection**: Checkbox system for multiple client operations
- **Quick Actions**: Inline buttons for common tasks (message, edit, view)
- **Pagination**: Virtual scrolling for 100+ clients using react-window

### Data Display

- Show key metrics per client: wedding date countdown, completion percentage, last activity
- Visual indicators for WedMe connection status (🟢 connected, 🟡 invited, ⚪ not connected)
- Tag pills for quick categorization
- Responsive column widths based on content importance

## Technical Implementation

- Use Zustand for client list state management
- Implement server-side filtering for performance
- Cache views in localStorage for persistence
- Lazy load client photos in grid view
- Support keyboard navigation (j/k for up/down)

## Mobile Considerations

- Swipe actions for quick operations
- Condensed card format showing essential info only
- Bottom sheet filters instead of sidebar