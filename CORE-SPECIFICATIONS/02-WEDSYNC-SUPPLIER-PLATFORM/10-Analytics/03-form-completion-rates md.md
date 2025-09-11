# 03-form-completion-rates.md

# Form Completion Analytics

## What to Build

Detailed analytics for form performance including field-level dropout analysis.

## Technical Requirements

- Funnel visualization per form
- Field-by-field completion tracking
- A/B testing support
- Time-to-complete metrics

## Implementation

typescript

`*// Form analytics tables*
form_analytics {
  form_id: uuid
  period: date
  views: integer
  starts: integer
  completions: integer
  avg_time_seconds: integer
  abandonment_rate: decimal
  device_breakdown: jsonb *// {mobile: 45, desktop: 55}*
}

form_field_analytics {
  form_id: uuid
  field_id: text
  field_order: integer
  interaction_count: integer
  error_count: integer
  skip_count: integer
  avg_time_seconds: integer
  dropout_rate: decimal
}

*// Tracking implementation*
const FormAnalytics = {
  trackFieldInteraction(formId, fieldId, action) {
    *// Record: focus, blur, error, skip*
  },
  
  calculateDropoff(formId) {
    *// Identify highest dropout fields// Return optimization suggestions*
  }
}`

## Critical Notes

- Track partial saves separately
- Identify problematic fields (>10% errors)
- Suggest field reordering based on dropoff
- Mobile vs desktop completion comparison