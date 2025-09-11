# 04-pain-point-wizard.md

## Overview

Vendor-specific onboarding screens that demonstrate understanding of their unique challenges and how WedSync solves them.

## Implementation Strategy

### Photography Pain Points (4 Screens)

**Screen 1: Email Chaos**

- Problem: "Still drowning in 'What time?' emails?"
- Show common repetitive questions
- Solution: "All details in one dashboard"

**Screen 2: Form Frustration**

- Problem: "PDFs getting lost in email?"
- Visual: Messy inbox screenshot
- Solution: "Drag & drop your PDF - we convert it!"

**Screen 3: Coordination Nightmare**

- Problem: "14 vendors, 200+ emails"
- Show vendor logos in chaos
- Solution: "Everyone on the same page"

**Screen 4: Time Reclaimed**

- Benefit: "Get your weekends back"
- Stats: "10+ hours saved per wedding"
- Testimonial: Real photographer quote

### DJ/Band Pain Points

- Song list management chaos
- Do-not-play list tracking
- Timeline coordination with photographer
- Equipment requirement forms

### Florist Pain Points

- Dietary/allergy tracking for centerpieces
- Venue delivery coordination
- Color/theme communication
- Order change management

## Technical Implementation

```
const painPoints = {
  photographer: ['email_chaos', 'form_friction', 'coordination', 'time'],
  dj: ['playlist_mess', 'timeline_sync', 'requests', 'setup'],
  florist: ['orders', 'delivery', 'changes', 'allergies']
}

// Track which screens resonate
// Skip option after screen 2
// Personalize based on engagement
```

## Success Metrics

- Completion rate per vendor type
- Screen-by-screen drop-off
- Time spent per screen
- Skip rate analysis