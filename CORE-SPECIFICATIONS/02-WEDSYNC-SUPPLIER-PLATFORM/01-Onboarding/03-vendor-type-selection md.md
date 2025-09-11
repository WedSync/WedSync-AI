# 03-vendor-type-selection.md

## Purpose

Capture supplier category to provide tailored onboarding experience and industry-specific features.

## Vendor Categories

### Primary Categories

```
type VendorType = 
  | 'photographer'
  | 'videographer'
  | 'venue'
  | 'caterer'
  | 'florist'
  | 'dj_band'
  | 'planner'
  | 'beauty'
  | 'other'
```

### Category-Specific Features

- **Photographers**: Shot list organizer, timeline calculator, gallery integration
- **Venues**: Capacity management, floor plans, preferred vendor lists
- **Caterers**: Dietary matrix, portion calculator, menu builder
- **Florists**: Seasonal availability, color palette tools
- **DJs/Bands**: Music library, do-not-play lists, equipment specs
- **Planners**: Multi-vendor coordination, master timeline

## UI Implementation

### Selection Screen Design

```
- Visual grid layout (3x3)
- Icon + label for each type
- Hover effects showing key features
- "Other" option with text input
- No back button (reduce friction)
```

### Post-Selection Actions

1. Set default form templates
2. Configure dashboard widgets
3. Customize terminology
4. Pre-select relevant features
5. Show targeted pain points

## Data Collection

### Additional Context

```
interface VendorProfile {
  type: VendorType
  subType?: string // e.g., 'documentary' for photographer
  businessSize: 'solo' | 'team' | 'company'
  experienceYears: number
  averageWeddingsPerYear: number
}
```

## Customization Effects

### Dashboard Customization

- Show relevant metrics first
- Industry-specific quick actions
- Targeted help content
- Specialized terminology

### Form Templates

- Pre-load industry forms
- Relevant field types
- Common questions included
- Compliance fields (food safety for caterers)

### Journey Templates

- Timeline adjusted to service type
- Relevant touchpoints
- Industry-standard sequences

## Progressive Disclosure

### Immediate Capture

- Just vendor type initially
- Business name (optional)
- Skip everything else

### Delayed Capture (Post-activation)

- Team size
- Service areas
- Pricing tiers
- Specializations

## Critical Considerations

- Make selection visual and quick
- Allow changing type later
- Don't overwhelm with subcategories
- Use selection for personalization immediately
- Track most popular categories for optimization