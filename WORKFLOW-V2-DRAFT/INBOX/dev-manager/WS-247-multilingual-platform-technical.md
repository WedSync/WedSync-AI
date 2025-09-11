# WS-247: Multilingual Platform System - Technical Specification

## Executive Summary

A comprehensive internationalization (i18n) system that enables WedSync to serve global wedding markets with native language support, cultural customization, and localized wedding traditions across 15+ languages and 25+ countries.

**Estimated Effort**: 118 hours
- **Frontend**: 42 hours (36%)
- **Backend**: 38 hours (32%)
- **Integration**: 24 hours (20%)
- **Platform**: 10 hours (8%)
- **QA/Testing**: 4 hours (4%)

**Business Impact**:
- Expand to 25+ international markets
- Increase global user base by 200%
- Improve user engagement by 45% in non-English markets  
- Enable premium localization services revenue stream

## User Story

**As a** Spanish wedding photographer living in Madrid  
**I want to** use WedSync in my native Spanish language with local wedding customs  
**So that** I can efficiently manage my clients without language barriers

**Acceptance Criteria**:
- ✅ Complete UI translation in Spanish with cultural context
- ✅ Spanish wedding traditions and timeline templates
- ✅ Local currency and date/time formatting
- ✅ Region-specific vendor categories and services
- ✅ Multilingual client communication templates
- ✅ Cultural customization for Spanish wedding customs

## Database Schema

```sql
-- Language and locale configuration
CREATE TABLE supported_locales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Locale identification
  locale_code VARCHAR(10) NOT NULL UNIQUE, -- e.g., 'es-ES', 'fr-FR'
  language_code CHAR(2) NOT NULL, -- ISO 639-1
  country_code CHAR(2) NOT NULL, -- ISO 3166-1
  
  -- Display information
  native_name VARCHAR(100) NOT NULL, -- "Español"
  english_name VARCHAR(100) NOT NULL, -- "Spanish"
  
  -- Locale settings
  currency_code CHAR(3) NOT NULL, -- EUR, GBP, USD
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(10) DEFAULT '24h',
  number_format VARCHAR(20) DEFAULT '1.234,56',
  
  -- Platform support
  is_active BOOLEAN DEFAULT TRUE,
  is_beta BOOLEAN DEFAULT FALSE,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Cultural context
  wedding_traditions JSONB,
  cultural_customizations JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Translation strings and content
CREATE TABLE translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Translation key and context
  translation_key VARCHAR(255) NOT NULL,
  namespace VARCHAR(100) DEFAULT 'common',
  context VARCHAR(100), -- Additional context for translators
  
  -- Source content
  source_text TEXT NOT NULL,
  description TEXT, -- Explanation for translators
  
  -- Translation metadata
  is_html BOOLEAN DEFAULT FALSE,
  supports_plurals BOOLEAN DEFAULT FALSE,
  supports_interpolation BOOLEAN DEFAULT FALSE,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(translation_key, namespace)
);

-- Localized translation content
CREATE TABLE translation_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  translation_id UUID REFERENCES translations(id) ON DELETE CASCADE,
  locale_code VARCHAR(10) REFERENCES supported_locales(locale_code),
  
  -- Translated content
  translated_text TEXT NOT NULL,
  
  -- Plural forms (for languages with complex pluralization)
  plural_forms JSONB, -- {zero: "", one: "", few: "", many: "", other: ""}
  
  -- Quality and review
  translation_status trans_status_enum DEFAULT 'pending',
  translator_id UUID REFERENCES auth.users(id),
  reviewer_id UUID REFERENCES auth.users(id),
  
  -- Version control
  version INTEGER DEFAULT 1,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(translation_id, locale_code)
);

-- Cultural wedding templates and traditions
CREATE TABLE cultural_wedding_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  locale_code VARCHAR(10) REFERENCES supported_locales(locale_code),
  
  -- Template information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type template_type_enum NOT NULL,
  
  -- Cultural context
  tradition_name VARCHAR(255),
  cultural_significance TEXT,
  regional_variations JSONB,
  
  -- Template content
  template_data JSONB NOT NULL,
  
  -- Usage and popularity
  usage_count INTEGER DEFAULT 0,
  popularity_score DECIMAL(3,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Localized vendor categories and services
CREATE TABLE localized_vendor_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  locale_code VARCHAR(10) REFERENCES supported_locales(locale_code),
  
  -- Category information
  category_key VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Cultural customization
  is_culturally_relevant BOOLEAN DEFAULT TRUE,
  cultural_context TEXT,
  alternative_names VARCHAR(255)[],
  
  -- Hierarchy
  parent_category_id UUID REFERENCES localized_vendor_categories(id),
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User language preferences
CREATE TABLE user_locale_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Language preferences
  preferred_locale VARCHAR(10) REFERENCES supported_locales(locale_code),
  fallback_locale VARCHAR(10) DEFAULT 'en-GB',
  
  -- Regional customizations
  currency_preference CHAR(3),
  timezone VARCHAR(50),
  date_format_override VARCHAR(20),
  
  -- Cultural preferences
  wedding_tradition_preferences JSONB,
  cultural_customizations JSONB,
  
  -- Accessibility
  text_direction text_dir_enum DEFAULT 'ltr',
  font_preferences JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Translation workflow and management
CREATE TABLE translation_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Project details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_locales VARCHAR(10)[],
  
  -- Scope and content
  namespaces VARCHAR(100)[],
  estimated_word_count INTEGER,
  
  -- Timeline and status
  start_date DATE,
  target_completion_date DATE,
  status project_status_enum DEFAULT 'planning',
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Team and management
  project_manager_id UUID REFERENCES auth.users(id),
  assigned_translators UUID[],
  assigned_reviewers UUID[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Machine translation cache and quality
CREATE TABLE machine_translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Translation request
  source_text TEXT NOT NULL,
  source_locale VARCHAR(10) NOT NULL,
  target_locale VARCHAR(10) NOT NULL,
  
  -- Machine translation result
  translated_text TEXT NOT NULL,
  translation_service VARCHAR(50), -- 'google', 'deepl', 'azure'
  confidence_score DECIMAL(5,4),
  
  -- Quality assessment
  human_quality_score DECIMAL(3,2),
  is_approved_for_use BOOLEAN DEFAULT FALSE,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enums for multilingual system
CREATE TYPE trans_status_enum AS ENUM ('pending', 'translated', 'reviewed', 'approved', 'rejected');
CREATE TYPE template_type_enum AS ENUM ('timeline', 'checklist', 'form', 'email', 'document');
CREATE TYPE text_dir_enum AS ENUM ('ltr', 'rtl');
CREATE TYPE project_status_enum AS ENUM ('planning', 'in_progress', 'review', 'completed', 'cancelled');
```

## API Endpoints

### Language and Localization
```typescript
// Get supported locales
GET /api/i18n/locales

// Get translations for locale
GET /api/i18n/translations/{locale}
{
  namespace?: string;
  includeMetadata?: boolean;
}

// Update user locale preferences
PUT /api/users/{userId}/locale-preferences
{
  preferredLocale: string;
  currencyPreference: string;
  timezone: string;
  culturalCustomizations: any;
}
```

### Cultural Templates
```typescript
// Get cultural wedding templates
GET /api/i18n/cultural-templates/{locale}
{
  templateType?: string;
  tradition?: string;
}

// Get localized vendor categories
GET /api/i18n/vendor-categories/{locale}
```

### Translation Management
```typescript
// Submit translation
POST /api/i18n/translations/{translationId}/content
{
  locale: string;
  translatedText: string;
  pluralForms?: any;
}

// Machine translation fallback
POST /api/i18n/machine-translate
{
  text: string;
  sourceLocale: string;
  targetLocale: string;
}
```

## Frontend Components

### Language Selector (`/components/i18n/LanguageSelector.tsx`)
```typescript
interface LanguageSelectorProps {
  currentLocale: string;
  availableLocales: SupportedLocale[];
  onLocaleChange: (locale: string) => void;
  showFlags?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLocale,
  availableLocales,
  onLocaleChange,
  showFlags = true
}) => {
  // Dropdown language selection
  // Flag icons for visual recognition
  // Native language names
  // Smooth locale switching
  // Persistence of selection
};
```

### Cultural Customization (`/components/i18n/CulturalCustomization.tsx`)
```typescript
const CulturalCustomization: React.FC<{locale: string}> = ({ locale }) => {
  // Cultural wedding tradition selection
  // Regional customization options  
  // Local wedding custom templates
  // Traditional timeline modifications
  // Cultural color and style preferences
};
```

### Translation Interface (`/components/admin/TranslationInterface.tsx`)
```typescript
const TranslationInterface: React.FC = () => {
  // Translation key management
  // In-context translation editing
  // Translation status tracking
  // Quality assurance workflows
  // Machine translation integration
};
```

## Integration Requirements

### Translation Service Integration
```typescript
class TranslationService {
  async getTranslation(
    key: string,
    locale: string,
    params?: any
  ): Promise<string> {
    // Fetch localized content
    // Handle interpolation and plurals
    // Fallback to machine translation
    // Cache translated content
  }
  
  async getMachineTranslation(
    text: string,
    sourceLocale: string,
    targetLocale: string
  ): Promise<string> {
    // Google Translate API integration
    // DeepL API for high-quality translation
    // Quality scoring and caching
  }
}
```

### Cultural Adaptation Engine
```typescript
class CulturalAdaptationEngine {
  async adaptContentForCulture(
    content: any,
    locale: string
  ): Promise<any> {
    // Cultural context adaptation
    // Local wedding tradition integration
    // Regional preference application
    // Cultural color and imagery
  }
  
  async getWeddingTraditionsForLocale(
    locale: string
  ): Promise<WeddingTradition[]> {
    // Traditional ceremony elements
    // Cultural timeline requirements
    // Regional vendor categories
    // Traditional color schemes
  }
}
```

### Locale Detection and Management
```typescript
class LocaleManager {
  async detectUserLocale(
    request: Request,
    userPreferences?: UserLocalePreferences
  ): Promise<string> {
    // User preference priority
    // Accept-Language header parsing
    // Geographic location detection
    // Fallback locale determination
  }
  
  async formatForLocale(
    value: any,
    type: 'currency' | 'date' | 'number',
    locale: string
  ): Promise<string> {
    // Currency formatting with symbols
    // Date/time localization
    // Number formatting conventions
  }
}
```

## Security & Privacy

### Translation Security
- Secure translation API endpoints
- Translator access control and permissions
- Translation audit trails
- Content sanitization and validation

### Cultural Sensitivity
- Cultural appropriation prevention
- Respectful tradition representation
- Community feedback integration
- Expert cultural review processes

## Performance Requirements

### Translation Performance
- Translation lookup: <50ms
- Locale switching: <500ms  
- Cultural template loading: <1 second
- Machine translation: <2 seconds

### Caching Strategy
- Translation content caching
- Cultural template caching
- Machine translation result caching
- Locale preference caching

## Testing Strategy

### Multilingual Testing
- Translation accuracy verification
- Cultural context validation
- UI layout testing for different languages
- RTL (Right-to-Left) language support
- Character encoding and font rendering

### Cultural Testing
- Wedding tradition authenticity verification
- Regional customization accuracy
- Cultural sensitivity review
- Community feedback integration

## Success Metrics

### Localization Coverage
- Translation completion: >95% for tier 1 languages
- Cultural template availability: 100% for major markets
- Locale-specific customization: >90%

### User Adoption
- Non-English user engagement: +45%
- International market penetration: 25+ countries
- Cultural template usage: >60% in localized markets
- User satisfaction with localization: >4.3/5

---

**Feature ID**: WS-247  
**Priority**: High  
**Complexity**: High  
**Dependencies**: Translation APIs, Cultural Research  
**Estimated Timeline**: 15 sprint days