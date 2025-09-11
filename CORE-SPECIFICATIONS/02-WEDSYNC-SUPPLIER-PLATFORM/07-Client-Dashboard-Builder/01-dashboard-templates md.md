# 01-dashboard-templates.md

## Overview

Template system for creating reusable client dashboard configurations with different layouts and content.

## Template Structure

```
interface DashboardTemplate {
  id: string
  name: string
  description: string
  sections: DashboardSection[]
  layout: 'single_column' | 'sidebar' | 'grid'
  branding: BrandingConfig
  visibility: VisibilityRules
  isDefault: boolean
}
```

## Section Types

- **Welcome**: Personalized greeting and countdown
- **Journey Progress**: Visual timeline display
- **Forms**: Pending and completed forms
- **Documents**: Contracts, guides, resources
- **FAQs**: Searchable help content
- **Articles**: Educational content
- **Progress Charts**: Post-wedding tracking
- **Activity Feed**: Recent updates

## Template Categories

### Default Template

- Applied to all new clients
- Standard section arrangement
- Basic branding

### Package-Based

```
// Different templates per service level
const templates = {
  'luxury': luxuryDashboard,
  'standard': standardDashboard,
  'budget': basicDashboard
}
```

### Venue-Specific

- Custom content for regular venues
- Venue maps and parking info
- Preferred vendor lists
- Venue-specific FAQs

## Template Assignment

```
// Auto-assignment rules
if (client.venue === 'The Barn') {
  assignTemplate('barn-venue-template')
} else if (client.package === 'premium') {
  assignTemplate('premium-template')
} else {
  assignTemplate('default')
}
```

## Cloning & Customization

- Duplicate existing templates
- Modify section arrangement
- Override content per client
- Version control