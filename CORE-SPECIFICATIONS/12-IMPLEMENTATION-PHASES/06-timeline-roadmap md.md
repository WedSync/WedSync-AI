# 06-timeline-roadmap.md

## What to Build

Detailed development timeline with milestones, dependencies, resource allocation, and go-to-market triggers for each phase.

## Overall Timeline Overview

```
interface ProjectRoadmap {
  duration: '10 months'
  phases: 5
  mvpLaunch: 'Week 4'
  publicLaunch: 'Month 3'
  breakEven: 'Month 6'
  profitability: 'Month 8'
}
```

## Phase 1: MVP Foundation (Weeks 1-4)

### Week 1-2: Infrastructure Setup

```
const week1Tasks = [
  {
    task: 'Supabase project setup',
    priority: 'critical',
    duration: '2 days',
    dependencies: [],
    deliverable: 'Auth system working'
  },
  {
    task: 'Database schema creation',
    priority: 'critical',
    duration: '3 days',
    dependencies: ['Supabase setup'],
    deliverable: 'All core tables created with RLS'
  },
  {
    task: 'Next.js project scaffold',
    priority: 'critical',
    duration: '1 day',
    dependencies: [],
    deliverable: 'Both apps running locally'
  },
  {
    task: 'CI/CD pipeline',
    priority: 'high',
    duration: '1 day',
    dependencies: ['Next.js setup'],
    deliverable: 'Auto-deploy to Vercel'
  }
]

const week2Tasks = [
  {
    task: 'Authentication flows',
    priority: 'critical',
    duration: '3 days',
    dependencies: ['Database schema'],
    deliverable: 'Login/signup working'
  },
  {
    task: 'Basic dashboard UI',
    priority: 'critical',
    duration: '2 days',
    dependencies: ['Auth'],
    deliverable: 'Supplier can see dashboard'
  }
]
```

### Week 3-4: Core Functionality

```
const week3Tasks = [
  {
    task: 'Client management CRUD',
    priority: 'critical',
    duration: '3 days',
    deliverable: 'Add/edit/delete clients'
  },
  {
    task: 'Invitation system',
    priority: 'critical',
    duration: '2 days',
    deliverable: 'Email invites working'
  }
]

const week4Tasks = [
  {
    task: 'WedMe couple dashboard',
    priority: 'critical',
    duration: '3 days',
    deliverable: 'Couples can connect'
  },
  {
    task: 'MVP testing & fixes',
    priority: 'high',
    duration: '2 days',
    deliverable: 'Stable MVP'
  }
]
```

### Milestone: Alpha Launch

- **Date**: End of Week 4
- **Users**: 10 friendly photographers
- **Success Criteria**: Can add clients and send invites

## Phase 2: Core Features (Weeks 5-8)

### Week 5-6: Forms System

```
const formsDevelopment = {
  week5: [
    'Form builder UI with dnd-kit',
    'Field types implementation',
    'Form preview system',
    'Database schema for forms'
  ],
  week6: [
    'AI form generation (OpenAI)',
    'PDF import system',
    'Core fields mapping',
    'Form responses handling'
  ],
  deliverables: {
    formsCreated: 'Suppliers can build forms',
    aiWorking: 'Generate form from description',
    coreFields: 'Auto-population working'
  }
}
```

### Week 7-8: Journey Builder & Import

```
const journeyDevelopment = {
  week7: [
    'Visual journey canvas (React Flow)',
    'Email node implementation',
    'Wait/condition nodes',
    'Journey execution engine'
  ],
  week8: [
    'CSV client import',
    'Basic activity tracking',
    'Dashboard analytics widgets',
    'Real-time updates'
  ]
}
```

### Milestone: Beta Launch

- **Date**: End of Week 8
- **Users**: 50 photographers + venues
- **Success Criteria**: Forms and journeys working end-to-end

## Phase 3: Automation (Weeks 9-12)

### Week 9-10: Communications

```
const communicationsRoadmap = {
  week9: [
    'SMS/WhatsApp setup UI',
    'Twilio integration',
    'Message templates',
    'Delivery tracking'
  ],
  week10: [
    'Calendar integration',
    'Meeting scheduler UI',
    'Availability management',
    'Booking confirmations'
  ]
}
```

### Week 11-12: Growth Features

```
const growthFeatures = {
  week11: [
    'Review collection system',
    'Review request automation',
    'Platform integrations (Google, Facebook)'
  ],
  week12: [
    'Referral program builder',
    'Tracking & analytics',
    'Reward management',
    'Landing pages'
  ]
}
```

### Milestone: Public Launch

- **Date**: End of Week 12 (Month 3)
- **Marketing**: ProductHunt, wedding forums
- **Target**: 200 suppliers in first week

## Phase 4: Marketplace (Months 4-6)

### Month 4: Infrastructure

```
Week 13-14:
  - Stripe Connect integration
  - Template packaging system
  - Purchase flow implementation
  - Creator onboarding

Week 15-16:
  - Quality control system
  - Review & rating system
  - Search & discovery
  - Template installation
```

### Month 5: Creator Tools

```
Week 17-18:
  - Template builder studio
  - Documentation system
  - Version control
  - Analytics dashboard

Week 19-20:
  - Marketing tools for creators
  - Promotional system
  - Featured templates
  - Success stories
```

### Month 6: Optimization

```
Week 21-24:
  - Search optimization
  - Recommendation engine
  - A/B testing framework
  - Performance improvements
```

### Milestone: Marketplace Launch

- **Date**: End of Month 6
- **Creators**: 50 verified creators
- **Templates**: 200+ templates
- **Revenue Target**: $10k GMV first month

## Phase 5: Scale (Months 7-10)

### Month 7-8: Directory & Teams

```
Month 7:
  - Directory infrastructure
  - Search & filters
  - Profile creation
  - Lead management

Month 8:
  - Team management system
  - Permission controls
  - Activity logging
  - Collaboration features
```

### Month 9-10: Enterprise & International

```
Month 9:
  - Advanced analytics
  - Predictive models
  - White-label options
  - SSO implementation

Month 10:
  - International payments
  - Multi-language support
  - Regional compliance
  - Global CDN
```

### Milestone: Series A Ready

- **Date**: End of Month 10
- **MRR**: $100k+
- **Suppliers**: 2,000+
- **Couples**: 10,000+

## Resource Allocation

```
const teamStructure = {
  phase1_2: {
    developers: 1, // You
    designer: 0.5, // Part-time/contract
    marketing: 0
  },
  phase3: {
    developers: 2, // Hire junior dev
    designer: 0.5,
    marketing: 0.5 // Start content
  },
  phase4_5: {
    developers: 3, // Add senior dev
    designer: 1, // Full-time
    marketing: 1, // Full-time
    support: 1 // Customer success
  }
}
```

## Go-to-Market Triggers

### Soft Launch (Week 4)

- Personal network only
- Manual onboarding
- Gather feedback
- Fix critical bugs

### Beta Launch (Week 8)

- Wedding photographer groups
- Facebook communities
- Free tier emphasis
- Case studies from alpha users

### Public Launch (Month 3)

- ProductHunt launch
- Wedding blog outreach
- Paid ads (Facebook, Google)
- Influencer partnerships

### Scale Campaign (Month 6)

- Industry conferences
- Partnership announcements
- Success stories PR
- Affiliate program

## Risk Mitigation Timeline

```
const risks = [
  {
    risk: 'Low supplier adoption',
    mitigation: 'Extended free trial (30 days)',
    triggerWeek: 8
  },
  {
    risk: 'Couples not connecting',
    mitigation: 'Incentive program for suppliers',
    triggerWeek: 12
  },
  {
    risk: 'Marketplace low quality',
    mitigation: 'Curated launch with verified creators',
    triggerMonth: 4
  },
  {
    risk: 'Technical scaling issues',
    mitigation: 'Move to dedicated infrastructure',
    triggerMonth: 6
  }
]
```

## Budget Allocation

```
const monthlyBudget = {
  months1_3: {
    infrastructure: 500, // Supabase, Vercel, domains
    tools: 200, // OpenAI, monitoring
    marketing: 0,
    salaries: 0, // Bootstrapped
    total: 700
  },
  months4_6: {
    infrastructure: 1000,
    tools: 500,
    marketing: 2000, // Ads, content
    salaries: 5000, // Junior dev
    total: 8500
  },
  months7_10: {
    infrastructure: 2000,
    tools: 1000,
    marketing: 5000,
    salaries: 25000, // Full team
    total: 33000
  }
}
```

## Success Metrics by Phase

### Phase 1 (MVP)

- 10 suppliers signed up
- 5 couples connected
- System stable

### Phase 2 (Core)

- 100 suppliers signed up
- 50% create forms
- 30% use journeys

### Phase 3 (Automation)

- 500 suppliers signed up
- 200 couples connected
- First revenue ($1k MRR)

### Phase 4 (Marketplace)

- 1,000 suppliers
- 50 marketplace creators
- $10k MRR

### Phase 5 (Scale)

- 2,000+ suppliers
- 500+ paying customers
- $50k+ MRR
- Series A ready

## Critical Path Dependencies

```
graph LR
  A[Auth System] --> B[Dashboard]
  B --> C[Client Mgmt]
  C --> D[Forms]
  D --> E[Journeys]
  E --> F[Automation]
  F --> G[Marketplace]
  G --> H[Scale]
  
  D --> I[AI Integration]
  C --> J[Core Fields]
  J --> D
```

## Pivot Points

Evaluate and potentially pivot at:

1. **Week 8**: If supplier adoption <50, pivot to different vendor type
2. **Month 3**: If viral coefficient <1.5, adjust invitation mechanics
3. **Month 6**: If marketplace GMV <$5k, focus on SaaS only
4. **Month 9**: If churn >10%, pause new features for retention focus

This roadmap provides clear milestones while maintaining flexibility to adjust based on market feedback and growth metrics.