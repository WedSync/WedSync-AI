# WS-251 Photography AI Intelligence - Team A (Frontend) Development Prompt

## 🎯 EXECUTIVE SUMMARY
Create sophisticated React components for an AI-powered photography planning system that transforms how wedding photographers prepare for shoots. This system generates comprehensive shot lists, analyzes venue photos with AI Vision, and optimizes timing based on lighting conditions - reducing photographer planning time from 3 hours to 30 minutes per wedding.

## 📋 TECHNICAL REQUIREMENTS

### Core Components to Build

#### 1. AI Shot List Generator Interface
```typescript
// Location: /wedsync/src/components/photography/ShotListGenerator.tsx
interface ShotListGeneratorProps {
  weddingId: string;
  onShotListGenerated: (shotList: ShotList) => void;
  existingShotList?: ShotList;
}

// Key Features:
- Wedding details form with venue selection, style, guest count
- Real-time AI generation with progress indicators 
- Category-organized shot list with drag-and-drop reordering
- Priority tagging (Must-Have, Important, Nice-to-Have)
- Time estimation for each shot type
- Equipment recommendations display
- Export to PDF/printable checklist
```

#### 2. Interactive Timeline Optimizer
```typescript  
// Location: /wedsync/src/components/photography/TimingOptimizer.tsx
interface TimingOptimizerProps {
  weddingDate: Date;
  venueCoordinates: { lat: number; lng: number };
  ceremonyTime: string;
  onTimingCalculated: (timing: PhotoTiming) => void;
}

// Key Features:
- Visual timeline with golden hour/blue hour overlays
- Drag-and-drop schedule building with time slots
- Lighting condition indicators (natural light quality)
- Weather integration for backup planning
- Mobile-responsive timeline controls
- Calendar export integration
```

#### 3. Venue Analysis Dashboard
```typescript
// Location: /wedsync/src/components/photography/VenueAnalysis.tsx
interface VenueAnalysisProps {
  venueId: string;
  venuePhotos: string[];
  onAnalysisComplete: (analysis: VenueAnalysis) => void;
}

// Key Features:
- Photo upload with drag-and-drop interface
- AI analysis progress with detailed status updates
- Interactive map showing recommended photo spots
- Lighting quality visualization with color coding
- Equipment suggestions based on venue analysis
- Weather backup recommendations display
```

### Frontend Architecture

#### State Management Pattern
```typescript
// Use Zustand for photography-specific state
interface PhotographyStore {
  // Shot list state
  currentShotList: ShotList | null;
  isGenerating: boolean;
  generationProgress: number;
  
  // Venue analysis state  
  venueAnalysis: VenueAnalysis | null;
  isAnalyzing: boolean;
  analyzedPhotos: string[];
  
  // Timing calculation state
  photoTiming: PhotoTiming | null;
  isCalculatingTiming: boolean;
  
  // Actions
  generateShotList: (weddingDetails: WeddingDetails) => Promise<void>;
  analyzeVenue: (venueId: string, photos: string[]) => Promise<void>;
  calculateTiming: (date: Date, coordinates: Coordinates) => Promise<void>;
  updateShotList: (updates: ShotListUpdates) => void;
  exportShotList: (format: 'pdf' | 'checklist') => Promise<void>;
}
```

#### Component Integration Examples
```typescript
// Main Photography AI Dashboard
export default function PhotographyAIDashboard() {
  const { user } = useAuth();
  const photographyStore = usePhotographyStore();
  const [activeTab, setActiveTab] = useState<'shot-list' | 'timing' | 'venue'>('shot-list');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with AI Tools Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Photography AI Tools</h1>
          <p className="text-gray-600">AI-powered planning for perfect wedding photography</p>
        </div>
        <Badge variant="outline" className="text-blue-600">
          <Sparkles className="w-4 h-4 mr-1" />
          AI Powered
        </Badge>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shot-list" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Shot List Generator
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timing Optimizer
          </TabsTrigger>
          <TabsTrigger value="venue" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Venue Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shot-list" className="mt-6">
          <ShotListGenerator
            weddingId={currentWeddingId}
            onShotListGenerated={photographyStore.setShotList}
            existingShotList={photographyStore.currentShotList}
          />
        </TabsContent>

        <TabsContent value="timing" className="mt-6">
          <TimingOptimizer
            weddingDate={weddingDetails.date}
            venueCoordinates={weddingDetails.venue.coordinates}
            ceremonyTime={weddingDetails.ceremonyTime}
            onTimingCalculated={photographyStore.setTiming}
          />
        </TabsContent>

        <TabsContent value="venue" className="mt-6">
          <VenueAnalysis
            venueId={weddingDetails.venue.id}
            venuePhotos={weddingDetails.venue.photos}
            onAnalysisComplete={photographyStore.setVenueAnalysis}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Shot List Generator with AI Generation States
export function ShotListGenerator({ weddingId, onShotListGenerated, existingShotList }: ShotListGeneratorProps) {
  const [weddingDetails, setWeddingDetails] = useState<WeddingDetails>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setProgress(0);
      
      setGenerationStep('Analyzing venue details...');
      setProgress(20);
      await delay(1000);
      
      setGenerationStep('Calculating optimal timing...');  
      setProgress(40);
      await delay(1000);
      
      setGenerationStep('Generating AI shot list...');
      setProgress(60);
      
      const response = await fetch('/api/photography/ai/shot-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId,
          venueDetails: weddingDetails.venue,
          weddingStyle: weddingDetails.style,
          guestCount: weddingDetails.guestCount,
          ceremonyTime: weddingDetails.ceremonyTime,
          specialRequests: weddingDetails.specialRequests,
          photographerPreferences: weddingDetails.photographerPreferences
        })
      });

      setProgress(80);
      const result = await response.json();
      
      setGenerationStep('Finalizing recommendations...');
      setProgress(100);
      await delay(500);
      
      onShotListGenerated(result.shotList);
      
    } catch (error) {
      console.error('Shot list generation failed:', error);
      toast.error('Failed to generate shot list. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
      setProgress(0);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          AI Shot List Generator
        </CardTitle>
        <CardDescription>
          Generate comprehensive, venue-specific shot lists using AI photography expertise
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!existingShotList && (
          <>
            {/* Wedding Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="venue-name">Venue Name</Label>
                  <Input
                    id="venue-name"
                    value={weddingDetails.venue?.name || ''}
                    onChange={(e) => setWeddingDetails(prev => ({
                      ...prev,
                      venue: { ...prev.venue, name: e.target.value }
                    }))}
                    placeholder="Enter venue name"
                  />
                </div>

                <div>
                  <Label htmlFor="venue-type">Venue Type</Label>
                  <Select
                    value={weddingDetails.venue?.type || ''}
                    onValueChange={(value) => setWeddingDetails(prev => ({
                      ...prev,
                      venue: { ...prev.venue, type: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select venue type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outdoor">Outdoor Garden</SelectItem>
                      <SelectItem value="indoor">Indoor Ballroom</SelectItem>
                      <SelectItem value="beach">Beach/Waterfront</SelectItem>
                      <SelectItem value="church">Church/Chapel</SelectItem>
                      <SelectItem value="barn">Rustic Barn</SelectItem>
                      <SelectItem value="winery">Winery/Vineyard</SelectItem>
                      <SelectItem value="historic">Historic Venue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="wedding-style">Wedding Style</Label>
                  <Select
                    value={weddingDetails.style || ''}
                    onValueChange={(value) => setWeddingDetails(prev => ({
                      ...prev,
                      style: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select wedding style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classic Elegant</SelectItem>
                      <SelectItem value="rustic">Rustic Country</SelectItem>
                      <SelectItem value="modern">Modern Minimalist</SelectItem>
                      <SelectItem value="bohemian">Bohemian</SelectItem>
                      <SelectItem value="vintage">Vintage Romance</SelectItem>
                      <SelectItem value="destination">Destination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="guest-count">Guest Count</Label>
                  <Input
                    id="guest-count"
                    type="number"
                    value={weddingDetails.guestCount || ''}
                    onChange={(e) => setWeddingDetails(prev => ({
                      ...prev,
                      guestCount: parseInt(e.target.value)
                    }))}
                    placeholder="Number of guests"
                    min="1"
                    max="500"
                  />
                </div>

                <div>
                  <Label htmlFor="ceremony-time">Ceremony Time</Label>
                  <Input
                    id="ceremony-time"
                    type="datetime-local"
                    value={weddingDetails.ceremonyTime || ''}
                    onChange={(e) => setWeddingDetails(prev => ({
                      ...prev,
                      ceremonyTime: e.target.value
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="special-requests">Special Requests</Label>
                  <Textarea
                    id="special-requests"
                    value={weddingDetails.specialRequests?.join('\n') || ''}
                    onChange={(e) => setWeddingDetails(prev => ({
                      ...prev,
                      specialRequests: e.target.value.split('\n').filter(Boolean)
                    }))}
                    placeholder="Any special photography requests..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !weddingDetails.venue?.name}
                size="lg"
                className="min-w-48"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {generationStep}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Shot List
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">{generationStep}</p>
              </div>
            )}
          </>
        )}

        {/* Generated Shot List Display */}
        {existingShotList && (
          <ShotListDisplay
            shotList={existingShotList}
            onUpdate={(updates) => onShotListGenerated({ ...existingShotList, ...updates })}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

### Wedding Industry Context Integration

#### Photography-Specific Optimizations
```typescript
// Wedding photography expertise embedded in components
const WEDDING_PHOTOGRAPHY_INSIGHTS = {
  venueTypes: {
    outdoor: {
      challenges: ['weather backup', 'changing light', 'wind'],
      opportunities: ['natural light', 'landscape shots', 'golden hour'],
      equipment: ['fast lenses', 'weather protection', 'reflectors']
    },
    indoor: {
      challenges: ['low light', 'mixed lighting', 'space constraints'],
      opportunities: ['controlled environment', 'architectural features'],
      equipment: ['fast lenses', 'external flash', 'wide angle']
    },
    beach: {
      challenges: ['harsh sun', 'sand protection', 'wind'],
      opportunities: ['water reflections', 'sunset shots', 'natural beauty'],
      equipment: ['UV filters', 'lens protection', 'reflectors']
    }
  },
  seasonalConsiderations: {
    spring: ['unpredictable weather', 'blooming flowers', 'moderate light'],
    summer: ['harsh midday sun', 'long golden hour', 'heat management'],
    fall: ['beautiful colors', 'shorter days', 'weather variability'],
    winter: ['short daylight', 'indoor focus', 'cozy atmosphere']
  },
  culturalRequirements: {
    traditional: ['formal family groups', 'ceremony coverage', 'heritage shots'],
    modern: ['candid moments', 'creative angles', 'lifestyle approach'],
    multicultural: ['ceremony variations', 'cultural elements', 'family traditions']
  }
};

// Component showing wedding-specific insights
function PhotographyInsights({ venue, style, season }: PhotographyInsightsProps) {
  const insights = WEDDING_PHOTOGRAPHY_INSIGHTS;
  const venueInsights = insights.venueTypes[venue.type] || {};
  const seasonalTips = insights.seasonalConsiderations[season] || [];

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Photography Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Venue-Specific Challenges */}
        <div>
          <h4 className="font-semibold text-orange-600 mb-2">Challenges to Watch</h4>
          <div className="flex flex-wrap gap-2">
            {venueInsights.challenges?.map(challenge => (
              <Badge key={challenge} variant="secondary" className="text-orange-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {challenge}
              </Badge>
            ))}
          </div>
        </div>

        {/* Photography Opportunities */}
        <div>
          <h4 className="font-semibold text-green-600 mb-2">Opportunities</h4>
          <div className="flex flex-wrap gap-2">
            {venueInsights.opportunities?.map(opportunity => (
              <Badge key={opportunity} variant="secondary" className="text-green-600">
                <Star className="w-3 h-3 mr-1" />
                {opportunity}
              </Badge>
            ))}
          </div>
        </div>

        {/* Equipment Recommendations */}
        <div>
          <h4 className="font-semibold text-blue-600 mb-2">Recommended Equipment</h4>
          <div className="flex flex-wrap gap-2">
            {venueInsights.equipment?.map(equipment => (
              <Badge key={equipment} variant="outline" className="text-blue-600">
                <Camera className="w-3 h-3 mr-1" />
                {equipment}
              </Badge>
            ))}
          </div>
        </div>

        {/* Seasonal Considerations */}
        <div>
          <h4 className="font-semibold text-purple-600 mb-2">Seasonal Tips</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            {seasonalTips.map(tip => (
              <li key={tip} className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 🎨 UI/UX REQUIREMENTS

### Design System Integration
- Use existing WedSync component library and design tokens
- Maintain consistency with dashboard navigation and layout patterns  
- Implement wedding industry color scheme (soft pastels with professional accents)
- Ensure mobile-first responsive design for on-location usage

### Accessibility Standards
- WCAG 2.1 AA compliance for all photography interfaces
- Screen reader support for AI-generated content
- Keyboard navigation for timeline and shot list management
- High contrast mode support for outdoor/bright light usage

### Performance Requirements
- Shot list generation loading states with detailed progress
- Optimistic updates for shot list modifications
- Image lazy loading for venue photo analysis
- Offline capability for generated shot lists

## 🧪 TESTING STRATEGY

### Unit Testing Focus
```typescript
// Test AI integration components
describe('ShotListGenerator', () => {
  it('should handle AI generation states correctly', async () => {
    render(<ShotListGenerator weddingId="test" onShotListGenerated={jest.fn()} />);
    
    fireEvent.click(screen.getByText('Generate AI Shot List'));
    
    expect(screen.getByText('Analyzing venue details...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should validate wedding details before generation', () => {
    render(<ShotListGenerator weddingId="test" onShotListGenerated={jest.fn()} />);
    
    const generateButton = screen.getByText('Generate AI Shot List');
    expect(generateButton).toBeDisabled();
  });
});
```

### Integration Testing
- Test shot list generation with mock AI responses
- Verify timeline calculator with various venue coordinates  
- Test venue analysis photo upload and display
- Validate mobile responsiveness across photography tools

## 📱 MOBILE OPTIMIZATION

### Touch-Friendly Interfaces
- Large touch targets for timeline manipulation
- Swipe gestures for shot list category navigation
- Pinch-to-zoom for venue analysis maps
- Haptic feedback for important actions

### On-Location Usage
- High contrast mode for bright outdoor conditions
- Simplified interfaces for field usage
- Offline shot list access and modifications
- Quick export to native camera apps

## 🔗 INTEGRATION POINTS

### Navigation Integration
- Add "AI Tools" section to photographer dashboard
- Integrate with existing wedding management workflows
- Connect to calendar apps for timeline export
- Link with venue database for photo analysis

### Data Integration  
- Sync with wedding timeline and vendor schedules
- Export shot lists to popular photography apps
- Import venue photos from multiple sources
- Connect with weather APIs for backup planning

This comprehensive frontend implementation will create an intuitive, AI-powered photography planning experience that positions WedSync as the leader in wedding technology innovation while maintaining the highest standards of usability and performance.