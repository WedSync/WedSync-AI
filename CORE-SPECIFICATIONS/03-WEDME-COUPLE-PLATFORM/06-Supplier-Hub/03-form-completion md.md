# 03-form-completion.md

## What to Build

Centralized view of all supplier forms showing completion status, due dates, and progress for each vendor's requirements.

## Key Technical Requirements

### Form Tracking Schema

```
interface SupplierFormStatus {
  supplier_id: string;
  couple_id: string;
  forms: {
    form_id: string;
    form_name: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
    progress_percentage: number;
    fields_completed: number;
    total_fields: number;
    due_date?: Date;
    last_saved?: Date;
    priority: 'high' | 'medium' | 'low';
  }[];
  overall_completion: number;
  next_due: Date;
}
```

### UI Components

- Progress rings per supplier
- Expandable form list with field-level progress
- Due date calendar integration
- Quick resume for partial forms
- Bulk form actions (mark complete, request extension)
- Priority sorting with overdue alerts

## Critical Implementation Notes

- Auto-save every field change
- Show which fields are blocking completion
- Core fields auto-fill indicator
- Time estimate per form
- Mobile-optimized form completion

## Progress Calculation

```
const calculateProgress = (form: Form) => {
  const requiredFields = form.fields.filter(f => f.required);
  const completedRequired = requiredFields.filter(f => f.value !== null);
  const optionalCompleted = form.fields.filter(f => !f.required && f.value !== null);
  
  return {
    percentage: (completedRequired.length / requiredFields.length) * 100,
    blocking: requiredFields.filter(f => f.value === null),
    timeEstimate: (requiredFields.length - completedRequired.length) * 2 // mins per field
  };
};
```