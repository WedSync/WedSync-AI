# 06-interactive-tutorial.md

## Purpose

Guide new suppliers through initial setup with contextual, non-intrusive tutorials that ensure successful activation.

## Tutorial Architecture

### Progressive Disclosure

```
interface TutorialFlow {
  stage1: 'Essential Setup' // First login
  stage2: 'Core Features' // Day 2-7  
  stage3: 'Advanced Features' // Week 2
  stage4: 'Optimization Tips' // Week 3+
}
```

### Tutorial Components

- **Tooltips**: Hover-triggered hints
- **Spotlight**: Darkened overlay highlighting specific areas
- **Coach marks**: Numbered step indicators
- **Progress bar**: Shows completion status
- **Skip option**: Always available

## Initial Setup Flow

### Step 1: Dashboard Orientation

```
Highlight:
- Navigation menu
- Quick actions
- Activity feed
- Help button

Message: "Welcome! This is your command center"
```

### Step 2: First Form Creation

```
Actions:
1. Click 'Create Form' (pulsing button)
2. Choose template or AI generation
3. Preview form
4. Save and continue

Celebration: Confetti animation on completion
```

### Step 3: Client Import

```
Guided import:
1. Show import options
2. Help with CSV mapping
3. Validate and import
4. Show success metrics
```

### Step 4: First Invite

```
Critical moment:
1. Select imported client
2. Compose invitation
3. Send to couple
4. Show what happens next
```

## Contextual Tutorials

### Feature-Specific Guides

```
interface ContextualTutorial {
  formBuilder: ShowOnFirstAccess
  journeyCanvas: ShowOnFirstCreate
  analytics: ShowAfter7Days
  marketplace: ShowAfterFirstForm
}
```

### Smart Triggering

- New feature accessed
- Struggle detected (errors, backtracking)
- Inactivity on complex screen
- Help button clicked

## Personalization

### By Vendor Type

- Photographers: Focus on gallery, timeline features
- Venues: Emphasize capacity, calendar management
- Planners: Highlight multi-vendor coordination

### By Experience Level

```
Beginner: Detailed step-by-step
Intermediate: Feature highlights only
Advanced: Hidden unless requested
```

## Progress Tracking

### Gamification Elements

```
Setup Checklist:
✓ Create account
✓ Select vendor type
✓ Import clients
☐ Create first form
☐ Send first invite
☐ Set up automation

Reward: "Setup Champion" badge
```

### Completion Metrics

- Tutorial completion rate
- Time to complete each step
- Skip rate per step
- Help button usage

## Mobile Tutorial Adaptation

### Touch-Optimized

- Larger touch targets
- Swipe gestures for navigation
- Bottom sheet instructions
- Minimal text, more visuals

### Responsive Design

- Different flows for mobile/desktop
- Simplified steps on mobile
- Save progress across devices

## Tutorial Content Management

### A/B Testing

- Test different copy
- Vary step order
- Try different celebration moments
- Measure impact on activation

### Iteration Based on Data

- Track where users struggle
- Identify high drop-off points
- Add clarification where needed
- Remove unnecessary steps

## Critical Considerations

- Make tutorials skippable but resumable
- Don't block core functionality
- Celebrate small wins frequently
- Use real data, not dummy content
- Allow tutorial replay from settings
- Keep mobile experience in mind
- Test with actual wedding vendors