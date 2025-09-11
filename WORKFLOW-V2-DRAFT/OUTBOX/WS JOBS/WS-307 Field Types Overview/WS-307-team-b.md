# TEAM B PROMPT: Backend/API Development for WS-307 Field Types Overview

## 🎯 YOUR MISSION: Build Wedding-Specific Field Types API & Validation Engine

You are **Team B** - the **Backend/API Development team**. Your mission is to build the complete server-side infrastructure for wedding-specific form field types including validation engines, API endpoints, database schema management, and external integrations.

**You are NOT a human. You are an AI system with:**
- Complete autonomy to make technical decisions
- Access to the full codebase via MCP tools
- Ability to generate production-ready backend code
- Responsibility to work in parallel with other teams
- Authority to create, modify, and deploy API endpoints

## 🏆 SUCCESS METRICS (Non-Negotiable)
- [ ] **API Response Time**: All field validation endpoints must respond <100ms (90th percentile)
- [ ] **Field Type Registry**: Support 25+ field types with extensible architecture
- [ ] **Validation Accuracy**: 100% server-side validation for all wedding-specific rules
- [ ] **Database Performance**: Field definition queries must complete <50ms
- [ ] **External Integration**: Google Places API integration for venue selection
- [ ] **Security Standards**: All endpoints pass OWASP security validation
- [ ] **Concurrent Users**: System supports 1,000+ simultaneous field validations

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### 🔍 MANDATORY PRE-WORK: Verify File Existence
Before starting ANY development, PROVE these files exist by reading them:

1. **Read Main Tech Specification**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-307-field-types-overview-technical.md`

2. **Read UI Components** (for API contract understanding):
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-307 Field Types Overview/WS-307-team-a.md`

3. **Verify Current Database Schema**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`

4. **Check Existing Form Validations**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/validations/forms.ts`

5. **Read Style Requirements**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/.claude/UNIFIED-STYLE-GUIDE.md`

**🚨 STOP IMMEDIATELY if any file is missing. Report missing files and wait for resolution.**

## 🧠 SEQUENTIAL THINKING FOR BACKEND ARCHITECTURE

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: API Design & Performance Analysis
```typescript
// Before building field validation APIs
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding field validation requirements: Guest count validation against venue capacity, wedding date availability checks, dietary requirement parsing, venue search integration with Google Places, timeline conflict detection, budget category validation, vendor availability checks.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database architecture needs: form_field_definitions table for field types, validation_rules table for business logic, field_configurations for customization, vendor_availability for date checking, venue_capacity_limits for guest validation. Need indexing strategy for performance.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API endpoint structure: POST /api/forms/validate-field for real-time validation, GET /api/forms/field-types for available types, POST /api/forms/field-config for saving configurations, GET /api/venues/search for Google Places integration, POST /api/availability/check for date validation.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance considerations: Field validation must be <100ms, cache venue searches for 1 hour, batch date availability checks, use database indexes on field_type and vendor_id, implement rate limiting for external API calls, use connection pooling.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security implementation: Server-side validation for all fields, input sanitization for text fields, SQL injection prevention, rate limiting on validation endpoints, API key protection for Google Places, audit logging for field changes, RBAC for field management.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

#### Pattern 2: External Integration Strategy
```typescript
// Analyzing third-party service integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Google Places integration complexity: API key management, rate limiting (1000 requests/day free tier), response caching strategy, error handling for service downtime, data transformation for our venue format, address validation and standardization.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding industry data sources: Venue capacity databases, seasonal availability patterns, local wedding vendor directories, weather service integration for outdoor events, traffic pattern APIs for timing recommendations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Fallback strategies: Local venue database when Google Places fails, cached availability data for offline scenarios, default capacity estimates based on venue type, manual venue entry options, graceful degradation of advanced features.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture: Service layer abstraction for external APIs, circuit breaker pattern for reliability, webhook handlers for real-time updates, background job processing for bulk operations, monitoring and alerting for service health.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Backend Focus)

### A. SERENA BACKEND ANALYSIS
```typescript
// Activate WedSync project context
await mcp__serena__activate_project("WedSync2");

// Find existing backend patterns and APIs
await mcp__serena__find_symbol("validation schema endpoint", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");
await mcp__serena__search_for_pattern("Supabase client database query");

// Analyze form handling patterns
await mcp__serena__find_referencing_symbols("forms validation zod");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validations/forms.ts", 1, -1);
```

### B. BACKEND DOCUMENTATION RESEARCH
```typescript
# Use Ref MCP to search for current patterns:
# - "Next.js 15 API routes server actions"
# - "Supabase database API PostgreSQL"
# - "Zod validation schemas TypeScript"
# - "Google Places API integration"
# - "Rate limiting API endpoints Next.js"
```

## 🎯 CORE BACKEND DELIVERABLES

### 1. DATABASE SCHEMA IMPLEMENTATION

#### A. Field Definitions Schema
```sql
-- Complete database migration file
CREATE TABLE IF NOT EXISTS form_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_type VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  is_wedding_specific BOOLEAN DEFAULT FALSE,
  validation_schema JSONB DEFAULT '{}',
  default_config JSONB DEFAULT '{}',
  required_permissions TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_field_definitions_category ON form_field_definitions(category);
CREATE INDEX idx_field_definitions_wedding_specific ON form_field_definitions(is_wedding_specific);
CREATE INDEX idx_field_definitions_active ON form_field_definitions(is_active);

-- Insert core field types
INSERT INTO form_field_definitions (field_type, display_name, description, category, is_wedding_specific, validation_schema, default_config) VALUES
('text', 'Text Input', 'Single line text field', 'basic', false, '{"maxLength": 255}', '{"placeholder": ""}'),
('email', 'Email Address', 'Email with validation', 'basic', false, '{"format": "email"}', '{"placeholder": "email@example.com"}'),
('phone', 'Phone Number', 'International phone number', 'basic', false, '{"format": "phone"}', '{"countryCode": "US"}'),
('number', 'Number Input', 'Numeric input with validation', 'basic', false, '{"min": 0, "max": 999999}', '{"step": 1}'),
('date', 'Date Picker', 'Standard date selection', 'basic', false, '{"minDate": "today"}', '{}'),
('select', 'Dropdown Select', 'Single selection dropdown', 'basic', false, '{}', '{"options": []}'),
('checkbox', 'Checkbox', 'Boolean checkbox input', 'basic', false, '{}', '{"defaultChecked": false}'),
('textarea', 'Text Area', 'Multi-line text input', 'basic', false, '{"maxLength": 1000}', '{"rows": 4}'),
('radio', 'Radio Group', 'Single choice from options', 'basic', false, '{}', '{"options": [], "required": true}'),
('file', 'File Upload', 'File attachment field', 'basic', false, '{"maxSize": 5242880, "accept": "*"}', '{"multiple": false}'),
('guest_count_matrix', 'Guest Count Matrix', 'Adults, children, infants breakdown', 'wedding', true, '{"maxTotal": 500}', '{"showInfants": true, "showChildren": true}'),
('wedding_date', 'Wedding Date', 'Date picker with venue availability', 'wedding', true, '{"minDate": "today", "maxAdvanceMonths": 24}', '{"showAvailability": true}'),
('venue_selector', 'Venue Selector', 'Venue with Google Places integration', 'wedding', true, '{"radiusKm": 50}', '{"allowMultiple": false}'),
('dietary_matrix', 'Dietary Requirements', 'Structured dietary needs collector', 'wedding', true, '{}', '{"includeAllergies": true, "includePreferences": true}'),
('timeline_builder', 'Wedding Timeline', 'Hour-by-hour schedule builder', 'wedding', true, '{"minHours": 6, "maxHours": 16}', '{"startTime": "08:00", "endTime": "24:00"}'),
('budget_category', 'Budget Category', 'Wedding budget line item', 'wedding', true, '{"maxAmount": 100000}', '{"currency": "GBP", "showPercentage": true}'),
('vendor_selector', 'Vendor Selector', 'Choose from available vendors', 'wedding', true, '{}', '{"vendorTypes": ["photographer", "venue", "catering"]}'),
('seating_chart', 'Seating Chart', 'Guest table assignments', 'wedding', true, '{"maxTables": 50}', '{"guestsPerTable": 8}'),
('music_playlist', 'Music Playlist', 'Wedding music selection', 'wedding', true, '{}', '{"allowSpotify": true, "maxSongs": 100}'),
('photo_requirements', 'Photo Requirements', 'Photography shot list', 'wedding', true, '{}', '{"categories": ["ceremony", "reception", "portraits"]}'),
('catering_preferences', 'Catering Preferences', 'Menu selection and requirements', 'wedding', true, '{}', '{"mealTypes": ["dinner", "cocktail", "brunch"]}'),
('transportation', 'Transportation', 'Wedding day transport planning', 'wedding', true, '{}', '{"vehicleTypes": ["car", "bus", "limo"]}'),
('accommodation', 'Accommodation', 'Guest accommodation booking', 'wedding', true, '{}', '{"showMap": true, "maxDistanceKm": 10}'),
('dress_code', 'Dress Code', 'Wedding attire specifications', 'wedding', true, '{}', '{"formalityLevels": ["casual", "formal", "black-tie"]}'),
('gift_registry', 'Gift Registry', 'Wedding gift preferences', 'wedding', true, '{}', '{"allowMultipleStores": true}'),
('honeymoon_registry', 'Honeymoon Registry', 'Honeymoon experience funding', 'wedding', true, '{}', '{"showProgress": true, "allowPartialFunding": true}');
```

#### B. Field Validation Rules Schema
```sql
-- Validation rules table for complex business logic
CREATE TABLE IF NOT EXISTS field_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_type VARCHAR(50) REFERENCES form_field_definitions(field_type),
  rule_name VARCHAR(100) NOT NULL,
  validation_function TEXT NOT NULL, -- SQL function or validation expression
  error_message TEXT NOT NULL,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert wedding-specific validation rules
INSERT INTO field_validation_rules (field_type, rule_name, validation_function, error_message, priority) VALUES
('guest_count_matrix', 'venue_capacity_check', 'total_guests <= venue_capacity', 'Total guests exceeds venue capacity', 1),
('guest_count_matrix', 'minimum_guests', 'total_guests >= 1', 'At least one guest is required', 2),
('wedding_date', 'availability_check', 'check_venue_availability(date, venue_id)', 'Selected date is not available', 1),
('wedding_date', 'advance_booking', 'date >= CURRENT_DATE + INTERVAL ''7 days''', 'Wedding date must be at least 7 days in advance', 2),
('venue_selector', 'capacity_match', 'venue_capacity >= expected_guests', 'Venue capacity insufficient for guest count', 1),
('budget_category', 'positive_amount', 'amount > 0', 'Budget amount must be greater than zero', 1),
('timeline_builder', 'no_conflicts', 'check_timeline_conflicts(events)', 'Timeline contains conflicting events', 1);
```

### 2. API ENDPOINTS IMPLEMENTATION

#### A. Field Types API
```typescript
// File: /wedsync/src/app/api/forms/field-types/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const QuerySchema = z.object({
  category: z.string().optional(),
  wedding_specific: z.boolean().optional(),
  search: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse({
      category: searchParams.get('category'),
      wedding_specific: searchParams.get('wedding_specific') === 'true',
      search: searchParams.get('search'),
    });

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Build query
    let dbQuery = supabase
      .from('form_field_definitions')
      .select('*')
      .eq('is_active', true);

    if (query.category) {
      dbQuery = dbQuery.eq('category', query.category);
    }

    if (query.wedding_specific !== undefined) {
      dbQuery = dbQuery.eq('is_wedding_specific', query.wedding_specific);
    }

    if (query.search) {
      dbQuery = dbQuery.or(
        `display_name.ilike.%${query.search}%,description.ilike.%${query.search}%`
      );
    }

    const { data: fieldTypes, error } = await dbQuery
      .order('category, display_name');

    if (error) {
      console.error('Field types fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch field types' },
        { status: 500 }
      );
    }

    // Group by category
    const categories = fieldTypes.reduce((acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = {
          name: field.category,
          label: field.category.charAt(0).toUpperCase() + field.category.slice(1),
          fields: [],
        };
      }
      acc[field.category].fields.push(field);
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      categories: Object.values(categories),
      total: fieldTypes.length,
    });

  } catch (error) {
    console.error('Field types API error:', error);
    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  }
}
```

#### B. Field Validation API
```typescript
// File: /wedsync/src/app/api/forms/validate-field/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { validateFieldValue } from '@/lib/field-validation';

const ValidateFieldSchema = z.object({
  field_type: z.string().min(1),
  value: z.any(),
  config: z.record(z.any()).default({}),
  context: z.record(z.any()).optional(), // Additional context like venue_id, wedding_date
});

// Rate limiting: 100 requests per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const identifier = request.headers.get('x-forwarded-for') ?? 'anonymous';
    await limiter.check(100, identifier);

    const body = await request.json();
    const { field_type, value, config, context } = ValidateFieldSchema.parse(body);

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get field definition
    const { data: fieldDef, error: fieldError } = await supabase
      .from('form_field_definitions')
      .select('*')
      .eq('field_type', field_type)
      .eq('is_active', true)
      .single();

    if (fieldError || !fieldDef) {
      return NextResponse.json(
        { error: 'Invalid field type' },
        { status: 400 }
      );
    }

    // Merge default config with provided config
    const mergedConfig = { ...fieldDef.default_config, ...config };

    // Perform validation
    const validationResult = await validateFieldValue(
      field_type,
      value,
      mergedConfig,
      fieldDef.validation_schema,
      context
    );

    // Log validation for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Field validation:', {
        field_type,
        value,
        result: validationResult,
      });
    }

    return NextResponse.json(validationResult);

  } catch (error) {
    console.error('Field validation API error:', error);
    
    if (error.message === 'Rate limit exceeded') {
      return NextResponse.json(
        { error: 'Too many validation requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}
```

### 3. VALIDATION ENGINE IMPLEMENTATION

#### A. Core Validation Service
```typescript
// File: /wedsync/src/lib/field-validation/index.ts
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings?: string[];
  formatted_value?: any;
  suggestions?: string[];
}

export interface ValidationContext {
  venue_id?: string;
  wedding_date?: string;
  guest_count?: number;
  vendor_id?: string;
  organization_id?: string;
}

/**
 * Main field validation function
 */
export async function validateFieldValue(
  fieldType: string,
  value: any,
  config: Record<string, any>,
  validationSchema: Record<string, any>,
  context?: ValidationContext
): Promise<ValidationResult> {
  
  const result: ValidationResult = {
    is_valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  try {
    // Basic type validation
    const basicValidation = await validateBasicType(fieldType, value, config);
    if (!basicValidation.is_valid) {
      return basicValidation;
    }

    // Wedding-specific validation
    if (isWeddingSpecificField(fieldType)) {
      const weddingValidation = await validateWeddingField(
        fieldType,
        value,
        config,
        context
      );
      
      result.errors.push(...weddingValidation.errors);
      result.warnings?.push(...(weddingValidation.warnings || []));
      result.suggestions?.push(...(weddingValidation.suggestions || []));
      
      if (!weddingValidation.is_valid) {
        result.is_valid = false;
      }
    }

    // Custom validation rules
    const customValidation = await applyCustomValidationRules(
      fieldType,
      value,
      config,
      context
    );
    
    result.errors.push(...customValidation.errors);
    result.warnings?.push(...(customValidation.warnings || []));
    
    if (!customValidation.is_valid) {
      result.is_valid = false;
    }

    // Format the value
    result.formatted_value = formatFieldValue(fieldType, value, config);

    return result;

  } catch (error) {
    console.error('Field validation error:', error);
    return {
      is_valid: false,
      errors: ['Validation failed due to internal error'],
    };
  }
}

/**
 * Wedding-specific field validation
 */
async function validateWeddingField(
  fieldType: string,
  value: any,
  config: Record<string, any>,
  context?: ValidationContext
): Promise<ValidationResult> {
  
  switch (fieldType) {
    case 'guest_count_matrix':
      return validateGuestCountMatrix(value, config, context);
    
    case 'wedding_date':
      return validateWeddingDate(value, config, context);
    
    case 'venue_selector':
      return validateVenueSelector(value, config, context);
    
    case 'dietary_matrix':
      return validateDietaryMatrix(value, config, context);
    
    case 'timeline_builder':
      return validateTimelineBuilder(value, config, context);
    
    case 'budget_category':
      return validateBudgetCategory(value, config, context);
    
    default:
      return { is_valid: true, errors: [] };
  }
}

/**
 * Guest count matrix validation
 */
async function validateGuestCountMatrix(
  value: { adults: number; children: number; infants: number },
  config: Record<string, any>,
  context?: ValidationContext
): Promise<ValidationResult> {
  
  const result: ValidationResult = { is_valid: true, errors: [], warnings: [], suggestions: [] };

  // Validate structure
  if (!value || typeof value !== 'object') {
    return {
      is_valid: false,
      errors: ['Guest count must be an object with adults, children, and infants'],
    };
  }

  const { adults = 0, children = 0, infants = 0 } = value;
  
  // Validate numbers
  if (!Number.isInteger(adults) || adults < 0) {
    result.errors.push('Adults count must be a non-negative integer');
    result.is_valid = false;
  }
  
  if (!Number.isInteger(children) || children < 0) {
    result.errors.push('Children count must be a non-negative integer');
    result.is_valid = false;
  }
  
  if (!Number.isInteger(infants) || infants < 0) {
    result.errors.push('Infants count must be a non-negative integer');
    result.is_valid = false;
  }

  const totalGuests = adults + children + infants;

  // Minimum guests validation
  if (totalGuests === 0) {
    result.errors.push('At least one guest is required');
    result.is_valid = false;
  }

  // Maximum total validation
  if (config.maxTotal && totalGuests > config.maxTotal) {
    result.errors.push(`Total guests (${totalGuests}) exceeds maximum allowed (${config.maxTotal})`);
    result.is_valid = false;
  }

  // Venue capacity validation
  if (context?.venue_id || config.venueCapacity) {
    const venueCapacity = await getVenueCapacity(context?.venue_id, config.venueCapacity);
    
    if (venueCapacity && totalGuests > venueCapacity) {
      result.errors.push(`Guest count (${totalGuests}) exceeds venue capacity (${venueCapacity})`);
      result.is_valid = false;
    } else if (venueCapacity && totalGuests > venueCapacity * 0.9) {
      result.warnings?.push(`Guest count is approaching venue capacity (${totalGuests}/${venueCapacity})`);
    }
  }

  // Wedding industry insights
  if (totalGuests > 150) {
    result.suggestions?.push('Consider a larger venue for over 150 guests');
  }
  
  if (children > adults * 0.3) {
    result.suggestions?.push('High ratio of children - consider child-friendly entertainment');
  }

  return result;
}

/**
 * Wedding date validation
 */
async function validateWeddingDate(
  value: string,
  config: Record<string, any>,
  context?: ValidationContext
): Promise<ValidationResult> {
  
  const result: ValidationResult = { is_valid: true, errors: [], warnings: [], suggestions: [] };

  if (!value) {
    return {
      is_valid: false,
      errors: ['Wedding date is required'],
    };
  }

  const weddingDate = new Date(value);
  
  // Validate date format
  if (isNaN(weddingDate.getTime())) {
    return {
      is_valid: false,
      errors: ['Invalid date format'],
    };
  }

  const now = new Date();
  const daysDifference = Math.ceil((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Minimum advance booking
  const minAdvanceDays = config.minAdvanceDays || 7;
  if (daysDifference < minAdvanceDays) {
    result.errors.push(`Wedding date must be at least ${minAdvanceDays} days in advance`);
    result.is_valid = false;
  }

  // Maximum advance booking
  const maxAdvanceMonths = config.maxAdvanceMonths || 24;
  const maxAdvanceDays = maxAdvanceMonths * 30;
  if (daysDifference > maxAdvanceDays) {
    result.warnings?.push(`Wedding date is more than ${maxAdvanceMonths} months away`);
  }

  // Peak season warnings
  const month = weddingDate.getMonth();
  if ([4, 5, 6, 7, 8, 9].includes(month)) { // May through October
    result.warnings?.push('Peak wedding season - book vendors early');
  }

  // Weekend premium
  const dayOfWeek = weddingDate.getDay();
  if (dayOfWeek === 6) { // Saturday
    result.suggestions?.push('Saturday weddings typically cost 20-30% more than weekdays');
  }

  // Venue availability check
  if (context?.venue_id && config.checkAvailability) {
    const isAvailable = await checkVenueAvailability(context.venue_id, value);
    if (!isAvailable) {
      result.errors.push('Selected date is not available at this venue');
      result.is_valid = false;
    }
  }

  return result;
}
```

### 4. EXTERNAL INTEGRATION SERVICES

#### A. Google Places Integration
```typescript
// File: /wedsync/src/lib/integrations/google-places.ts
import { Client } from '@googlemaps/google-maps-services-js';

interface VenueSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  types: string[];
  rating?: number;
  price_level?: number;
  photos?: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  estimated_capacity?: number;
}

export class GooglePlacesService {
  private client: Client;
  private apiKey: string;

  constructor() {
    this.client = new Client({});
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY!;
    
    if (!this.apiKey) {
      throw new Error('Google Places API key is required');
    }
  }

  /**
   * Search for wedding venues
   */
  async searchVenues(
    query: string,
    location?: { lat: number; lng: number },
    radius: number = 50000
  ): Promise<VenueSearchResult[]> {
    
    try {
      const response = await this.client.placesNearbySearch({
        params: {
          key: this.apiKey,
          location: location || { lat: 51.5074, lng: -0.1278 }, // Default to London
          radius,
          type: 'establishment',
          keyword: `${query} wedding venue`,
        },
      });

      const venues = response.data.results
        .filter(place => this.isWeddingVenue(place.types || []))
        .map(place => ({
          place_id: place.place_id!,
          name: place.name!,
          formatted_address: place.formatted_address || place.vicinity || '',
          types: place.types || [],
          rating: place.rating,
          price_level: place.price_level,
          photos: place.photos?.map(photo => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`
          ),
          geometry: {
            location: {
              lat: place.geometry?.location?.lat || 0,
              lng: place.geometry?.location?.lng || 0,
            },
          },
          estimated_capacity: this.estimateCapacity(place.types || [], place.price_level),
        }));

      return venues;

    } catch (error) {
      console.error('Google Places search error:', error);
      throw new Error('Failed to search venues');
    }
  }

  /**
   * Get detailed venue information
   */
  async getVenueDetails(placeId: string): Promise<VenueSearchResult | null> {
    try {
      const response = await this.client.placeDetails({
        params: {
          key: this.apiKey,
          place_id: placeId,
          fields: [
            'place_id',
            'name', 
            'formatted_address',
            'types',
            'rating',
            'price_level',
            'photos',
            'geometry',
            'formatted_phone_number',
            'website',
            'opening_hours',
          ],
        },
      });

      const place = response.data.result;
      if (!place) return null;

      return {
        place_id: place.place_id!,
        name: place.name!,
        formatted_address: place.formatted_address || '',
        types: place.types || [],
        rating: place.rating,
        price_level: place.price_level,
        photos: place.photos?.map(photo => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${this.apiKey}`
        ),
        geometry: {
          location: {
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0,
          },
        },
        estimated_capacity: this.estimateCapacity(place.types || [], place.price_level),
      };

    } catch (error) {
      console.error('Google Places details error:', error);
      return null;
    }
  }

  /**
   * Check if place types indicate wedding venue
   */
  private isWeddingVenue(types: string[]): boolean {
    const weddingVenueTypes = [
      'wedding_venue',
      'banquet_hall',
      'event_venue',
      'restaurant',
      'hotel',
      'church',
      'park',
      'museum',
      'art_gallery',
      'establishment',
    ];

    return types.some(type => weddingVenueTypes.includes(type));
  }

  /**
   * Estimate venue capacity based on types and price level
   */
  private estimateCapacity(types: string[], priceLevel?: number): number {
    let baseCapacity = 100;

    // Adjust based on venue type
    if (types.includes('banquet_hall')) baseCapacity = 200;
    if (types.includes('hotel')) baseCapacity = 150;
    if (types.includes('restaurant')) baseCapacity = 80;
    if (types.includes('church')) baseCapacity = 120;
    if (types.includes('park')) baseCapacity = 300;
    if (types.includes('museum') || types.includes('art_gallery')) baseCapacity = 100;

    // Adjust based on price level
    if (priceLevel !== undefined) {
      const multiplier = [0.5, 0.7, 1.0, 1.5, 2.0][priceLevel] || 1.0;
      baseCapacity = Math.round(baseCapacity * multiplier);
    }

    return baseCapacity;
  }
}

// API endpoint for venue search
// File: /wedsync/src/app/api/venues/search/route.ts
import { NextResponse } from 'next/server';
import { GooglePlacesService } from '@/lib/integrations/google-places';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const SearchSchema = z.object({
  query: z.string().min(1),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  radius: z.number().min(1000).max(50000).default(25000),
});

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 100,
});

export async function POST(request: Request) {
  try {
    // Rate limiting
    const identifier = request.headers.get('x-forwarded-for') ?? 'anonymous';
    await limiter.check(10, identifier); // 10 requests per minute for venue search

    const body = await request.json();
    const { query, location, radius } = SearchSchema.parse(body);

    const placesService = new GooglePlacesService();
    const venues = await placesService.searchVenues(query, location, radius);

    return NextResponse.json({
      venues,
      count: venues.length,
    });

  } catch (error) {
    console.error('Venue search API error:', error);
    
    if (error.message === 'Rate limit exceeded') {
      return NextResponse.json(
        { error: 'Too many search requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Venue search failed' },
      { status: 500 }
    );
  }
}
```

## 🔒 SECURITY & PERFORMANCE REQUIREMENTS

### 1. API Security Checklist
- [ ] **Input Validation**: All inputs validated with Zod schemas
- [ ] **Rate Limiting**: Applied to all validation and search endpoints
- [ ] **Authentication**: User authentication required for all operations
- [ ] **SQL Injection Prevention**: Parameterized queries only
- [ ] **XSS Prevention**: Input sanitization for text fields
- [ ] **CORS**: Proper CORS configuration for API endpoints
- [ ] **API Key Protection**: Google Places API key secured
- [ ] **Error Handling**: No sensitive information in error responses
- [ ] **Audit Logging**: All validation attempts logged
- [ ] **HTTPS Enforcement**: All API calls over HTTPS

### 2. Performance Optimization
- [ ] **Response Time**: <100ms for field validation endpoints
- [ ] **Database Indexes**: Proper indexing on field_type, category, vendor_id
- [ ] **Connection Pooling**: Database connection optimization
- [ ] **Caching Strategy**: Cache venue searches for 1 hour
- [ ] **Batch Operations**: Bulk validation support for forms
- [ ] **Memory Usage**: Efficient data structures for field registry
- [ ] **API Rate Limits**: External API usage optimization
- [ ] **Query Optimization**: Efficient SQL for field definitions
- [ ] **CDN Integration**: Static field assets served via CDN
- [ ] **Monitoring**: Performance metrics collection

## 🎯 TYPICAL BACKEND DELIVERABLES WITH EVIDENCE

### Core API Infrastructure
- [ ] **Field Types API** (Evidence: GET /api/forms/field-types returns 25+ types)
- [ ] **Validation API** (Evidence: POST /api/forms/validate-field responds <100ms)
- [ ] **Database Migration** (Show: Applied migration with all field types)
- [ ] **Google Places Integration** (Test: Venue search returns results)
- [ ] **Rate Limiting** (Verify: Rate limits properly enforced)
- [ ] **Error Handling** (Show: Graceful error responses)

### Wedding-Specific Logic
- [ ] **Guest Count Validation** (Evidence: Capacity checking works)
- [ ] **Date Availability** (Show: Venue availability checking)
- [ ] **Venue Integration** (Test: Google Places API integration)
- [ ] **Wedding Rules Engine** (Code: Business logic implementation)
- [ ] **Performance Benchmarks** (Metrics: <100ms response times)
- [ ] **Security Validation** (Audit: Security checklist completed)

## 🚨 CRITICAL SUCCESS CRITERIA

Before marking this task complete, VERIFY:

### Functionality Verification
1. **Field Types Loading**: GET /api/forms/field-types returns all 25+ field types
2. **Validation Speed**: Field validation completes in <100ms
3. **Wedding Logic**: Guest count matrix validates against venue capacity
4. **Date Checking**: Wedding date availability validation works
5. **External APIs**: Google Places venue search functional

### Integration Verification
6. **Database Performance**: Field queries complete in <50ms
7. **Security Standards**: All endpoints pass security audit
8. **Error Handling**: Graceful failure for all edge cases
9. **Rate Limiting**: Proper protection against abuse
10. **Monitoring**: Performance metrics collection active

### Code Quality Verification
11. **Type Safety**: 100% TypeScript, zero 'any' types
12. **Input Validation**: All inputs validated with Zod
13. **Error Logging**: Comprehensive error tracking
14. **Documentation**: All APIs documented with examples
15. **Testing**: Unit tests for all validation functions

**🎯 REMEMBER**: You're building the backend foundation that will handle 1,000+ concurrent users validating wedding-specific data. Every millisecond matters, and data integrity is sacred in the wedding industry.

**Wedding Context**: Vendors need instant feedback when configuring forms - a slow validation API breaks their workflow and loses customers. Build it fast, secure, and reliable.