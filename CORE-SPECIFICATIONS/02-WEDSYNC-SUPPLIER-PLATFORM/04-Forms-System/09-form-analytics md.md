# 09-form-analytics.md

## What to Build

Analytics dashboard showing form performance metrics, completion rates, and field-level insights.

## Key Technical Requirements

### Metrics Collection

```
interface FormAnalytics {
  formId: string
  metrics: {
    views: number
    starts: number
    completions: number
    averageTime: number
    dropOffRate: number
    fieldErrors: Record<string, number>
  }
  funnelData: {
    fieldName: string
    dropOffCount: number
  }[]
}
```

### Analytics Queries

```
// Completion rate calculation
const getCompletionRate = async (formId: string) => {
  const { data } = await supabase
    .from('form_analytics')
    .select('starts, completions')
    .eq('form_id', formId)
    .single()
  
  return (data.completions / data.starts) * 100
}

// Field abandonment tracking
const trackFieldAbandonment = (fieldId: string) => {
  analytics.track('field_abandoned', {
    fieldId,
    timeSpent: [Date.now](http://Date.now)() - fieldStartTime,
    previousField: lastCompletedField
  })
}
```

## Critical Implementation Notes

- Track time per field for optimization insights
- Identify problematic fields (high error/abandonment)
- Compare performance across similar forms
- Generate weekly performance reports

## Database Structure

```
CREATE TABLE form_analytics (
  form_id UUID REFERENCES forms(id),
  date DATE,
  views INTEGER DEFAULT 0,
  starts INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  total_time_seconds INTEGER,
  PRIMARY KEY (form_id, date)
);
```