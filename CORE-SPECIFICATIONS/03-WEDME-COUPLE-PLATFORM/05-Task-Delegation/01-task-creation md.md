# 01-task-creation.md

## What to Build

Build a comprehensive task creation interface where couples can define wedding day tasks for their helpers. Tasks should be categorized, timed, and include all necessary details for execution.

## Key Technical Requirements

### Database Schema

```
interface WeddingTask {
  id: string;
  couple_id: string;
  title: string;
  description: string;
  category: 'setup' | 'ceremony' | 'reception' | 'breakdown' | 'coordination';
  priority: 'critical' | 'high' | 'medium' | 'low';
  timing: {
    type: 'specific_time' | 'relative_to_event' | 'time_range';
    value: string; // '14:00' or 'ceremony-30min' or '13:00-14:00'
  };
  location: string;
  supplies_needed?: string[];
  photo_attachments?: string[];
  estimated_duration: number; // minutes
}
```

### UI Components

- Drag-and-drop task builder with pre-built templates
- Quick task templates: "Best Man Duties", "Maid of Honor Tasks"
- Timeline view showing tasks in chronological order
- Category filters with color coding
- Rich text editor for detailed instructions

## Critical Implementation Notes

- Pre-populate common tasks based on wedding type
- Allow bulk import from CSV/template library
- Validate timing conflicts when assigning tasks
- Auto-calculate setup times based on task duration
- Enable task dependencies (Task B can't start until Task A completes)

## API Structure

```
// POST /api/wedme/tasks
// GET /api/wedme/tasks/:couple_id
// PUT /api/wedme/tasks/:task_id
// DELETE /api/wedme/tasks/:task_id
// POST /api/wedme/tasks/bulk-import
```