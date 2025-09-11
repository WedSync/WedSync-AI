# WedSync/WedMe Demo Suite Product Specification

## Executive Summary

The Demo Suite is a fully-functional, pre-populated demonstration environment showcasing the WedSync (supplier) and WedMe (couple) platforms with realistic wedding industry data, media assets, and interconnected user accounts for sales demos, onboarding, and testing purposes.

## 1. Demo Account Architecture

### 1.1 Supplier Accounts (WedSync Platform)

#### Account Structure
```typescript
interface DemoSupplier {
  id: string
  email: string // format: {company}@demo.wedsync.ai
  businessName: string
  vendorType: VendorType
  logo: string // Supabase storage URL
  tier: 'professional' | 'scale' // Show different feature sets
  isDemoAccount: true
  resetSchedule: 'nightly' | 'weekly'
  createdAt: Date
  lastResetAt: Date
}
```

#### Required Demo Suppliers
| Business Name | Type | Email | Features Highlighted |
|--------------|------|-------|---------------------|
| Sky Lens Studios | Photographer | skylens@demo.wedsync.ai | Forms, Timeline, Gallery |
| Golden Frame Films | Videographer | goldenframe@demo.wedsync.ai | Client Portal, Reviews |
| The Oak Barn | Venue | oakbarn@demo.wedsync.ai | Calendar, Capacity Management |
| Wild Ivy Flowers | Florist | wildivy@demo.wedsync.ai | Inventory, Seasonal Planning |
| Spin & Spark Entertainment | DJ | spinspark@demo.wedsync.ai | Music Library, Timeline |
| Fork & Flame Catering | Caterer | forkflame@demo.wedsync.ai | Dietary Matrix, Menus |
| Velvet & Vows Events | Planner | velvetvows@demo.wedsync.ai | Multi-vendor Coordination |

### 1.2 Couple Accounts (WedMe Platform)

#### Account Structure
```typescript
interface DemoCouple {
  id: string
  partner1Name: string
  partner2Name: string
  email: string // format: {names}@demo.wedme.app
  profilePhoto: string // Supabase storage URL
  weddingDate: Date
  venue: DemoSupplier // Linked venue
  guestCount: number
  connectedSuppliers: DemoSupplier[]
  planningProgress: number // 0-100%
}
```

#### Required Demo Couples
| Couple Names | Wedding Date | Venue | Guest Count | Planning Stage |
|-------------|--------------|-------|-------------|----------------|
| Emily & Jack Harper | June 15, 2025 | The Oak Barn | 120 | 75% Complete |
| Sophia & Liam Bennett | September 21, 2025 | The Oak Barn | 85 | 40% Complete |

## 2. Data Seeding Requirements

### 2.1 Timeline & Activity Data

Each supplier-couple relationship must include:

```typescript
interface SupplierCoupleData {
  // Forms
  forms: {
    completed: 3-5 forms with realistic responses
    pending: 1-2 forms awaiting completion
    drafts: 1 form in progress
  }
  
  // Communication
  messages: {
    threads: 2-3 conversation threads
    totalMessages: 15-30 messages
    lastActivity: within 48 hours
  }
  
  // Documents
  documents: {
    contracts: 1 signed PDF
    guides: 2-3 informational PDFs
    invoices: 1-2 payment documents
  }
  
  // Timeline Events
  timeline: {
    past: 5-10 completed milestones
    upcoming: 3-5 future events
    todayHighlight: 1 event for "today"
  }
  
  // Reviews
  reviews: {
    submitted: 0-1 (only for past weddings)
    rating: 4-5 stars
    testimonial: 50-100 words
  }
}
```

### 2.2 Customer Journey Automation

Pre-configured journey examples:
- **Photographer Journey**: 12-node onboarding → wedding → delivery
- **Venue Journey**: Inquiry → tour → booking → planning → event
- **Planner Journey**: Complex multi-branch journey with conditions

### 2.3 Analytics Data

Historical data spanning 12 months:
- Daily activity metrics
- Form completion rates (65-85%)
- Email open rates (45-75%)
- Response times (2-24 hours)
- Seasonal booking patterns

## 3. Media Assets Specification

### 3.1 Logo Generation
```typescript
interface LogoAsset {
  supplier: string
  dimensions: '200x200' | '400x100' // Square or horizontal
  format: 'svg' | 'png'
  style: 'modern' | 'classic' | 'elegant'
  colorScheme: string[] // Brand colors
  storage: `logos/${supplier_id}/logo.{format}`
}
```

### 3.2 Profile Photos
```typescript
interface ProfilePhoto {
  couple: string
  dimensions: '400x400'
  source: 'generated' | 'stock'
  url: string // Unsplash or AI-generated
  storage: `profiles/${couple_id}/photo.jpg`
}
```

### 3.3 Document Templates
Pre-loaded PDFs for each supplier type:
- Welcome guides (8-12 pages)
- Pricing sheets (2-4 pages)
- Questionnaires (3-5 pages)
- Contracts (6-10 pages)
- Portfolio samples (10-15 pages)

## 4. Access Control System

### 4.1 Demo Login Portal
```typescript
// Route: /demo
interface DemoPortal {
  sections: {
    suppliers: DemoSupplier[] // Click to login
    couples: DemoCouple[] // Click to login
    scenarios: PresetScenario[] // Guided walkthroughs
  }
  
  authentication: {
    method: 'magic_token' | 'shared_password'
    password?: 'demo2024'
    tokenExpiry: '24_hours'
  }
  
  features: {
    instantSwitch: boolean // Switch accounts without logout
    resetData: boolean // Manual reset button
    tourMode: boolean // Guided product tour
  }
}
```

### 4.2 Account Flags
```sql
-- Demo account identification
ALTER TABLE users ADD COLUMN is_demo_account BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN demo_reset_schedule TEXT;
ALTER TABLE users ADD COLUMN demo_created_at TIMESTAMPTZ;

-- Exclude from production metrics
CREATE VIEW production_users AS
SELECT * FROM users WHERE is_demo_account = FALSE;
```

## 5. Data Reset Strategy

### 5.1 Reset Schedule
```typescript
interface ResetConfig {
  schedule: {
    nightly: '02:00 UTC' // Low-traffic time
    weekly: 'Sunday 03:00 UTC'
  }
  
  preserve: {
    accountStructure: true
    loginCredentials: true
    mediaAssets: true
  }
  
  regenerate: {
    messages: true // New timestamps
    activity: true // Fresh activity feed
    analytics: true // Rolling 12-month window
    forms: true // Mix of completed/pending
  }
}
```

### 5.2 Reset Script
```typescript
async function resetDemoData() {
  // 1. Clear transactional data
  await clearMessages(demoAccountIds)
  await clearActivities(demoAccountIds)
  
  // 2. Regenerate with new timestamps
  await seedMessages(templates.messages)
  await seedActivities(templates.activities)
  await seedForms(templates.forms)
  
  // 3. Update analytics window
  await regenerateAnalytics(last12Months)
  
  // 4. Log reset
  await logReset({
    timestamp: new Date(),
    accountsReset: demoAccountIds.length,
    dataPointsCreated: getDataPointCount()
  })
}
```

## 6. Testing Integration

### 6.1 Tester Access
```typescript
interface TesterAccess {
  roles: {
    uiTester: {
      canImpersonate: true
      canResetData: true
      canViewLogs: true
    }
    qaTester: {
      canRunAutomation: true
      canAccessAPI: true
      canModifyData: true
    }
  }
  
  tools: {
    impersonationBar: boolean // Top bar to switch accounts
    dataInspector: boolean // View raw database
    activityLogger: boolean // Track all actions
  }
}
```

### 6.2 Demo Logs
```sql
CREATE TABLE demo_logs (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track demo usage
CREATE INDEX idx_demo_logs_account ON demo_logs(account_id);
CREATE INDEX idx_demo_logs_created ON demo_logs(created_at);
```

## 7. Implementation Plan

### Phase 1: Infrastructure (Week 1)
- [ ] Create demo database schema
- [ ] Set up authentication bypass
- [ ] Build demo portal UI
- [ ] Configure reset cron jobs

### Phase 2: Data Generation (Week 2)
- [ ] Generate supplier accounts
- [ ] Generate couple accounts
- [ ] Create relationships
- [ ] Seed initial data

### Phase 3: Media Assets (Week 3)
- [ ] Generate/source logos
- [ ] Create profile photos
- [ ] Upload document templates
- [ ] Configure storage buckets

### Phase 4: Testing & Polish (Week 4)
- [ ] Test all login flows
- [ ] Verify data relationships
- [ ] Run reset cycles
- [ ] Create documentation

## 8. Success Metrics

The Demo Suite will be considered successful when:
- All demo accounts can be accessed within 2 clicks
- Data appears realistic and consistent across platforms
- Reset cycle completes in <5 minutes
- 100% of features have demo data to display
- Testers can complete full user journeys without errors

## 9. Maintenance Requirements

- **Daily**: Monitor demo usage logs
- **Weekly**: Verify reset completion
- **Monthly**: Update seasonal data patterns
- **Quarterly**: Refresh media assets and content

## 10. Security Considerations

- Demo accounts cannot access production data
- Demo emails are blacklisted from external sending
- API rate limits apply to prevent abuse
- Demo data is excluded from analytics and billing
- Regular security audits of demo access logs

---

This specification provides a complete blueprint for implementing a professional demo environment that showcases the full capabilities of WedSync and WedMe platforms while maintaining data integrity and security.