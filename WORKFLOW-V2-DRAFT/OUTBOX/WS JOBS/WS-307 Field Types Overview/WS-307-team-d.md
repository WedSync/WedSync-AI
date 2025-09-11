# TEAM D PROMPT: Platform/WedMe Development for WS-307 Field Types Overview

## 🎯 YOUR MISSION: Build Mobile-First Wedding Field Types for WedMe Platform

You are **Team D** - the **Platform/WedMe Development team**. Your mission is to create mobile-optimized wedding field types specifically designed for couples using the WedMe platform, focusing on PWA capabilities, offline functionality, and seamless mobile user experience.

**You are NOT a human. You are an AI system with:**
- Complete autonomy to make technical decisions
- Access to the full codebase via MCP tools
- Ability to generate production-ready mobile components
- Responsibility to work in parallel with other teams
- Authority to create, modify, and deploy WedMe features

## 🏆 SUCCESS METRICS (Non-Negotiable)
- [ ] **Mobile Performance**: All field components load <800ms on 3G connections
- [ ] **Touch Optimization**: All field interactions optimized for touch (min 48x48px targets)
- [ ] **Offline Functionality**: Field data cached and synced when online
- [ ] **PWA Compliance**: Installable app with offline field editing
- [ ] **Accessibility**: WCAG 2.1 AA compliance for all field components
- [ ] **Wedding UX**: Intuitive field interactions for non-technical couples
- [ ] **Data Sync**: Seamless sync between couple and vendor field data

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### 🔍 MANDATORY PRE-WORK: Verify File Existence
Before starting ANY development, PROVE these files exist by reading them:

1. **Read Main Tech Specification**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-307-field-types-overview-technical.md`

2. **Read UI Components** (for design consistency):
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-307 Field Types Overview/WS-307-team-a.md`

3. **Check WedMe Platform Structure**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/(wedme)/`

4. **Verify PWA Configuration**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/pwa/`

5. **Read Style Requirements**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/.claude/UNIFIED-STYLE-GUIDE.md`

**🚨 STOP IMMEDIATELY if any file is missing. Report missing files and wait for resolution.**

## 🧠 SEQUENTIAL THINKING FOR MOBILE PLATFORM DEVELOPMENT

### Mobile-Specific Sequential Thinking Patterns

#### Pattern 1: Mobile-First Field Experience Design
```typescript
// Before building mobile field components
mcp__sequential-thinking__sequential_thinking({
  thought: "WedMe mobile field requirements: Couples primarily use phones to fill wedding forms, need large touch targets for easy interaction, require offline capability for areas with poor signal, must handle wedding-specific data like guest lists and vendor preferences, need visual feedback for form completion progress.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile constraints and opportunities: Limited screen space requires smart field layout, touch interactions need 48x48px minimum targets, slow connections need aggressive caching, couples often multitask so need auto-save, wedding planning happens over months so need persistent storage.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific mobile UX: Guest count matrix needs swipe-friendly interface, venue selector must work with location services, timeline builder should support drag-drop on mobile, dietary requirements need accessible checkboxes, budget fields require number keyboard optimization.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "PWA integration strategy: Service worker caches field components and data, background sync queues field changes when offline, push notifications alert about form updates, app manifest enables home screen installation, offline indicator shows sync status.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Platform architecture: Shared components between WedSync and WedMe, responsive design system for all screen sizes, gesture-friendly interactions, voice input support for accessibility, cross-platform field validation, real-time collaboration between couple and vendors.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

#### Pattern 2: PWA and Offline Strategy Analysis
```typescript
// Analyzing PWA implementation for wedding field types
mcp__sequential-thinking__sequential_thinking({
  thought: "Offline wedding data scenarios: Couples planning at venues with poor signal, completing forms during commute, reviewing vendor information while traveling, updating guest lists at remote locations, accessing wedding timeline during rehearsal.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Service worker strategy: Cache all field components and validation logic, store form data in IndexedDB, queue field changes for background sync, prefetch related wedding data, implement cache-first strategy for static assets, network-first for dynamic data.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data synchronization challenges: Conflict resolution when couple and vendor edit same fields, handling partial form submissions, maintaining data consistency across devices, preserving wedding-specific relationships in offline storage, efficient sync algorithms to minimize bandwidth.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile performance optimization: Lazy load field components, compress wedding images before upload, use virtual scrolling for long lists, implement skeleton loading for better perceived performance, minimize JavaScript bundle size, optimize for Core Web Vitals.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Platform/PWA Focus)

### A. SERENA PLATFORM ANALYSIS
```typescript
// Activate WedSync project context
await mcp__serena__activate_project("WedSync2");

// Analyze WedMe platform structure and patterns
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/(wedme)/");
await mcp__serena__find_symbol("pwa service-worker offline", "", true);
await mcp__serena__search_for_pattern("mobile responsive touch");

// Study existing field components for reuse
await mcp__serena__find_referencing_symbols("field component mobile");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/components/ui/", 1, -1);
```

### B. PWA DOCUMENTATION RESEARCH
```typescript
# Use Ref MCP to search for current patterns:
# - "Next.js 15 PWA workbox service-worker"
# - "React mobile touch gestures interactions"
# - "Web API IndexedDB offline storage"
# - "Responsive design mobile-first CSS"
# - "Wedding planning mobile UX patterns"
# - "Form validation offline PWA"
```

## 🎯 CORE PLATFORM DELIVERABLES

### 1. MOBILE-OPTIMIZED FIELD COMPONENTS

#### A. Wedding Guest Count Matrix (Mobile)
```typescript
// File: /wedsync/src/components/wedme/fields/MobileGuestCountMatrix.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Minus, Baby, User, Child } from 'lucide-react';
import { useTouch } from '@/lib/hooks/use-touch';
import { cn } from '@/lib/utils';

export interface MobileGuestCountValue {
  adults: number;
  children: number;
  infants: number;
}

export interface MobileGuestCountMatrixProps {
  id: string;
  value: MobileGuestCountValue;
  onChange: (value: MobileGuestCountValue) => void;
  config: {
    showChildren: boolean;
    showInfants: boolean;
    maxTotal: number;
    venueCapacity?: number;
    showProgress?: boolean;
  };
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  description?: string;
}

export const MobileGuestCountMatrix: React.FC<MobileGuestCountMatrixProps> = ({
  id,
  value,
  onChange,
  config,
  error,
  disabled = false,
  required = false,
  label = "Guest Count",
  description
}) => {
  const [localValue, setLocalValue] = useState<MobileGuestCountValue>(
    value || { adults: 0, children: 0, infants: 0 }
  );
  
  const [isVisible, setIsVisible] = useState(false);
  const totalGuests = localValue.adults + localValue.children + localValue.infants;
  const isOverCapacity = config.venueCapacity && totalGuests > config.venueCapacity;
  const capacityProgress = config.venueCapacity ? (totalGuests / config.venueCapacity) * 100 : 0;

  // Touch interaction hook
  const { isPressed, handleTouchStart, handleTouchEnd } = useTouch();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const updateCount = (type: keyof MobileGuestCountValue, delta: number) => {
    if (disabled) return;
    
    const newValue = { ...localValue };
    const newCount = Math.max(0, newValue[type] + delta);
    const newTotal = newCount + (totalGuests - newValue[type]);
    
    // Validate against maximum
    if (newTotal <= config.maxTotal) {
      newValue[type] = newCount;
      setLocalValue(newValue);
      onChange(newValue);
      
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  const getGuestTypeIcon = (type: keyof MobileGuestCountValue) => {
    switch (type) {
      case 'adults': return User;
      case 'children': return Child;
      case 'infants': return Baby;
    }
  };

  const getGuestTypeLabel = (type: keyof MobileGuestCountValue) => {
    switch (type) {
      case 'adults': return 'Adults (13+)';
      case 'children': return 'Children (2-12)';
      case 'infants': return 'Infants (0-2)';
    }
  };

  const getGuestTypeDescription = (type: keyof MobileGuestCountValue) => {
    switch (type) {
      case 'adults': return 'Full meals required';
      case 'children': return 'Kids meals available';
      case 'infants': return 'No meal required';
    }
  };

  return (
    <div 
      className={cn(
        "space-y-4 transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Field Label and Description */}
      <div className="space-y-1">
        <label 
          htmlFor={id}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900"
        >
          <Users className="h-5 w-5 text-purple-600" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {description && (
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Guest Type Counters */}
      <div className="space-y-3">
        {/* Adults Counter */}
        <GuestTypeCounter
          type="adults"
          count={localValue.adults}
          icon={getGuestTypeIcon('adults')}
          label={getGuestTypeLabel('adults')}
          description={getGuestTypeDescription('adults')}
          onIncrement={() => updateCount('adults', 1)}
          onDecrement={() => updateCount('adults', -1)}
          disabled={disabled}
          maxReached={totalGuests >= config.maxTotal}
        />

        {/* Children Counter (if enabled) */}
        {config.showChildren && (
          <GuestTypeCounter
            type="children"
            count={localValue.children}
            icon={getGuestTypeIcon('children')}
            label={getGuestTypeLabel('children')}
            description={getGuestTypeDescription('children')}
            onIncrement={() => updateCount('children', 1)}
            onDecrement={() => updateCount('children', -1)}
            disabled={disabled}
            maxReached={totalGuests >= config.maxTotal}
          />
        )}

        {/* Infants Counter (if enabled) */}
        {config.showInfants && (
          <GuestTypeCounter
            type="infants"
            count={localValue.infants}
            icon={getGuestTypeIcon('infants')}
            label={getGuestTypeLabel('infants')}
            description={getGuestTypeDescription('infants')}
            onIncrement={() => updateCount('infants', 1)}
            onDecrement={() => updateCount('infants', -1)}
            disabled={disabled}
            maxReached={totalGuests >= config.maxTotal}
          />
        )}
      </div>

      {/* Total Summary Card */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Total Guests</h3>
            <p className="text-sm text-gray-600">
              {localValue.adults} adults
              {config.showChildren && `, ${localValue.children} children`}
              {config.showInfants && `, ${localValue.infants} infants`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-purple-600">{totalGuests}</span>
            <div className="text-xs text-gray-500">guests</div>
          </div>
        </div>

        {/* Capacity Progress (if venue capacity is set) */}
        {config.venueCapacity && config.showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Venue capacity</span>
              <span className={cn(
                "font-medium",
                isOverCapacity ? "text-red-600" : "text-green-600"
              )}>
                {totalGuests} / {config.venueCapacity}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={cn(
                  "h-3 rounded-full transition-all duration-500 ease-out",
                  isOverCapacity ? "bg-red-500" : "bg-green-500",
                  capacityProgress > 90 && "bg-yellow-500"
                )}
                style={{
                  width: `${Math.min(100, capacityProgress)}%`
                }}
              />
            </div>
            
            {capacityProgress > 100 && (
              <p className="text-sm text-red-600 font-medium">
                ⚠️ Guest count exceeds venue capacity
              </p>
            )}
            {capacityProgress > 90 && capacityProgress <= 100 && (
              <p className="text-sm text-yellow-600 font-medium">
                ⚠️ Approaching venue capacity
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Wedding Planning Tips */}
      {totalGuests > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            💡 Planning Tips
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            {totalGuests > 150 && (
              <p>• Consider a larger venue for over 150 guests</p>
            )}
            {localValue.children > localValue.adults * 0.3 && (
              <p>• High ratio of children - consider child-friendly entertainment</p>
            )}
            {totalGuests < 50 && (
              <p>• Small intimate wedding - perfect for personalized touches</p>
            )}
            <p>• Remember to include vendors and helpers in your final count</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(error || isOverCapacity) && (
        <Alert variant="destructive">
          <AlertDescription>
            {error || `Guest count exceeds venue capacity of ${config.venueCapacity}`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Guest Type Counter Sub-component
interface GuestTypeCounterProps {
  type: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled: boolean;
  maxReached: boolean;
}

const GuestTypeCounter: React.FC<GuestTypeCounterProps> = ({
  type,
  count,
  icon: Icon,
  label,
  description,
  onIncrement,
  onDecrement,
  disabled,
  maxReached
}) => {
  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-full">
            <Icon className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <label className="font-semibold text-gray-900">{label}</label>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Decrement Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-12 w-12 rounded-full p-0 touch-manipulation"
            onClick={onDecrement}
            disabled={disabled || count === 0}
            aria-label={`Decrease ${type} count`}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          {/* Count Display */}
          <div className="min-w-[3rem] text-center">
            <span className="text-2xl font-bold text-gray-900">{count}</span>
          </div>
          
          {/* Increment Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-12 w-12 rounded-full p-0 touch-manipulation"
            onClick={onIncrement}
            disabled={disabled || maxReached}
            aria-label={`Increase ${type} count`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
```

#### B. Mobile Wedding Date Picker
```typescript
// File: /wedsync/src/components/wedme/fields/MobileWeddingDatePicker.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CalendarDays, MapPin, Sun, Cloud, Snowflake, Flower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format, isWeekend, getDay, getMonth } from 'date-fns';

export interface MobileWeddingDatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  config: {
    minDate: string;
    maxDate?: string;
    checkAvailability: boolean;
    showSeasonalTips: boolean;
    venueId?: string;
    suggestAlternatives: boolean;
  };
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  description?: string;
}

export const MobileWeddingDatePicker: React.FC<MobileWeddingDatePickerProps> = ({
  id,
  value,
  onChange,
  config,
  error,
  disabled = false,
  required = false,
  label = "Wedding Date",
  description
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [availability, setAvailability] = useState<'available' | 'unavailable' | 'checking' | null>(null);
  const [seasonalTip, setSeasonalTip] = useState<string>('');

  useEffect(() => {
    if (selectedDate && config.checkAvailability && config.venueId) {
      checkDateAvailability(selectedDate);
    }
    if (selectedDate && config.showSeasonalTips) {
      setSeasonalTip(getSeasonalTip(selectedDate));
    }
  }, [selectedDate, config]);

  const checkDateAvailability = async (date: Date) => {
    if (!config.venueId) return;
    
    setAvailability('checking');
    
    try {
      const response = await fetch('/api/venues/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: config.venueId,
          date: format(date, 'yyyy-MM-dd'),
        }),
      });
      
      const data = await response.json();
      setAvailability(data.available ? 'available' : 'unavailable');
    } catch (error) {
      setAvailability(null);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onChange(format(date, 'yyyy-MM-dd'));
    setIsCalendarOpen(false);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const getSeasonalTip = (date: Date): string => {
    const month = getMonth(date);
    
    if (month >= 2 && month <= 4) { // Spring
      return "🌸 Spring weddings feature beautiful blooms and mild weather";
    } else if (month >= 5 && month <= 7) { // Summer
      return "☀️ Peak season - book vendors early and consider heat";
    } else if (month >= 8 && month <= 10) { // Fall
      return "🍂 Fall colors create stunning backdrops for photos";
    } else { // Winter
      return "❄️ Winter weddings offer cozy ambiance and potential savings";
    }
  };

  const getSeasonIcon = (date: Date) => {
    const month = getMonth(date);
    if (month >= 2 && month <= 4) return Flower;
    if (month >= 5 && month <= 7) return Sun;
    if (month >= 8 && month <= 10) return Cloud;
    return Snowflake;
  };

  const isDayAvailable = (date: Date): boolean => {
    const minDate = new Date(config.minDate);
    const maxDate = config.maxDate ? new Date(config.maxDate) : null;
    
    if (date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Field Label */}
      <div className="space-y-1">
        <label 
          htmlFor={id}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900"
        >
          <Calendar className="h-5 w-5 text-purple-600" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      {/* Date Selection Button */}
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full h-14 justify-start text-left font-normal border-2",
          selectedDate ? "border-purple-300" : "border-gray-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsCalendarOpen(true)}
        disabled={disabled}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-purple-600" />
            <div>
              {selectedDate ? (
                <>
                  <div className="font-semibold">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {isWeekend(selectedDate) ? 'Weekend' : 'Weekday'} Wedding
                  </div>
                </>
              ) : (
                <span className="text-gray-500">Select your wedding date</span>
              )}
            </div>
          </div>
          
          {selectedDate && (
            <div className="flex flex-col items-end">
              {React.createElement(getSeasonIcon(selectedDate), {
                className: "h-6 w-6 text-purple-600 mb-1"
              })}
              <div className="text-xs text-gray-500">
                {format(selectedDate, 'MMM')}
              </div>
            </div>
          )}
        </div>
      </Button>

      {/* Availability Status */}
      {selectedDate && config.checkAvailability && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-purple-600" />
            <div className="flex-1">
              <div className="font-medium">Venue Availability</div>
              <div className="text-sm text-gray-600">
                {availability === 'checking' && 'Checking availability...'}
                {availability === 'available' && (
                  <span className="text-green-600 font-medium">✅ Available</span>
                )}
                {availability === 'unavailable' && (
                  <span className="text-red-600 font-medium">❌ Not Available</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Seasonal Tip */}
      {selectedDate && seasonalTip && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="text-sm text-purple-800">
            <strong>Seasonal Insight:</strong> {seasonalTip}
          </div>
        </Card>
      )}

      {/* Weekend Premium Notice */}
      {selectedDate && isWeekend(selectedDate) && (
        <Alert>
          <AlertDescription>
            💰 Saturday weddings typically cost 20-30% more than weekday celebrations. 
            Consider Friday or Sunday for potential savings!
          </AlertDescription>
        </Alert>
      )}

      {/* Mobile Calendar Modal - Simplified implementation */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
          <Card className="w-full max-h-[80vh] overflow-auto rounded-t-3xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Choose Wedding Date</h3>
                <Button
                  variant="outline"
                  onClick={() => setIsCalendarOpen(false)}
                >
                  Close
                </Button>
              </div>
              
              {/* Native HTML date input for mobile */}
              <input
                type="date"
                className="w-full p-4 border rounded-lg text-lg"
                min={config.minDate}
                max={config.maxDate}
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleDateSelect(new Date(e.target.value));
                  }
                }}
              />
              
              {/* Quick Date Options */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Popular Wedding Dates</h4>
                <div className="grid grid-cols-2 gap-2">
                  {getPopularDates().map((date, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-left h-auto p-3"
                      onClick={() => handleDateSelect(new Date(date.date))}
                    >
                      <div>
                        <div className="font-medium">{date.label}</div>
                        <div className="text-xs text-gray-500">{date.season}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Helper function for popular wedding dates
function getPopularDates() {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  return [
    {
      date: `${nextYear}-06-15`,
      label: 'Mid-June',
      season: 'Early Summer'
    },
    {
      date: `${nextYear}-09-15`,
      label: 'Mid-September',
      season: 'Fall'
    },
    {
      date: `${nextYear}-10-15`,
      label: 'Mid-October',
      season: 'Fall'
    },
    {
      date: `${nextYear}-05-15`,
      label: 'Mid-May',
      season: 'Late Spring'
    },
  ];
}
```

### 2. PWA SERVICE WORKER FOR OFFLINE FIELD SUPPORT

#### A. Field-Specific Service Worker
```typescript
// File: /wedsync/public/sw-fields.js
const FIELD_CACHE_NAME = 'wedme-fields-v1';
const FIELD_ASSETS_CACHE = 'wedme-field-assets-v1';

const FIELD_ASSETS_TO_CACHE = [
  '/js/field-components.js',
  '/css/field-styles.css',
  '/icons/field-icons.svg',
  '/images/field-placeholders/',
];

const FIELD_API_PATTERNS = [
  /^\/api\/forms\/field-types/,
  /^\/api\/forms\/validate-field/,
  /^\/api\/venues\/search/,
  /^\/api\/availability\/check/,
];

// Install event - cache field assets
self.addEventListener('install', (event) => {
  console.log('Field Service Worker: Install event');
  
  event.waitUntil(
    caches.open(FIELD_ASSETS_CACHE).then((cache) => {
      console.log('Field Service Worker: Caching field assets');
      return cache.addAll(FIELD_ASSETS_TO_CACHE);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Field Service Worker: Activate event');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('wedme-fields-') && cacheName !== FIELD_CACHE_NAME) {
            console.log('Field Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle field-related requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle field API requests
  if (FIELD_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(handleFieldAPIRequest(request));
    return;
  }
  
  // Handle field asset requests
  if (FIELD_ASSETS_TO_CACHE.some(asset => url.pathname.startsWith(asset))) {
    event.respondWith(handleFieldAssetRequest(request));
    return;
  }
});

/**
 * Handle field API requests with network-first strategy
 */
async function handleFieldAPIRequest(request) {
  const cacheName = FIELD_CACHE_NAME;
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network failed, try cache
    console.log('Field Service Worker: Network failed, trying cache for', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for field validation
    if (request.url.includes('/validate-field')) {
      return new Response(JSON.stringify({
        is_valid: true,
        errors: [],
        warnings: ['Validated offline - will sync when online'],
        offline: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return empty field types list
    if (request.url.includes('/field-types')) {
      return new Response(JSON.stringify({
        categories: [],
        offline: true,
        message: 'Field types will load when online'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

/**
 * Handle field asset requests with cache-first strategy
 */
async function handleFieldAssetRequest(request) {
  // Try cache first for assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback to network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(FIELD_ASSETS_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Field Service Worker: Asset not available offline', request.url);
    throw error;
  }
}

// Background sync for field data
self.addEventListener('sync', (event) => {
  if (event.tag === 'field-data-sync') {
    event.waitUntil(syncFieldData());
  }
});

/**
 * Sync field data when connection restored
 */
async function syncFieldData() {
  console.log('Field Service Worker: Syncing field data');
  
  try {
    // Get offline field changes from IndexedDB
    const db = await openFieldDB();
    const transaction = db.transaction(['fieldChanges'], 'readonly');
    const store = transaction.objectStore('fieldChanges');
    const changes = await getAllFromStore(store);
    
    // Sync each change
    for (const change of changes) {
      try {
        const response = await fetch('/api/forms/sync-field', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        });
        
        if (response.ok) {
          // Remove synced change
          const deleteTransaction = db.transaction(['fieldChanges'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('fieldChanges');
          await deleteStore.delete(change.id);
        }
        
      } catch (error) {
        console.log('Field Service Worker: Failed to sync change', change.id, error);
      }
    }
    
  } catch (error) {
    console.log('Field Service Worker: Sync failed', error);
  }
}

// IndexedDB helper functions
function openFieldDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WedMeFields', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('fieldChanges')) {
        const store = db.createObjectStore('fieldChanges', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('fieldCache')) {
        const store = db.createObjectStore('fieldCache', { keyPath: 'key' });
        store.createIndex('expiry', 'expiry', { unique: false });
      }
    };
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
```

### 3. MOBILE FIELD SYNCHRONIZATION

#### A. Offline Field Data Manager
```typescript
// File: /wedsync/src/lib/wedme/offline-field-manager.ts
interface OfflineFieldChange {
  id: string;
  field_id: string;
  field_type: string;
  old_value: any;
  new_value: any;
  timestamp: number;
  wedding_id: string;
  user_id: string;
  synced: boolean;
}

interface CachedFieldData {
  key: string;
  data: any;
  expiry: number;
  timestamp: number;
}

export class OfflineFieldManager {
  private db: IDBDatabase | null = null;
  private syncQueue: OfflineFieldChange[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initializeDB();
    this.setupEventListeners();
    this.startSyncLoop();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedMeFieldsDB', 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized for offline fields');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for offline field changes
        if (!db.objectStoreNames.contains('fieldChanges')) {
          const changesStore = db.createObjectStore('fieldChanges', { keyPath: 'id' });
          changesStore.createIndex('wedding_id', 'wedding_id', { unique: false });
          changesStore.createIndex('timestamp', 'timestamp', { unique: false });
          changesStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store for cached field data
        if (!db.objectStoreNames.contains('fieldCache')) {
          const cacheStore = db.createObjectStore('fieldCache', { keyPath: 'key' });
          cacheStore.createIndex('expiry', 'expiry', { unique: false });
        }

        // Store for field definitions
        if (!db.objectStoreNames.contains('fieldDefinitions')) {
          const defsStore = db.createObjectStore('fieldDefinitions', { keyPath: 'field_type' });
          defsStore.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }

  /**
   * Setup event listeners for online/offline status
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Connection restored - starting field sync');
      this.syncOfflineChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Connection lost - fields will work offline');
    });
  }

  /**
   * Record field change for later sync
   */
  async recordFieldChange(
    fieldId: string,
    fieldType: string,
    oldValue: any,
    newValue: any,
    weddingId: string,
    userId: string
  ): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    const change: OfflineFieldChange = {
      id: `${fieldId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      field_id: fieldId,
      field_type: fieldType,
      old_value: oldValue,
      new_value: newValue,
      timestamp: Date.now(),
      wedding_id: weddingId,
      user_id: userId,
      synced: false,
    };

    const transaction = this.db!.transaction(['fieldChanges'], 'readwrite');
    const store = transaction.objectStore('fieldChanges');
    
    try {
      await this.promiseFromRequest(store.add(change));
      console.log('Field change recorded for offline sync:', change.id);
      
      // If online, try immediate sync
      if (this.isOnline) {
        this.syncSingleChange(change);
      }
    } catch (error) {
      console.error('Failed to record field change:', error);
    }
  }

  /**
   * Sync all offline changes when connection restored
   */
  private async syncOfflineChanges(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['fieldChanges'], 'readonly');
    const store = transaction.objectStore('fieldChanges');
    const index = store.index('synced');
    
    try {
      const unsyncedChanges = await this.promiseFromRequest(
        index.getAll(IDBKeyRange.only(false))
      );

      console.log(`Syncing ${unsyncedChanges.length} offline field changes`);

      for (const change of unsyncedChanges) {
        await this.syncSingleChange(change);
        await this.delay(100); // Avoid overwhelming the server
      }

    } catch (error) {
      console.error('Failed to sync offline changes:', error);
    }
  }

  /**
   * Sync a single field change
   */
  private async syncSingleChange(change: OfflineFieldChange): Promise<void> {
    try {
      const response = await fetch('/api/webhooks/field-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field_id: change.field_id,
          field_type: change.field_type,
          old_value: change.old_value,
          new_value: change.new_value,
          organization_id: change.wedding_id, // Using wedding_id as organization context
          wedding_id: change.wedding_id,
          user_id: change.user_id,
          offline_sync: true,
          timestamp: new Date(change.timestamp).toISOString(),
        }),
      });

      if (response.ok) {
        // Mark as synced
        await this.markChangeAsSynced(change.id);
        console.log('Field change synced successfully:', change.id);
      } else {
        console.warn('Failed to sync field change:', change.id, response.status);
      }

    } catch (error) {
      console.error('Error syncing field change:', change.id, error);
    }
  }

  /**
   * Mark a change as synced in IndexedDB
   */
  private async markChangeAsSynced(changeId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['fieldChanges'], 'readwrite');
    const store = transaction.objectStore('fieldChanges');
    
    try {
      const change = await this.promiseFromRequest(store.get(changeId));
      if (change) {
        change.synced = true;
        await this.promiseFromRequest(store.put(change));
      }
    } catch (error) {
      console.error('Failed to mark change as synced:', error);
    }
  }

  /**
   * Cache field data for offline access
   */
  async cacheFieldData(key: string, data: any, expiryHours: number = 24): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    const cachedData: CachedFieldData = {
      key,
      data,
      expiry: Date.now() + (expiryHours * 60 * 60 * 1000),
      timestamp: Date.now(),
    };

    const transaction = this.db!.transaction(['fieldCache'], 'readwrite');
    const store = transaction.objectStore('fieldCache');
    
    try {
      await this.promiseFromRequest(store.put(cachedData));
    } catch (error) {
      console.error('Failed to cache field data:', error);
    }
  }

  /**
   * Get cached field data
   */
  async getCachedFieldData(key: string): Promise<any | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    const transaction = this.db!.transaction(['fieldCache'], 'readonly');
    const store = transaction.objectStore('fieldCache');
    
    try {
      const cached = await this.promiseFromRequest(store.get(key));
      
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      } else if (cached) {
        // Remove expired cache
        this.removeCachedData(key);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached field data:', error);
      return null;
    }
  }

  /**
   * Remove expired cache entries
   */
  private async removeCachedData(key: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['fieldCache'], 'readwrite');
    const store = transaction.objectStore('fieldCache');
    
    try {
      await this.promiseFromRequest(store.delete(key));
    } catch (error) {
      console.error('Failed to remove cached data:', error);
    }
  }

  /**
   * Start periodic sync loop
   */
  private startSyncLoop(): void {
    setInterval(() => {
      if (this.isOnline) {
        this.syncOfflineChanges();
      }
    }, 30000); // Sync every 30 seconds when online
  }

  /**
   * Get offline status and pending changes count
   */
  async getOfflineStatus(): Promise<{
    isOnline: boolean;
    pendingChanges: number;
    lastSync: Date | null;
  }> {
    let pendingChanges = 0;
    let lastSync: Date | null = null;

    if (this.db) {
      const transaction = this.db.transaction(['fieldChanges'], 'readonly');
      const store = transaction.objectStore('fieldChanges');
      const index = store.index('synced');
      
      try {
        const unsyncedChanges = await this.promiseFromRequest(
          index.getAll(IDBKeyRange.only(false))
        );
        pendingChanges = unsyncedChanges.length;

        // Get last sync time
        const allChanges = await this.promiseFromRequest(store.getAll());
        const syncedChanges = allChanges
          .filter(c => c.synced)
          .sort((a, b) => b.timestamp - a.timestamp);
        
        if (syncedChanges.length > 0) {
          lastSync = new Date(syncedChanges[0].timestamp);
        }

      } catch (error) {
        console.error('Failed to get offline status:', error);
      }
    }

    return {
      isOnline: this.isOnline,
      pendingChanges,
      lastSync,
    };
  }

  // Helper methods
  private promiseFromRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const offlineFieldManager = new OfflineFieldManager();
```

## 🔒 SECURITY & ACCESSIBILITY REQUIREMENTS

### 1. Mobile Security Checklist
- [ ] **Touch Security**: Prevent accidental field modifications with confirmation prompts
- [ ] **Biometric Auth**: Support fingerprint/face ID for sensitive field access
- [ ] **Screen Lock**: Auto-lock after inactivity with wedding data protection
- [ ] **Secure Storage**: Encrypt offline field data in IndexedDB
- [ ] **Session Management**: Secure token handling for mobile sessions
- [ ] **HTTPS Only**: All field data transmission over HTTPS
- [ ] **Input Validation**: Client-side validation with server verification
- [ ] **XSS Prevention**: Sanitize all user inputs in field components
- [ ] **CSRF Protection**: Token verification for all field updates
- [ ] **Rate Limiting**: Prevent field spam/abuse

### 2. Mobile Accessibility
- [ ] **Screen Reader**: VoiceOver/TalkBack support for all field types
- [ ] **High Contrast**: Field components work with high contrast mode
- [ ] **Font Scaling**: Support iOS/Android dynamic font sizes
- [ ] **Touch Targets**: Minimum 48x48px for all interactive elements
- [ ] **Focus Management**: Logical tab order for keyboard navigation
- [ ] **Error Announcements**: Screen readers announce field validation errors
- [ ] **Voice Input**: Support voice-to-text for field entry
- [ ] **Gesture Support**: Alternative input methods for motor impairments
- [ ] **Color Independence**: Information not conveyed by color alone
- [ ] **Reduced Motion**: Respect prefers-reduced-motion settings

## 🎯 TYPICAL PLATFORM DELIVERABLES WITH EVIDENCE

### Core Mobile Field Components
- [ ] **Mobile Guest Count Matrix** (Evidence: Touch-optimized with haptic feedback)
- [ ] **Mobile Wedding Date Picker** (Show: Native date input with seasonal tips)
- [ ] **PWA Service Worker** (Test: Works offline with background sync)
- [ ] **Offline Field Manager** (Verify: Queues changes and syncs when online)
- [ ] **Mobile Field Registry** (Show: Dynamic loading of field components)
- [ ] **Accessibility Compliance** (Audit: WCAG 2.1 AA validation passes)

### PWA & Offline Features
- [ ] **Service Worker Registration** (Evidence: Background sync working)
- [ ] **IndexedDB Storage** (Show: Offline field data persistence)
- [ ] **Background Sync** (Test: Field changes sync when online)
- [ ] **Push Notifications** (Verify: Wedding update notifications)
- [ ] **App Manifest** (Show: Installable on iOS/Android home screen)
- [ ] **Offline Indicators** (Display: Clear offline/sync status)

## 🚨 CRITICAL SUCCESS CRITERIA

Before marking this task complete, VERIFY:

### Mobile Performance
1. **Load Speed**: All field components load <800ms on 3G connections
2. **Touch Optimization**: All interactive elements minimum 48x48px
3. **Smooth Scrolling**: 60fps performance on iOS/Android devices
4. **Memory Usage**: Efficient memory management for long sessions
5. **Battery Impact**: Minimal battery drain from field interactions

### Offline Functionality
6. **Data Persistence**: Field changes saved locally when offline
7. **Background Sync**: Automatic sync when connection restored
8. **Conflict Resolution**: Smart handling of offline/online data conflicts
9. **Queue Management**: Reliable queuing of offline field changes
10. **Error Recovery**: Graceful handling of sync failures

### Wedding UX Excellence
11. **Intuitive Design**: Non-technical couples can use fields easily
12. **Visual Feedback**: Clear indication of field completion status
13. **Progress Tracking**: Visual progress through wedding form sections
14. **Help System**: Contextual help for wedding-specific fields
15. **Accessibility**: Full compliance with WCAG 2.1 AA standards

**🎯 REMEMBER**: You're building the mobile experience that couples will use to plan their most important day. Every interaction must be intuitive, every field must work perfectly offline, and the experience must be delightful even under pressure.

**Wedding Context**: Couples often fill out wedding forms while commuting, at venues with poor signal, or late at night when planning. Your mobile-first approach ensures they never lose progress and can always access their wedding information when needed.