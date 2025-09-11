# 05-dashboard-tour.md

## What to Build

Interactive onboarding tour highlighting key features of the couple dashboard using a tooltip-based system.

## Tour Implementation

### Tour Steps Configuration

```
const tourSteps = [
  {
    target: '.vendor-cards',
    content: 'All your wedding vendors in one place',
    placement: 'bottom',
    spotlightPadding: 10
  },
  {
    target: '.core-fields-widget',
    content: 'Your wedding details auto-fill everywhere',
    placement: 'right',
    action: 'click' // Require interaction
  },
  {
    target: '.timeline-view',
    content: 'See what everyone needs and when',
    placement: 'top'
  },
  {
    target: '.task-list',
    content: 'Never miss important deadlines',
    placement: 'left'
  }
];
```

### Tour Controller

```
interface TourState {
  currentStep: number;
  completed: boolean;
  skipped: boolean;
  lastViewedAt: Date;
}

// Save progress to localStorage
const saveTourProgress = (state: TourState) => {
  localStorage.setItem('wedme_tour', JSON.stringify(state));
  // Also sync to database
  await updateCouplePreferences({
    tour_completed: state.completed
  });
};
```

## Visual Components

- Backdrop overlay (semi-transparent)
- Spotlight on target element
- Tooltip with next/skip buttons
- Progress dots indicator
- Pulse animation on targets

## Skip & Resume Logic

```
// Allow skip at any time
// Offer resume if incomplete
if (!tourState.completed && !tourState.skipped) {
  showToast('Continue tour where you left off?', {
    action: 'Resume Tour'
  });
}
```

## Critical Notes

- Mobile-adapted positioning
- Dismiss on outside click
- Max 5 steps (attention span)
- Re-trigger for new features