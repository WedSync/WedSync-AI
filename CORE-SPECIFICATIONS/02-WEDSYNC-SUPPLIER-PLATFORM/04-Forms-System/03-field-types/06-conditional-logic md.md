# 06-conditional-logic.md

## Purpose

Create dynamic forms that adapt based on user responses, showing/hiding fields and sections intelligently.

## Logic Types

### Show/Hide Conditions

- **Single Condition**: If field X equals Y
- **Multiple Conditions**: AND/OR combinations
- **Range Conditions**: Between values
- **Empty/Filled**: Based on completion
- **Pattern Match**: Regex conditions

### Actions

- **Show Field**: Make visible
- **Hide Field**: Remove from view
- **Enable/Disable**: Keep visible but lock
- **Require/Optional**: Change requirement
- **Skip Section**: Jump to next relevant

## Common Patterns

### Venue-Based Logic

```
IF venue_type = "outdoor"
  SHOW weather_backup_plan
  SHOW tent_requirements  
  REQUIRE rain_date
ELSE IF venue_type = "church"
  SHOW religious_requirements
  HIDE alcohol_options
```

### Guest Count Logic

```
IF guest_count > 150
  SHOW multiple_photographers_option
  SHOW second_meal_option
  REQUIRE seating_chart
IF guest_count < 50
  HIDE cocktail_hour_section
  SHOW intimate_options
```

### Service Selection

```
IF package = "premium"
  SHOW premium_addons
  HIDE basic_options
  PREPOPULATE included_services
IF has_videographer = true
  SHOW coordination_preferences
  REQUIRE shot_list_sharing
```

## Builder Interface

### Visual Logic Builder

- **Dropdown Selectors**: Field, operator, value
- **Drag & Drop**: Reorder conditions
- **Grouping**: Nest conditions with AND/OR
- **Preview**: Test logic live

### Advanced Editor

- **Formula Bar**: Write expressions
- **Autocomplete**: Field names
- **Syntax Highlighting**: Errors clear
- **Validation**: Check logic conflicts

## Complex Scenarios

### Multi-Step Dependencies

```
Step 1: ceremony_type selection
Step 2: Based on ceremony, show relevant fields
Step 3: Based on those fields, show next level
Step 4: Calculate and show summary
```

### Cross-Field Validation

```
IF end_time < start_time
  ERROR "End time must be after start"
IF guest_count > venue_capacity
  WARNING "Exceeds venue capacity"
```

### Progressive Disclosure

```
START with basic fields
AS each section completes
  REVEAL next relevant section
END with summary of all selections
```

## Performance Considerations

### Optimization

- **Batch Updates**: Group DOM changes
- **Debounce**: Delay evaluation
- **Memoization**: Cache results
- **Lazy Evaluation**: Only check visible

### Limits

- Maximum 50 conditions per form
- Maximum 5 levels of nesting
- Maximum 10 fields per condition
- Circular dependency prevention

## User Experience

### Transitions

- **Smooth Animations**: Fade/slide effects
- **Height Transitions**: No jarring jumps
- **Focus Management**: Move to new field
- **Progress Indication**: Show what's left

### Clarity

- **Explanations**: Why fields appear
- **Breadcrumbs**: Show logic path
- **Reset Option**: Clear conditions
- **Preview Mode**: See all possible fields

## Mobile Handling

- **Simplified Logic**: Fewer conditions
- **Sequential Flow**: One decision at a time
- **Clear Indicators**: What triggered change
- **Offline Cache**: Store logic locally

## Analytics

- **Path Tracking**: Common routes
- **Drop-off Points**: Where logic confuses
- **Time Analysis**: Speed through conditions
- **Error Patterns**: Common mistakes