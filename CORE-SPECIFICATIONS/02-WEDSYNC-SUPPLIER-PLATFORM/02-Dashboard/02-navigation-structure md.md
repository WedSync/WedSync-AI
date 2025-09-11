# 02-navigation-structure.md

## Purpose

Define the hierarchical menu system that allows suppliers to access all platform features intuitively.

## Key Implementation Requirements

### Top-Level Navigation

```
1. Dashboard (Home icon)
2. Clients (People icon)
3. Forms (Document icon)  
4. Journeys (Flow icon)
5. Communications (Message icon)
6. Growth (Chart icon)
```

### Navigation Behavior

- **Persistent visibility**: Top nav always visible
- **Active state indication**: Clear visual feedback for current section
- **Breadcrumb trail**: For deep navigation paths
- **Keyboard navigation**: Tab through main sections

### Contextual Menus

Each main section has a contextual sidebar:

- Clients → All, Active, Upcoming, Past, Import
- Forms → My Forms, Create, Responses, Templates
- Journeys → Canvas, Active, Draft, Analytics

### Mobile Navigation

- Bottom tab bar with 5 main sections
- "More" menu for secondary features
- Gesture support for section switching
- Collapsible headers on scroll

### Progressive Disclosure

- Lock icons for features above current tier
- "Coming Soon" badges for future features
- Tooltips explaining locked features
- Upgrade prompts at natural points

### Search Integration

- Universal search across all sections
- Recent searches persistence
- Quick jumps to common areas
- Fuzzy matching for typos

## Critical Success Factors

- Maximum 3 clicks to any feature
- Consistent navigation patterns throughout
- Clear tier-based feature visibility
- Mobile navigation equally functional