# WS-253 Florist Intelligence System - Team A Frontend Prompt

## EVIDENCE OF REALITY REQUIREMENTS (CRITICAL)
**MANDATORY: This task is incomplete until ALL evidence below is provided:**

### Typecheck Results (MANDATORY)
```bash
# MUST run and pass these commands
cd wedsync
npm run typecheck  # Must show 0 errors
npm run build      # Must complete successfully  
npm run test      # Must show >90% coverage for new components
```

### File Existence Proof (MANDATORY)
**After implementation, run and screenshot:**
```bash
ls -la src/app/\(dashboard\)/florist/
ls -la src/components/florist/
ls -la src/lib/florist/
```

### Working Feature Demonstration (MANDATORY) 
**Use Playwright MCP to capture:**
1. Screenshot of florist intelligence main interface with all tabs
2. Screenshot of flower search with color filters and seasonal scoring
3. Screenshot of color palette generation with flower matching
4. Screenshot of sustainability analysis with carbon footprint charts
5. Screenshot of mobile interface on iPhone SE (375px) working properly

### Test Results (MANDATORY)
- Unit tests for FloristIntelligence component (>95% coverage)
- Integration tests for color picker and flower search
- E2E tests for complete florist workflow
- Performance tests showing <300ms search response

## SECURITY REQUIREMENTS (MANDATORY)

### withSecureValidation Middleware Usage
```typescript
// ALL form submissions MUST use this pattern:
import { withSecureValidation } from '@/lib/security/withSecureValidation';

// For flower search forms:
const FlowerSearchSchema = z.object({
  colors: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).optional(),
  wedding_date: z.string().datetime().optional(),
  style: z.enum(['romantic', 'modern', 'rustic', 'classic', 'bohemian']).optional(),
  // ... other fields
});

// MANDATORY security validation:
export const handleFlowerSearch = withSecureValidation(
  FlowerSearchSchema,
  async (validatedData, request) => {
    // Only proceed with validated data
    return await searchFlowers(validatedData);
  }
);
```

### Input Sanitization Requirements
- Color hex codes: MUST validate exact 6-digit format with regex
- Wedding dates: MUST validate as proper ISO dates only
- User text inputs: MUST sanitize with DOMPurify before AI processing
- File uploads: MUST validate file type and scan for malicious content
- Search queries: MUST escape SQL injection patterns

### Data Protection
- Color palette data: Store encrypted using AES-256
- User flower preferences: Anonymize in analytics
- AI-generated recommendations: Log securely without personal data
- Image uploads: Store in encrypted Supabase storage bucket

## NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### Parent Dashboard Integration
**The florist intelligence system MUST integrate into:**
- Main supplier dashboard at `/dashboard/florist/intelligence`  
- Accessible via "Smart Design Tools" section in florist menu
- Show florist icon (🌺) next to navigation item
- Include search icon (🔍) for flower search functionality

### Breadcrumb Navigation
```typescript
// MANDATORY breadcrumb structure:
<BreadcrumbNav items={[
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Florist Tools', href: '/dashboard/florist' },  
  { label: 'AI Intelligence', href: '/dashboard/florist/intelligence' },
  { label: currentTool, href: `/dashboard/florist/${currentTool}` } // flower-search, color-palette, etc.
]} />
```

### Mobile Navigation Requirements
```typescript
// MANDATORY mobile navigation:
<MobileNav>
  <MobileNavItem href="/dashboard/florist/intelligence" icon="🌺" label="AI Tools" />
  <MobileNavItem href="/dashboard/florist/search" icon="🔍" label="Flower Search" />
  <MobileNavItem href="/dashboard/florist/palette" icon="🎨" label="Color Palette" />
</MobileNav>
```

### Active State Management  
- Highlight current tool section in navigation
- Show active sub-tool (search, palette, arrangement, sustainability)
- Update document title: "Florist Intelligence - {Current Tool} | WedSync"
- Provide "Back to Dashboard" escape route always visible

### Accessibility Integration
- Navigation must support screen readers with proper ARIA labels
- Keyboard navigation (Tab, Enter, Escape) must work throughout
- Color tools must support colorblind users with alternative indicators
- High contrast mode support for all florist interfaces

## UI TECHNOLOGY STACK REQUIREMENTS (MANDATORY)

### Primary UI Libraries (ONLY THESE ALLOWED)
```bash
# MANDATORY: Use ONLY these UI component sources
# ✅ Untitled UI (primary component library)  
# ✅ Magic UI (advanced interactive components)
# ✅ Tailwind CSS (styling framework)
# ❌ NO OTHER UI LIBRARIES ALLOWED (no shadcn, no MUI, no Chakra, etc.)
```

### Color Picker Implementation  
```typescript
// MUST use Magic UI ColorPicker:
import { ColorPicker } from '@/components/ui/magic/color-picker';
import { ColorPalette } from '@/components/ui/magic/color-palette';

// Example implementation:
<ColorPicker
  value={selectedColor}
  onChange={setSelectedColor}
  showHistory={true}
  showPalettes={true}
  format="hex"
  className="w-full"
/>
```

### Interactive Components Requirements
```typescript
// Flower search interface using Untitled UI:
import { SearchInput } from '@/components/ui/untitled/search-input';
import { FilterTabs } from '@/components/ui/untitled/filter-tabs';
import { ResultCard } from '@/components/ui/untitled/card';
import { Badge } from '@/components/ui/untitled/badge';

// Drag-and-drop arrangement builder using Magic UI:
import { DragDropProvider } from '@/components/ui/magic/drag-drop';
import { Draggable, Droppable } from '@/components/ui/magic/drag-drop';

// Loading and skeleton states:
import { Skeleton } from '@/components/ui/untitled/skeleton';
import { LoadingSpinner } from '@/components/ui/untitled/loading';
```

### Responsive Design Requirements
- **Mobile-first design**: Start with 375px (iPhone SE) layout
- **Breakpoints**: sm:640px, md:768px, lg:1024px, xl:1280px, 2xl:1536px
- **Touch optimization**: All interactive elements minimum 48x48px
- **Swipe gestures**: Support swipe between florist tool tabs on mobile
- **Scroll behavior**: Smooth scrolling with touch momentum

### Color Accessibility Standards
```typescript
// MANDATORY color contrast ratios:
const colorAccessibility = {
  text: '4.5:1', // WCAG AA standard
  largeText: '3:1', // 18pt+ or bold 14pt+
  nonText: '3:1', // UI components
  colorBlindSupport: true, // Alternative indicators beyond color
};

// Implementation example:
<FlowerResult 
  flower={flower}
  seasonalScore={score}
  className={`
    ${score > 0.8 ? 'border-l-4 border-green-500' : ''}
    ${score < 0.5 ? 'border-l-4 border-amber-500' : ''}
    ${score < 0.3 ? 'border-l-4 border-red-500' : ''}
  `}
  accessibilityLabel={`Seasonal appropriateness: ${score > 0.8 ? 'Excellent' : score < 0.5 ? 'Limited' : 'Good'}`}
/>
```

## TEAM A SPECIALIZATION - FRONTEND FOCUS

### Primary Responsibilities
1. **Florist Intelligence Interface**: Tabbed interface for flower search, color palette generation, arrangement planning
2. **Interactive Color Tools**: Color picker, palette generator, harmony visualization, flower color matching display  
3. **Flower Search Interface**: Advanced filtering, seasonal scoring display, sustainability indicators
4. **Arrangement Planner**: Drag-and-drop arrangement builder with AI assistance
5. **Mobile Optimization**: Touch-optimized interface, swipe navigation, responsive layouts

### Core Components to Build

#### 1. FloristIntelligence.tsx - Main Interface Hub
```typescript
// /src/components/florist/FloristIntelligence.tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/untitled/tabs';
import { FlowerSearch } from './FlowerSearch';
import { ColorPaletteGenerator } from './ColorPaletteGenerator';
import { ArrangementPlanner } from './ArrangementPlanner';
import { SustainabilityAnalyzer } from './SustainabilityAnalyzer';

interface FloristIntelligenceProps {
  weddingId?: string;
  onRecommendationSelect?: (recommendation: any) => void;
  initialMode?: 'search' | 'palette' | 'arrangement' | 'sustainability';
  className?: string;
}

export function FloristIntelligence({ 
  weddingId, 
  onRecommendationSelect,
  initialMode = 'search',
  className = ''
}: FloristIntelligenceProps) {
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [searchResults, setSearchResults] = useState(null);
  const [generatedPalette, setGeneratedPalette] = useState(null);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-900">AI Florist Intelligence</h2>
          <p className="mt-1 text-sm text-gray-600">
            Smart tools for flower selection, color harmony, and sustainable arrangements
          </p>
        </div>

        <Tabs value={currentMode} onValueChange={setCurrentMode} className="p-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <span>🔍</span> Flower Search
            </TabsTrigger>
            <TabsTrigger value="palette" className="flex items-center gap-2">
              <span>🎨</span> Color Palette
            </TabsTrigger>
            <TabsTrigger value="arrangement" className="flex items-center gap-2">
              <span>💐</span> Arrangement
            </TabsTrigger>
            <TabsTrigger value="sustainability" className="flex items-center gap-2">
              <span>🌱</span> Sustainability
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-6">
            <FlowerSearch 
              weddingId={weddingId}
              onResultsUpdate={setSearchResults}
              onFlowerSelect={onRecommendationSelect}
            />
          </TabsContent>

          <TabsContent value="palette" className="mt-6">
            <ColorPaletteGenerator 
              weddingId={weddingId}
              onPaletteGenerated={setGeneratedPalette}
              initialColors={generatedPalette?.colors}
            />
          </TabsContent>

          <TabsContent value="arrangement" className="mt-6">
            <ArrangementPlanner 
              weddingId={weddingId}
              selectedFlowers={searchResults?.flowers}
              colorPalette={generatedPalette}
              onArrangementComplete={onRecommendationSelect}
            />
          </TabsContent>

          <TabsContent value="sustainability" className="mt-6">
            <SustainabilityAnalyzer 
              weddingId={weddingId}
              selectedFlowers={searchResults?.flowers}
              onAnalysisComplete={onRecommendationSelect}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

#### 2. FlowerSearch.tsx - Advanced Search Interface
```typescript
// /src/components/florist/FlowerSearch.tsx
import { useState, useCallback } from 'react';
import { SearchInput } from '@/components/ui/untitled/search-input';
import { Button } from '@/components/ui/untitled/button';
import { Badge } from '@/components/ui/untitled/badge';
import { Card } from '@/components/ui/untitled/card';
import { ColorPicker } from '@/components/ui/magic/color-picker';
import { Slider } from '@/components/ui/untitled/slider';
import { Select } from '@/components/ui/untitled/select';
import { useFloristSearch } from '@/hooks/useFloristSearch';

interface FlowerSearchProps {
  weddingId?: string;
  onResultsUpdate?: (results: any) => void;
  onFlowerSelect?: (flower: any) => void;
}

export function FlowerSearch({ weddingId, onResultsUpdate, onFlowerSelect }: FlowerSearchProps) {
  const [searchCriteria, setSearchCriteria] = useState({
    colors: [] as string[],
    wedding_date: '',
    style: '',
    season: '',
    budget_range: { min: 1, max: 10 },
    exclude_allergens: [] as string[],
    sustainability_minimum: 0,
    wedding_uses: [] as string[]
  });

  const { searchResults, isLoading, error, searchFlowers } = useFloristSearch();

  const handleSearch = useCallback(async () => {
    try {
      const results = await searchFlowers(searchCriteria);
      onResultsUpdate?.(results);
    } catch (err) {
      console.error('Flower search failed:', err);
    }
  }, [searchCriteria, searchFlowers, onResultsUpdate]);

  const addColor = (color: string) => {
    setSearchCriteria(prev => ({
      ...prev,
      colors: [...prev.colors, color]
    }));
  };

  const removeColor = (index: number) => {
    setSearchCriteria(prev => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Color Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Wedding Colors
          </label>
          <div className="space-y-3">
            <ColorPicker
              onChange={addColor}
              showHistory={true}
              format="hex"
              className="w-full"
            />
            <div className="flex flex-wrap gap-2">
              {searchCriteria.colors.map((color, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                  {color}
                  <button
                    onClick={() => removeColor(index)}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Wedding Details */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Wedding Date
          </label>
          <input
            type="date"
            value={searchCriteria.wedding_date}
            onChange={e => setSearchCriteria(prev => ({ ...prev, wedding_date: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Wedding Style
          </label>
          <Select
            value={searchCriteria.style}
            onValueChange={value => setSearchCriteria(prev => ({ ...prev, style: value }))}
          >
            <option value="">Any Style</option>
            <option value="romantic">Romantic</option>
            <option value="modern">Modern</option>
            <option value="rustic">Rustic</option>
            <option value="classic">Classic</option>
            <option value="bohemian">Bohemian</option>
          </Select>
        </div>

        {/* Budget Range */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Budget per Stem ($)
          </label>
          <div className="space-y-2">
            <Slider
              value={[searchCriteria.budget_range.min, searchCriteria.budget_range.max]}
              onValueChange={([min, max]) => 
                setSearchCriteria(prev => ({ ...prev, budget_range: { min, max } }))
              }
              max={20}
              min={1}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>${searchCriteria.budget_range.min}</span>
              <span>${searchCriteria.budget_range.max}</span>
            </div>
          </div>
        </div>

        {/* Sustainability Minimum */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Sustainability Priority
          </label>
          <Slider
            value={[searchCriteria.sustainability_minimum]}
            onValueChange={([value]) => 
              setSearchCriteria(prev => ({ ...prev, sustainability_minimum: value }))
            }
            max={1}
            min={0}
            step={0.1}
            className="w-full"
          />
          <div className="text-sm text-gray-600">
            {searchCriteria.sustainability_minimum === 0 ? 'No preference' :
             searchCriteria.sustainability_minimum < 0.3 ? 'Low priority' :
             searchCriteria.sustainability_minimum < 0.7 ? 'Moderate priority' : 'High priority'}
          </div>
        </div>
      </div>

      {/* Search Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Searching...' : '🔍 Search Flowers with AI'}
        </Button>
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results ({searchResults.flowers?.length || 0} flowers)
            </h3>
            <div className="text-sm text-gray-600">
              Avg Seasonal Score: {((searchResults.search_metadata?.avg_seasonal_score || 0) * 100).toFixed(0)}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.flowers?.map((flower: any, index: number) => (
              <Card key={flower.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onFlowerSelect?.(flower)}>
                <div className="space-y-3">
                  {/* Flower Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{flower.common_name}</h4>
                      <p className="text-sm text-gray-600 italic">{flower.scientific_name}</p>
                    </div>
                    <Badge 
                      variant={flower.seasonal_score > 0.8 ? 'success' : 
                               flower.seasonal_score > 0.5 ? 'warning' : 'destructive'}
                    >
                      {(flower.seasonal_score * 100).toFixed(0)}% Seasonal
                    </Badge>
                  </div>

                  {/* Color Matches */}
                  {flower.matched_color && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: flower.matched_color.color_hex }}
                      />
                      <span className="text-sm text-gray-600">
                        {flower.color_compatibility} match
                      </span>
                    </div>
                  )}

                  {/* Pricing */}
                  {flower.current_pricing && (
                    <div className="text-sm">
                      <span className="font-medium">${flower.current_pricing.adjusted_price}</span>
                      <span className="text-gray-600"> per stem</span>
                      {flower.current_pricing.availability_score < 0.5 && (
                        <Badge variant="warning" className="ml-2 text-xs">Limited</Badge>
                      )}
                    </div>
                  )}

                  {/* Sustainability & Allergen Info */}
                  <div className="flex gap-2 text-xs">
                    {flower.sustainability_score && (
                      <Badge variant="outline" className="text-green-700">
                        🌱 {(flower.sustainability_score * 100).toFixed(0)}%
                      </Badge>
                    )}
                    {flower.allergen_info?.pollen === 'low' && (
                      <Badge variant="outline" className="text-blue-700">
                        Low Pollen
                      </Badge>
                    )}
                  </div>

                  {/* Wedding Uses */}
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(flower.wedding_suitability || {})
                      .filter(([_, suitable]) => suitable)
                      .map(([use, _]) => (
                        <Badge key={use} variant="secondary" className="text-xs">
                          {use.replace('_', ' ')}
                        </Badge>
                      ))}
                  </div>

                  {/* Seasonal Notes */}
                  {flower.seasonal_notes && flower.seasonal_notes.length > 0 && (
                    <div className="text-xs text-gray-600">
                      {flower.seasonal_notes[0]}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-800">
            Search failed: {error.message}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3. ColorPaletteGenerator.tsx - AI Color Tools
```typescript
// /src/components/florist/ColorPaletteGenerator.tsx
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/untitled/button';
import { Card } from '@/components/ui/untitled/card';
import { Badge } from '@/components/ui/untitled/badge';
import { ColorPicker } from '@/components/ui/magic/color-picker';
import { ColorPalette } from '@/components/ui/magic/color-palette';
import { Select } from '@/components/ui/untitled/select';
import { useColorPalette } from '@/hooks/useColorPalette';

interface ColorPaletteGeneratorProps {
  weddingId?: string;
  onPaletteGenerated?: (palette: any) => void;
  initialColors?: string[];
}

export function ColorPaletteGenerator({ 
  weddingId, 
  onPaletteGenerated,
  initialColors = []
}: ColorPaletteGeneratorProps) {
  const [baseColors, setBaseColors] = useState<string[]>(initialColors);
  const [weddingStyle, setWeddingStyle] = useState('');
  const [season, setSeason] = useState('');
  
  const { generatedPalette, isGenerating, error, generatePalette } = useColorPalette();

  const handleGeneratePalette = useCallback(async () => {
    if (baseColors.length === 0) return;
    
    try {
      const palette = await generatePalette({
        baseColors,
        weddingStyle,
        season,
        preferences: {
          include_neutrals: true,
          accent_count: 2,
          harmony_type: 'complementary'
        }
      });
      onPaletteGenerated?.(palette);
    } catch (err) {
      console.error('Palette generation failed:', err);
    }
  }, [baseColors, weddingStyle, season, generatePalette, onPaletteGenerated]);

  const addBaseColor = (color: string) => {
    if (!baseColors.includes(color) && baseColors.length < 3) {
      setBaseColors([...baseColors, color]);
    }
  };

  const removeBaseColor = (index: number) => {
    setBaseColors(baseColors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Base Colors */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Base Colors (up to 3)
          </label>
          <div className="space-y-3">
            <ColorPicker
              onChange={addBaseColor}
              disabled={baseColors.length >= 3}
              className="w-full"
            />
            <div className="flex flex-wrap gap-2">
              {baseColors.map((color, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-md px-2 py-1">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm">{color}</span>
                  <button
                    onClick={() => removeBaseColor(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wedding Style */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Wedding Style
          </label>
          <Select value={weddingStyle} onValueChange={setWeddingStyle}>
            <option value="">Select Style</option>
            <option value="romantic">Romantic</option>
            <option value="modern">Modern</option>
            <option value="rustic">Rustic</option>
            <option value="classic">Classic</option>
            <option value="bohemian">Bohemian</option>
            <option value="minimalist">Minimalist</option>
          </Select>
        </div>

        {/* Season */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Wedding Season
          </label>
          <Select value={season} onValueChange={setSeason}>
            <option value="">Select Season</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </Select>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGeneratePalette}
          disabled={baseColors.length === 0 || !weddingStyle || !season || isGenerating}
          className="px-8 py-3 bg-purple-600 hover:bg-purple-700"
        >
          {isGenerating ? 'Generating...' : '🎨 Generate AI Color Palette'}
        </Button>
      </div>

      {/* Generated Palette */}
      {generatedPalette && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {generatedPalette.primary_palette?.palette_name || 'Generated Palette'}
            </h3>

            {/* Primary Colors */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Primary Colors</h4>
                <div className="flex flex-wrap gap-3">
                  {generatedPalette.primary_palette?.primary_colors?.map((color: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-200"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div>
                        <div className="text-sm font-medium">{color.name}</div>
                        <div className="text-xs text-gray-600">{color.hex}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accent Colors */}
              {generatedPalette.primary_palette?.accent_colors && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Accent Colors</h4>
                  <div className="flex flex-wrap gap-3">
                    {generatedPalette.primary_palette.accent_colors.map((color: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-200"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div>
                          <div className="text-sm font-medium">{color.name}</div>
                          <div className="text-xs text-gray-600">{color.hex}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Neutral Colors */}
              {generatedPalette.primary_palette?.neutral_colors && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Neutral Colors</h4>
                  <div className="flex flex-wrap gap-3">
                    {generatedPalette.primary_palette.neutral_colors.map((color: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-200"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div>
                          <div className="text-sm font-medium">{color.name}</div>
                          <div className="text-xs text-gray-600">{color.hex}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Matching Flowers */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Matching Flowers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedPalette.flower_matches?.map((colorMatch: any, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: colorMatch.target_color?.hex }}
                      />
                      <div className="text-sm font-medium">{colorMatch.target_color?.name}</div>
                      <Badge variant="secondary" className="text-xs">
                        {colorMatch.match_count} matches
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {colorMatch.matching_flowers?.slice(0, 3).map((flowerMatch: any, fIndex: number) => (
                        <div key={fIndex} className="flex items-center justify-between text-sm">
                          <span>{flowerMatch.flower?.common_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {(flowerMatch.color_similarity * 100).toFixed(0)}% match
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Seasonal Analysis */}
            {generatedPalette.seasonal_analysis && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Seasonal Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(generatedPalette.seasonal_analysis.overall_fit * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Fit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(generatedPalette.seasonal_analysis.seasonal_fit_score * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Seasonal Availability</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {(generatedPalette.seasonal_analysis.color_match_score * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Color Accuracy</div>
                  </div>
                </div>
                {generatedPalette.seasonal_analysis.recommendations && (
                  <div className="mt-4 space-y-2">
                    {generatedPalette.seasonal_analysis.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-blue-600">•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-800">
            Palette generation failed: {error.message}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Sequential Thinking MCP Usage (MANDATORY)

Team A must use Sequential Thinking MCP to optimize the florist interface design:

```typescript
// Use Sequential Thinking MCP to plan florist interface optimization:
await mcp__sequential_thinking__sequential_thinking({
  thought: "I need to design the florist intelligence interface that balances AI power with florist expertise. Key considerations: 1) Florists are visual designers who need to see color relationships clearly, 2) They work under time pressure so tools must be fast and intuitive, 3) They need to maintain creative control while getting AI assistance, 4) Mobile optimization is critical for on-site wedding work.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 7
});

// Continue thinking through color picker UX, mobile touch optimization, etc.
await mcp__sequential_thinking__sequential_thinking({
  thought: "For color picker UX, florists work with real flower samples that have natural color variations. The interface should: 1) Allow color range selection, not just exact matches, 2) Show how colors appear in different lighting conditions, 3) Provide color blindness accessible alternatives, 4) Support quick palette creation from uploaded flower photos, 5) Show seasonal availability alongside color matches to help with practical decision making.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 7
});

// Continue through mobile optimization, AI assistance balance, etc.
```

### Playwright Testing Requirements (MANDATORY)

```typescript
// Use Playwright MCP for comprehensive testing:

// 1. Test florist intelligence interface
await mcp__playwright__browser_navigate('/dashboard/florist/intelligence');
await mcp__playwright__browser_snapshot(); // Capture interface state

// Test color picker functionality
await mcp__playwright__browser_click({
  element: 'color picker',
  ref: '[data-testid="color-picker-add"]'
});
await mcp__playwright__browser_type({
  element: 'color input',
  ref: '[data-testid="color-input-0"]',
  text: '#FF69B4'
});

// Test flower search with color filters
await mcp__playwright__browser_click({
  element: 'search flowers tab',
  ref: '[data-testid="tab-search"]'
});
await mcp__playwright__browser_fill_form({
  fields: [
    {name: 'wedding-date', type: 'textbox', ref: '[data-testid="wedding-date"]', value: '2024-06-15'},
    {name: 'style', type: 'combobox', ref: '[data-testid="style-select"]', value: 'romantic'}
  ]
});
await mcp__playwright__browser_click({
  element: 'search button',
  ref: '[data-testid="search-flowers"]'
});
await mcp__playwright__browser_wait_for({text: 'Search Results'});

// Test mobile responsiveness
await mcp__playwright__browser_resize({width: 375, height: 667});
await mcp__playwright__browser_take_screenshot({filename: 'florist-mobile-interface.png'});

// Test color palette generation
await mcp__playwright__browser_click({
  element: 'color palette tab',
  ref: '[data-testid="tab-palette"]'
});
// Continue with AI palette generation testing...
```

### DELIVERABLES CHECKLIST
- [ ] FloristIntelligence.tsx - Main tabbed interface with all AI tools
- [ ] FlowerSearch.tsx - Advanced search with color, seasonal, sustainability filters
- [ ] ColorPaletteGenerator.tsx - AI color palette creation with flower matching
- [ ] ArrangementPlanner.tsx - Drag-and-drop arrangement builder with AI assistance
- [ ] SustainabilityAnalyzer.tsx - Carbon footprint analysis and eco recommendations
- [ ] useFloristSearch.tsx - Custom hook for flower search API integration
- [ ] useColorPalette.tsx - Custom hook for AI color palette generation
- [ ] Mobile-optimized responsive design for all florist tools (375px minimum)
- [ ] Untitled UI + Magic UI component integration (NO other UI libraries)
- [ ] Navigation integration with florist dashboard and breadcrumbs
- [ ] Accessibility features: screen readers, keyboard navigation, color blind support
- [ ] Comprehensive Playwright E2E tests for all florist workflows
- [ ] Performance optimization: <300ms search, <5s AI palette generation

### URGENT COMPLETION CRITERIA
**This task is INCOMPLETE until:**
1. All components render without TypeScript errors (npm run typecheck passes)
2. All florist tools work on mobile (375px screenshots provided via Playwright MCP)
3. Navigation integration verified (florist intelligence accessible from dashboard)
4. AI features properly integrated (color palette generation, flower search working)
5. All tests pass (>90% coverage on new components)
6. Evidence of reality provided (file listings, screenshots, test results)