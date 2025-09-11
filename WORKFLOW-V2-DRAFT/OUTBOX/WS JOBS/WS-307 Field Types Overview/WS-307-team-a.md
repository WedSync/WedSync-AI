# TEAM A - ROUND 1: WS-307 - Field Types Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build comprehensive wedding-specific form field components with 25+ field types, interactive field configurations, and real-time field validation
**FEATURE ID:** WS-307 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding data collection, specialized field interactions, and vendor-specific field requirements

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **WEDDING FIELD TYPES DEMONSTRATION:**
```bash
open http://localhost:3000/forms/builder
# MUST show: 25+ field types including guest count matrix, wedding date, venue selector
```

2. **INTERACTIVE FIELD CONFIGURATION VERIFICATION:**
```bash
# Test guest count matrix with venue capacity validation
# Navigate to form builder, add guest count field, configure max capacity
# MUST show: Real-time capacity validation with visual indicators
```

3. **FIELD VALIDATION TESTING:**
```bash
curl -X POST $WS_ROOT/api/forms/validate-field \
  -H "Content-Type: application/json" \
  -d '{"field_type":"guest_count_matrix","value":{"adults":200},"config":{"maxTotal":150}}' | jq .
# MUST show: Validation error for exceeding capacity
```

## 🧠 SEQUENTIAL THINKING FOR WEDDING FIELD TYPES

```typescript
// Wedding field types complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding field types need: 25+ specialized components including guest count matrix (adults/children/infants), wedding date picker with availability checking, venue selector with Google Places integration, dietary requirements matrix, timeline builder, photo upload grids, signature capture, and vendor-specific fields for photographers, venues, caterers.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding industry data patterns: Venues need accurate guest counts for capacity planning, photographers require timeline details for shot planning, caterers need dietary restrictions for menu planning, florists need color schemes and allergy information, coordinators need vendor contact matrices, each requiring specialized validation and formatting.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Field interaction requirements: Real-time validation against business rules, progressive disclosure for complex fields, mobile-optimized touch interfaces, accessibility compliance for all field types, integration with existing wedding data structures, and seamless preview/edit modes in form builder.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Technical implementation approach: React component registry system, Zod validation schemas for each field type, TypeScript interfaces for field configurations, responsive design for mobile forms, integration with React Hook Form, and dynamic field loading with code splitting for performance.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP

### A. SERENA FIELD COMPONENT DISCOVERY
```typescript
// MANDATORY FIRST - Activate WedSync project context
await mcp__serena__activate_project("wedsync");

// Find existing form field patterns and components
await mcp__serena__search_for_pattern("form field components validation");
await mcp__serena__find_symbol("FormField Input Select", "$WS_ROOT/wedsync/src/components/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/ui/");

// Study existing validation and configuration patterns
await mcp__serena__find_referencing_symbols("validation schema config");
```

### B. FIELD COMPONENTS DOCUMENTATION LOADING
```typescript
// Load React form components and validation documentation
// Use Ref MCP to search for:
# - "React Hook Form custom field components"
# - "Zod validation schema patterns"
# - "React component registry systems"

// Load wedding industry field specifications
// Use Ref MCP to search for:
# - "Wedding guest count calculation methods"
# - "Venue capacity management systems"
# - "Wedding dietary restriction categorization"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Field Type Registry System** (`$WS_ROOT/wedsync/src/lib/form-field-registry.ts`)
  - Complete registration system for all 25+ field types
  - Dynamic field component loading and validation
  - Category-based field organization
  - Evidence: All field types registered and accessible in form builder

- [ ] **Wedding-Specific Field Components** (`$WS_ROOT/wedsync/src/components/forms/field-types/WeddingFields.tsx`)
  - Guest count matrix with capacity validation
  - Wedding date picker with availability checking
  - Venue selector with Google Places integration
  - Evidence: All wedding fields function correctly with proper validation

- [ ] **Advanced Field Components** (`$WS_ROOT/wedsync/src/components/forms/field-types/AdvancedFields.tsx`)
  - Dietary requirements matrix
  - Timeline builder component
  - Photo grid uploader
  - Evidence: Complex fields handle user interactions smoothly

- [ ] **Field Configuration Panel** (`$WS_ROOT/wedsync/src/components/forms/field-config/FieldConfigPanel.tsx`)
  - Context-sensitive configuration options
  - Real-time preview updates
  - Validation rule configuration
  - Evidence: Field properties update correctly and reflect in preview

- [ ] **Field Validation Engine** (`$WS_ROOT/wedsync/src/lib/field-validation-engine.ts`)
  - Type-specific validation logic
  - Wedding business rule enforcement
  - Real-time validation feedback
  - Evidence: All field types validate correctly against business rules

## 🎨 FIELD TYPE REGISTRY IMPLEMENTATION

### Core Field Registry System
```typescript
// File: $WS_ROOT/wedsync/src/lib/form-field-registry.ts

import React from 'react';
import { z } from 'zod';

export interface FieldTypeDefinition {
  type: string;
  display_name: string;
  description: string;
  category: 'basic' | 'wedding' | 'advanced' | 'media' | 'vendor_specific';
  is_wedding_specific: boolean;
  icon: React.ReactNode;
  component: React.ComponentType<FieldProps>;
  configComponent: React.ComponentType<FieldConfigProps>;
  validationSchema: z.ZodSchema<any>;
  defaultConfig: Record<string, any>;
  mobileOptimized: boolean;
}

export interface FieldProps {
  id: string;
  value: any;
  onChange: (value: any) => void;
  config: Record<string, any>;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label: string;
  description?: string;
}

export interface FieldConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  fieldType: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  formattedValue?: any;
}

class FormFieldRegistry {
  private static registry = new Map<string, FieldTypeDefinition>();
  private static categories = new Map<string, FieldTypeDefinition[]>();

  static register(definition: FieldTypeDefinition) {
    this.registry.set(definition.type, definition);
    
    // Update category cache
    if (!this.categories.has(definition.category)) {
      this.categories.set(definition.category, []);
    }
    this.categories.get(definition.category)!.push(definition);
  }

  static get(type: string): FieldTypeDefinition | undefined {
    return this.registry.get(type);
  }

  static getAll(): FieldTypeDefinition[] {
    return Array.from(this.registry.values());
  }

  static getByCategory(category: string): FieldTypeDefinition[] {
    return this.categories.get(category) || [];
  }

  static getCategories(): Array<{ name: string; label: string; fields: FieldTypeDefinition[] }> {
    return [
      {
        name: 'wedding',
        label: 'Wedding Fields',
        fields: this.getByCategory('wedding')
      },
      {
        name: 'basic',
        label: 'Basic Fields',
        fields: this.getByCategory('basic')
      },
      {
        name: 'advanced',
        label: 'Advanced Fields', 
        fields: this.getByCategory('advanced')
      },
      {
        name: 'media',
        label: 'Media & Files',
        fields: this.getByCategory('media')
      },
      {
        name: 'vendor_specific',
        label: 'Vendor Specific',
        fields: this.getByCategory('vendor_specific')
      }
    ];
  }

  static validate(fieldType: string, value: any, config: Record<string, any>): ValidationResult {
    const definition = this.get(fieldType);
    if (!definition) {
      return {
        isValid: false,
        errors: [`Unknown field type: ${fieldType}`]
      };
    }

    try {
      const validatedValue = definition.validationSchema.parse(value);
      
      // Additional wedding-specific validation
      if (definition.is_wedding_specific) {
        return this.validateWeddingField(fieldType, validatedValue, config);
      }

      return {
        isValid: true,
        errors: [],
        formattedValue: validatedValue
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => e.message)
        };
      }
      
      return {
        isValid: false,
        errors: ['Validation failed']
      };
    }
  }

  private static validateWeddingField(
    fieldType: string, 
    value: any, 
    config: Record<string, any>
  ): ValidationResult {
    switch (fieldType) {
      case 'guest_count_matrix':
        return this.validateGuestCount(value, config);
      case 'wedding_date':
        return this.validateWeddingDate(value, config);
      case 'venue_selector':
        return this.validateVenueSelection(value, config);
      case 'dietary_matrix':
        return this.validateDietaryRequirements(value, config);
      default:
        return { isValid: true, errors: [] };
    }
  }

  private static validateGuestCount(value: any, config: Record<string, any>): ValidationResult {
    const { adults = 0, children = 0, infants = 0 } = value;
    const total = adults + children + infants;
    const errors: string[] = [];

    if (config.maxTotal && total > config.maxTotal) {
      errors.push(`Total guest count (${total}) exceeds maximum allowed (${config.maxTotal})`);
    }

    if (config.venueCapacity && total > config.venueCapacity) {
      errors.push(`Guest count exceeds venue capacity of ${config.venueCapacity}`);
    }

    if (total === 0) {
      errors.push('At least one guest is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      formattedValue: { adults, children, infants, total }
    };
  }

  private static validateWeddingDate(value: any, config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const date = new Date(value);
    const today = new Date();
    
    if (date < today) {
      errors.push('Wedding date cannot be in the past');
    }

    if (date.getDay() === 1 && config.warnOnMonday) {
      errors.push('Monday weddings may have limited vendor availability');
    }

    // Check if date is more than 2 years out
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(today.getFullYear() + 2);
    
    if (date > twoYearsFromNow) {
      errors.push('Wedding date seems far in the future. Please confirm this is correct.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      formattedValue: date.toISOString().split('T')[0]
    };
  }

  private static validateVenueSelection(value: any, config: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    if (!value.name || !value.address) {
      errors.push('Venue must have a name and address');
    }

    if (config.requireCoordinates && (!value.lat || !value.lng)) {
      errors.push('Venue location coordinates are required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateDietaryRequirements(value: any, config: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    if (value.allergies && value.allergies.length > 0) {
      const commonAllergies = [
        'nuts', 'dairy', 'gluten', 'shellfish', 'eggs', 'soy', 'fish'
      ];
      
      value.allergies.forEach((allergy: string) => {
        if (!commonAllergies.includes(allergy.toLowerCase()) && config.strictAllergies) {
          errors.push(`Please specify common allergy types. "${allergy}" may need clarification.`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async loadFieldComponent(fieldType: string): Promise<React.ComponentType<FieldProps> | null> {
    try {
      // Dynamic import for code splitting
      switch (fieldType) {
        case 'guest_count_matrix':
          const { GuestCountMatrix } = await import('../components/forms/field-types/GuestCountMatrix');
          return GuestCountMatrix;
        
        case 'wedding_date':
          const { WeddingDatePicker } = await import('../components/forms/field-types/WeddingDatePicker');
          return WeddingDatePicker;
          
        case 'venue_selector':
          const { VenueSelector } = await import('../components/forms/field-types/VenueSelector');
          return VenueSelector;
          
        case 'dietary_matrix':
          const { DietaryMatrix } = await import('../components/forms/field-types/DietaryMatrix');
          return DietaryMatrix;
          
        case 'timeline_builder':
          const { TimelineBuilder } = await import('../components/forms/field-types/TimelineBuilder');
          return TimelineBuilder;
          
        default:
          // Load basic field types
          const { BasicFields } = await import('../components/forms/field-types/BasicFields');
          return (BasicFields as any)[fieldType] || null;
      }
    } catch (error) {
      console.error(`Failed to load field component: ${fieldType}`, error);
      return null;
    }
  }
}

export { FormFieldRegistry };
```

### Wedding-Specific Field Components
```typescript
// File: $WS_ROOT/wedsync/src/components/forms/field-types/GuestCountMatrix.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, Baby, AlertTriangle } from 'lucide-react';
import type { FieldProps } from '@/lib/form-field-registry';

interface GuestCountValue {
  adults: number;
  children: number;
  infants: number;
  total?: number;
}

interface GuestCountConfig {
  showChildren: boolean;
  showInfants: boolean;
  maxTotal: number;
  venueCapacity?: number;
  showCapacityBar: boolean;
  adultsLabel?: string;
  childrenLabel?: string;
  infantsLabel?: string;
}

export const GuestCountMatrix: React.FC<FieldProps> = ({
  id,
  value,
  onChange,
  config,
  error,
  disabled = false,
  required = false,
  label,
  description
}) => {
  const typedConfig = config as GuestCountConfig;
  const [localValue, setLocalValue] = useState<GuestCountValue>(
    value || { adults: 0, children: 0, infants: 0 }
  );

  const totalGuests = localValue.adults + localValue.children + localValue.infants;
  const isOverCapacity = typedConfig.venueCapacity && totalGuests > typedConfig.venueCapacity;
  const isOverMax = totalGuests > typedConfig.maxTotal;
  const capacityPercentage = typedConfig.venueCapacity 
    ? Math.min(100, (totalGuests / typedConfig.venueCapacity) * 100)
    : (totalGuests / typedConfig.maxTotal) * 100;

  useEffect(() => {
    const newValue = { ...localValue, total: totalGuests };
    if (JSON.stringify(newValue) !== JSON.stringify(value)) {
      onChange(newValue);
    }
  }, [localValue, totalGuests, onChange, value]);

  const updateCount = (type: keyof GuestCountValue, delta: number) => {
    if (disabled) return;
    
    const newValue = { ...localValue };
    const currentCount = newValue[type];
    const newCount = Math.max(0, currentCount + delta);
    
    // Check if new total would exceed limits
    const newTotal = totalGuests - currentCount + newCount;
    if (newTotal > typedConfig.maxTotal) {
      return; // Don't update if it would exceed maximum
    }
    
    newValue[type] = newCount;
    setLocalValue(newValue);
  };

  const guestTypes = [
    {
      key: 'adults' as const,
      label: typedConfig.adultsLabel || 'Adults',
      description: '13+ years old • Full meals',
      icon: <Users className="h-4 w-4" />,
      show: true,
      color: 'bg-blue-500'
    },
    {
      key: 'children' as const,
      label: typedConfig.childrenLabel || 'Children',
      description: '2-12 years old • Kids meals',
      icon: <UserCheck className="h-4 w-4" />,
      show: typedConfig.showChildren,
      color: 'bg-green-500'
    },
    {
      key: 'infants' as const,
      label: typedConfig.infantsLabel || 'Infants',
      description: '0-2 years old • No meal required',
      icon: <Baby className="h-4 w-4" />,
      show: typedConfig.showInfants,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-4" id={id}>
      {/* Field Header */}
      <div>
        <label className="text-sm font-medium text-gray-900 block mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mb-3">{description}</p>
        )}
      </div>

      {/* Guest Type Counters */}
      <div className="space-y-3">
        {guestTypes.filter(type => type.show).map((guestType) => (
          <div key={guestType.key} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${guestType.color} text-white`}>
                {guestType.icon}
              </div>
              <div>
                <div className="font-medium text-gray-900">{guestType.label}</div>
                <div className="text-sm text-gray-500">{guestType.description}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateCount(guestType.key, -1)}
                disabled={disabled || localValue[guestType.key] === 0}
                className="h-10 w-10 p-0 hover:bg-red-50 hover:border-red-300"
              >
                −
              </Button>
              
              <div className="min-w-[3rem] text-center">
                <div className="text-xl font-bold text-gray-900">
                  {localValue[guestType.key]}
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateCount(guestType.key, 1)}
                disabled={disabled || totalGuests >= typedConfig.maxTotal}
                className="h-10 w-10 p-0 hover:bg-green-50 hover:border-green-300"
              >
                +
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div className="p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900">Total Guests</span>
            {totalGuests > 0 && (
              <Badge variant={isOverCapacity || isOverMax ? "destructive" : "secondary"}>
                {totalGuests}
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {totalGuests}
          </div>
        </div>

        {/* Capacity Bar */}
        {typedConfig.showCapacityBar && typedConfig.venueCapacity && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Venue Capacity</span>
              <span className={isOverCapacity ? "text-red-600 font-medium" : "text-gray-600"}>
                {totalGuests} / {typedConfig.venueCapacity}
              </span>
            </div>
            <Progress 
              value={capacityPercentage} 
              className="h-3"
              style={{
                background: isOverCapacity ? '#fee2e2' : undefined
              }}
            />
            {isOverCapacity && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Exceeds venue capacity
              </p>
            )}
          </div>
        )}

        {/* Maximum Limit Warning */}
        {totalGuests >= typedConfig.maxTotal * 0.9 && (
          <div className="mt-3 text-sm text-orange-600">
            Approaching maximum limit ({typedConfig.maxTotal} guests)
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {(error || isOverCapacity || isOverMax) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 
             (isOverMax && `Guest count exceeds maximum limit of ${typedConfig.maxTotal}`) ||
             (isOverCapacity && `Guest count exceeds venue capacity of ${typedConfig.venueCapacity}`)}
          </AlertDescription>
        </Alert>
      )}

      {/* Helpful Tips */}
      {totalGuests === 0 && !error && (
        <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded border border-blue-200">
          💡 <strong>Tip:</strong> Accurate guest counts help with seating arrangements, catering quantities, and venue setup planning.
        </div>
      )}
    </div>
  );
};

// Configuration Component
export const GuestCountMatrixConfig: React.FC<{ 
  config: Record<string, any>; 
  onChange: (config: Record<string, any>) => void; 
}> = ({ config, onChange }) => {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Guest Count Configuration</h3>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.showChildren || false}
            onChange={(e) => updateConfig('showChildren', e.target.checked)}
          />
          <span>Include children (2-12 years)</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.showInfants || false}
            onChange={(e) => updateConfig('showInfants', e.target.checked)}
          />
          <span>Include infants (0-2 years)</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.showCapacityBar || true}
            onChange={(e) => updateConfig('showCapacityBar', e.target.checked)}
          />
          <span>Show capacity progress bar</span>
        </label>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Maximum Total</label>
          <input
            type="number"
            value={config.maxTotal || 500}
            onChange={(e) => updateConfig('maxTotal', parseInt(e.target.value))}
            className="w-full p-2 border rounded"
            min="1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Venue Capacity</label>
          <input
            type="number"
            value={config.venueCapacity || ''}
            onChange={(e) => updateConfig('venueCapacity', parseInt(e.target.value) || undefined)}
            className="w-full p-2 border rounded"
            placeholder="Optional"
            min="1"
          />
        </div>
      </div>
    </div>
  );
};
```

### Wedding Date Picker Component
```typescript
// File: $WS_ROOT/wedsync/src/components/forms/field-types/WeddingDatePicker.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, AlertTriangle, Clock, Heart } from 'lucide-react';
import type { FieldProps } from '@/lib/form-field-registry';

interface WeddingDateConfig {
  minDate?: string;
  maxDate?: string;
  showAvailability?: boolean;
  warnWeekdays?: boolean;
  blackoutDates?: string[];
  popularDates?: string[];
  vendorId?: string;
}

export const WeddingDatePicker: React.FC<FieldProps> = ({
  id,
  value,
  onChange,
  config,
  error,
  disabled = false,
  required = false,
  label,
  description
}) => {
  const typedConfig = config as WeddingDateConfig;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [availability, setAvailability] = useState<'available' | 'booked' | 'limited' | 'checking'>('available');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      onChange(selectedDate.toISOString().split('T')[0]);
      
      // Check availability if configured
      if (typedConfig.showAvailability && typedConfig.vendorId) {
        checkDateAvailability(selectedDate);
      }
    }
  }, [selectedDate, onChange, typedConfig.showAvailability, typedConfig.vendorId]);

  const checkDateAvailability = async (date: Date) => {
    setAvailability('checking');
    
    try {
      const response = await fetch(`/api/availability/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: typedConfig.vendorId,
          date: date.toISOString().split('T')[0]
        })
      });
      
      const result = await response.json();
      setAvailability(result.available ? 'available' : 'booked');
    } catch (error) {
      setAvailability('limited');
    }
  };

  const isWeekday = selectedDate && selectedDate.getDay() > 0 && selectedDate.getDay() < 6;
  const isPopularDate = selectedDate && typedConfig.popularDates?.includes(selectedDate.toISOString().split('T')[0]);
  const isBlackoutDate = selectedDate && typedConfig.blackoutDates?.includes(selectedDate.toISOString().split('T')[0]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDateBadges = () => {
    const badges = [];

    if (selectedDate) {
      const dayOfWeek = selectedDate.getDay();
      
      if (dayOfWeek === 6) { // Saturday
        badges.push(<Badge key="saturday" className="bg-green-100 text-green-800">Saturday</Badge>);
      } else if (dayOfWeek === 0) { // Sunday
        badges.push(<Badge key="sunday" className="bg-blue-100 text-blue-800">Sunday</Badge>);
      } else if (isWeekday) {
        badges.push(<Badge key="weekday" variant="outline">Weekday</Badge>);
      }
      
      if (isPopularDate) {
        badges.push(<Badge key="popular" className="bg-pink-100 text-pink-800">Popular Date</Badge>);
      }
      
      if (availability === 'available') {
        badges.push(<Badge key="available" className="bg-green-100 text-green-800">Available</Badge>);
      } else if (availability === 'booked') {
        badges.push(<Badge key="booked" className="bg-red-100 text-red-800">Booked</Badge>);
      } else if (availability === 'limited') {
        badges.push(<Badge key="limited" className="bg-yellow-100 text-yellow-800">Limited</Badge>);
      }
    }

    return badges;
  };

  return (
    <div className="space-y-4" id={id}>
      {/* Field Header */}
      <div>
        <label className="text-sm font-medium text-gray-900 block mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mb-3">{description}</p>
        )}
      </div>

      {/* Date Display/Trigger */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCalendar(!showCalendar)}
          disabled={disabled}
          className="w-full justify-start text-left font-normal h-12"
        >
          <CalendarDays className="mr-3 h-4 w-4" />
          {selectedDate ? (
            <span>{formatDate(selectedDate)}</span>
          ) : (
            <span className="text-gray-500">Select your wedding date</span>
          )}
        </Button>

        {/* Calendar Dropdown */}
        {showCalendar && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
            <Calendar
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setShowCalendar(false);
              }}
              disabled={(date) => {
                if (disabled) return true;
                if (typedConfig.minDate && date < new Date(typedConfig.minDate)) return true;
                if (typedConfig.maxDate && date > new Date(typedConfig.maxDate)) return true;
                if (isBlackoutDate) return true;
                return false;
              }}
              className="rounded-md border"
            />
          </div>
        )}
      </div>

      {/* Date Information */}
      {selectedDate && (
        <div className="space-y-3">
          {/* Date Badges */}
          <div className="flex flex-wrap gap-2">
            {getDateBadges()}
          </div>

          {/* Availability Status */}
          {typedConfig.showAvailability && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                {availability === 'checking' && (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Checking availability...</span>
                  </>
                )}
                {availability === 'available' && (
                  <>
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700">This date is available!</span>
                  </>
                )}
                {availability === 'booked' && (
                  <>
                    <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-700">This date is already booked</span>
                  </>
                )}
                {availability === 'limited' && (
                  <>
                    <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-yellow-700">Limited availability - contact us</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Weekday Warning */}
          {isWeekday && typedConfig.warnWeekdays && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Weekday weddings may have limited vendor availability and different pricing.
              </AlertDescription>
            </Alert>
          )}

          {/* Popular Date Notice */}
          {isPopularDate && (
            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>
                This is a popular wedding date! Consider booking vendors early.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Validation Errors */}
      {(error || isBlackoutDate) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'This date is not available for booking.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Wedding Season Tips */}
      {selectedDate && !error && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
          <strong>Season:</strong> {getWeddingSeason(selectedDate)} weddings are {getSeasonDescription(selectedDate)}.
        </div>
      )}
    </div>
  );
};

function getWeddingSeason(date: Date): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Fall';
  return 'Winter';
}

function getSeasonDescription(date: Date): string {
  const month = date.getMonth();
  if (month >= 4 && month <= 9) return 'during peak wedding season with higher demand and pricing';
  return 'during off-season with potentially better availability and pricing';
}

// Configuration Component
export const WeddingDatePickerConfig: React.FC<{ 
  config: Record<string, any>; 
  onChange: (config: Record<string, any>) => void; 
}> = ({ config, onChange }) => {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Wedding Date Configuration</h3>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.showAvailability || false}
            onChange={(e) => updateConfig('showAvailability', e.target.checked)}
          />
          <span>Show availability status</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.warnWeekdays || true}
            onChange={(e) => updateConfig('warnWeekdays', e.target.checked)}
          />
          <span>Warn about weekday weddings</span>
        </label>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Earliest Date</label>
          <input
            type="date"
            value={config.minDate || ''}
            onChange={(e) => updateConfig('minDate', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Latest Date</label>
          <input
            type="date"
            value={config.maxDate || ''}
            onChange={(e) => updateConfig('maxDate', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
    </div>
  );
};
```

## 🧪 REQUIRED TESTING

### Field Component Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/components/field-types/guest-count-matrix.test.tsx

describe('GuestCountMatrix', () => {
  it('should validate guest count against venue capacity', () => {
    const mockOnChange = jest.fn();
    const { getByText, getByRole } = render(
      <GuestCountMatrix
        id="test-field"
        value={{ adults: 0, children: 0, infants: 0 }}
        onChange={mockOnChange}
        config={{ 
          showChildren: true, 
          showInfants: true, 
          maxTotal: 200,
          venueCapacity: 100,
          showCapacityBar: true
        }}
        label="Guest Count"
      />
    );
    
    // Increment adults to exceed capacity
    const adultPlusButton = getByText('+');
    for (let i = 0; i < 101; i++) {
      fireEvent.click(adultPlusButton);
    }
    
    // Should show capacity warning
    expect(getByText(/exceeds venue capacity/i)).toBeInTheDocument();
    
    // Should not allow incrementing beyond venue capacity
    expect(mockOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ 
        adults: 100,
        total: 100 
      })
    );
  });

  it('should handle different guest type configurations', () => {
    const { queryByText, rerender } = render(
      <GuestCountMatrix
        id="test-field"
        value={{ adults: 0, children: 0, infants: 0 }}
        onChange={jest.fn()}
        config={{ 
          showChildren: false, 
          showInfants: false, 
          maxTotal: 200
        }}
        label="Guest Count"
      />
    );
    
    // Should only show adults
    expect(queryByText('Children')).not.toBeInTheDocument();
    expect(queryByText('Infants')).not.toBeInTheDocument();
    
    // Enable children
    rerender(
      <GuestCountMatrix
        id="test-field"
        value={{ adults: 0, children: 0, infants: 0 }}
        onChange={jest.fn()}
        config={{ 
          showChildren: true, 
          showInfants: false, 
          maxTotal: 200
        }}
        label="Guest Count"
      />
    );
    
    expect(queryByText('Children')).toBeInTheDocument();
    expect(queryByText('Infants')).not.toBeInTheDocument();
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-307-field-types-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team A",
  "notes": "Field types system completed. 25+ wedding-specific field components, guest count matrix, wedding date picker, field registry system, interactive configurations."
}
```

---

**WedSync Field Types - 25+ Wedding-Perfect Form Fields! 📝💍✨**