# WS-284: Wedding Basics Setup - Technical Specification

## Feature Overview
**Priority**: High  
**Tier**: All tiers  
**Impact**: Critical foundation feature  
**Complexity**: Medium  

Streamlined setup wizard for couples to establish basic wedding information as the foundation for all other features.

## Core Requirements

### Setup Wizard Flow
1. **Welcome Screen** - Brief intro to WedMe, benefits overview
2. **Basic Info** - Couple names, wedding date, venue location, guest count
3. **Contact Details** - Primary contact, phone numbers, emails, emergency contact
4. **Preferences** - Wedding style/theme, budget range, priority areas

## Technical Implementation

### Database Schema
```sql
-- Add setup completion tracking
ALTER TABLE weddings ADD COLUMN setup_completed_at TIMESTAMP;
ALTER TABLE weddings ADD COLUMN setup_step INTEGER DEFAULT 0;
ALTER TABLE weddings ADD COLUMN onboarding_data JSONB;

-- New wedding preferences table
CREATE TABLE wedding_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  theme VARCHAR(100),
  style VARCHAR(100),
  budget_range VARCHAR(50),
  priority_areas TEXT[],
  color_scheme JSONB,
  communication_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE wedding_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Couples can manage their wedding preferences"
ON wedding_preferences FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM weddings w WHERE w.id = wedding_id 
  AND (w.partner1_id = auth.uid() OR w.partner2_id = auth.uid())));
```

### API Endpoints
- `GET /api/setup/progress/[weddingId]` - Get setup progress
- `POST /api/setup/step` - Save step data
- `POST /api/setup/complete` - Complete setup process
- `POST /api/setup/validate` - Validate step data

### React Components
- **SetupWizard** - Main wizard component with step progression
- **SetupProgress** - Progress indicator with step visualization
- **BasicInfoStep** - Couple names, date, venue, guest count form
- **ContactStep** - Contact information collection
- **PreferencesStep** - Style, theme, and preference selection

### State Management
```typescript
interface SetupStore {
  currentWedding: string | null;
  setupData: WeddingSetupData;
  currentStep: number;
  isCompleted: boolean;
  
  setWedding: (weddingId: string) => void;
  updateSetupData: (data: Partial<WeddingSetupData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeSetup: () => void;
}
```

### Validation Schemas
```typescript
const basicInfoSchema = z.object({
  partner1Name: z.string().min(1, 'Partner 1 name is required'),
  partner2Name: z.string().min(1, 'Partner 2 name is required'),
  weddingDate: z.date().min(new Date(), 'Wedding date must be in the future'),
  venueLocation: z.string().optional(),
  guestCount: z.number().min(1).max(10000).optional()
});
```

### Success Metrics
- Setup Completion Rate: Target >85%
- Time to Complete: Target <5 minutes
- Step Abandonment: Monitor each step
- Data Quality: Validate completeness