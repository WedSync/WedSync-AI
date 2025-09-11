# 04-style-matching.md

## What to Build

An AI-powered style matching system that connects couples with suppliers based on aesthetic preferences, visual style, and wedding vibe compatibility.

## Key Technical Requirements

### Style Profile Structure

```
interface StyleProfile {
  id: string;
  owner_id: string;
  owner_type: 'couple' | 'supplier';
  style_tags: StyleTag[];
  color_palette: ColorPalette;
  aesthetic_preferences: AestheticPreference[];
  inspiration_images: InspirationImage[];
  style_vector: number[]; // AI-generated style embedding
  confidence_score: number;
}

interface StyleTag {
  tag: string;
  weight: number; // 0.1 to 1.0
  source: 'manual' | 'ai_detected' | 'portfolio_analysis';
}

interface ColorPalette {
  primary_colors: string[];
  accent_colors: string[];
  mood: 'warm' | 'cool' | 'neutral' | 'vibrant' | 'muted';
  season_affinity: Season[];
}

interface AestheticPreference {
  category: 'formality' | 'vintage' | 'nature' | 'luxury' | 'simplicity';
  value: number; // -1 to 1 scale
  importance: number; // 0 to 1
}
```

### Style Matching Algorithm

```
export class StyleMatchingEngine {
  async findStyleCompatibleSuppliers(
    coupleStyleProfile: StyleProfile,
    supplierCategory: string,
    location?: GeoPoint
  ): Promise<StyleMatch[]> {
    
    // Get suppliers in category and area
    const candidates = await this.getCandidateSuppliers(supplierCategory, location);
    
    // Calculate style compatibility scores
    const matches = await Promise.all(
      [candidates.map](http://candidates.map)(async (supplier) => {
        const supplierStyle = await this.getSupplierStyleProfile([supplier.id](http://supplier.id));
        const compatibility = await this.calculateStyleCompatibility(
          coupleStyleProfile,
          supplierStyle
        );
        
        return {
          supplier,
          compatibility_score: [compatibility.total](http://compatibility.total),
          style_overlap: compatibility.overlap,
          aesthetic_alignment: compatibility.aesthetic,
          color_harmony: compatibility.color,
          vibe_match: compatibility.vibe,
          matching_elements: compatibility.matching_elements
        };
      })
    );
    
    return matches
      .filter(m => m.compatibility_score > 0.6)
      .sort((a, b) => b.compatibility_score - a.compatibility_score);
  }
  
  private async calculateStyleCompatibility(
    coupleStyle: StyleProfile,
    supplierStyle: StyleProfile
  ): Promise<StyleCompatibility> {
    
    // Vector similarity (40%)
    const vectorSimilarity = this.calculateCosineSimilarity(
      [coupleStyle.style](http://coupleStyle.style)_vector,
      [supplierStyle.style](http://supplierStyle.style)_vector
    );
    
    // Tag overlap (25%)
    const tagOverlap = this.calculateTagOverlap(
      [coupleStyle.style](http://coupleStyle.style)_tags,
      [supplierStyle.style](http://supplierStyle.style)_tags
    );
    
    // Color harmony (20%)
    const colorHarmony = this.calculateColorHarmony(
      coupleStyle.color_palette,
      supplierStyle.color_palette
    );
    
    // Aesthetic alignment (15%)
    const aestheticAlignment = this.calculateAestheticAlignment(
      coupleStyle.aesthetic_preferences,
      supplierStyle.aesthetic_preferences
    );
    
    return {
      total: (vectorSimilarity * 0.4) + (tagOverlap * 0.25) + 
             (colorHarmony * 0.2) + (aestheticAlignment * 0.15),
      overlap: tagOverlap,
      aesthetic: aestheticAlignment,
      color: colorHarmony,
      vibe: vectorSimilarity,
      matching_elements: this.getMatchingElements(coupleStyle, supplierStyle)
    };
  }
}
```

## Critical Implementation Notes

### Style Discovery Interface

```
export function StyleDiscoveryWizard({ onStyleProfileComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [styleProfile, setStyleProfile] = useState<Partial<StyleProfile>>({});
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  const steps = [
    { component: VisualStyleSelector, title: "What's your vibe?" },
    { component: ColorPaletteSelector, title: "Choose your colors" },
    { component: InspirationImageSelector, title: "Select inspiration" },
    { component: AestheticPreferences, title: "Fine-tune preferences" }
  ];
  
  const handleStepComplete = useCallback((stepData: any) => {
    setStyleProfile(prev => ({ ...prev, ...stepData }));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Generate AI style vector
      generateStyleVector(styleProfile).then(vector => {
        const completeProfile = {
          ...styleProfile,
          style_vector: vector,
          confidence_score: calculateConfidenceScore(styleProfile)
        };
        onStyleProfileComplete(completeProfile);
      });
    }
  }, [currentStep, styleProfile, onStyleProfileComplete]);
  
  const CurrentStepComponent = steps[currentStep].component;
  
  return (
    <div className="style-discovery-wizard">
      <ProgressIndicator currentStep={currentStep} totalSteps={steps.length} />
      
      <h2>{steps[currentStep].title}</h2>
      
      <CurrentStepComponent
        onComplete={handleStepComplete}
        currentData={styleProfile}
      />
      
      <StepNavigation
        currentStep={currentStep}
        totalSteps={steps.length}
        onPrevious={() => setCurrentStep(prev => prev - 1)}
        canGoBack={currentStep > 0}
      />
    </div>
  );
}
```

### Visual Style Components

```
export function VisualStyleSelector({ onComplete }: StepProps) {
  const [selectedStyles, setSelectedStyles] = useState<StyleTag[]>([]);
  
  const styleOptions = [
    { tag: 'bohemian', image: '/styles/bohemian.jpg', description: 'Free-spirited and relaxed' },
    { tag: 'classic', image: '/styles/classic.jpg', description: 'Timeless and elegant' },
    { tag: 'modern', image: '/styles/modern.jpg', description: 'Clean and contemporary' },
    { tag: 'rustic', image: '/styles/rustic.jpg', description: 'Natural and organic' },
    { tag: 'glamorous', image: '/styles/glamorous.jpg', description: 'Luxurious and dramatic' },
    { tag: 'romantic', image: '/styles/romantic.jpg', description: 'Soft and dreamy' }
  ];
  
  const handleStyleToggle = useCallback((style: StyleOption) => {
    setSelectedStyles(prev => {
      const exists = prev.find(s => s.tag === style.tag);
      
      if (exists) {
        return prev.filter(s => s.tag !== style.tag);
      } else {
        return [...prev, {
          tag: style.tag,
          weight: 0.8,
          source: 'manual'
        }];
      }
    });
  }, []);
  
  return (
    <div className="visual-style-selector">
      <div className="style-grid">
        {[styleOptions.map](http://styleOptions.map)((style) => (
          <StyleOptionCard
            key={style.tag}
            style={style}
            isSelected={selectedStyles.some(s => s.tag === style.tag)}
            onToggle={() => handleStyleToggle(style)}
          />
        ))}
      </div>
      
      <div className="selection-summary">
        <h4>Your Style Mix:</h4>
        {[selectedStyles.map](http://selectedStyles.map)(style => (
          <span key={style.tag} className="style-tag">
            {style.tag}
          </span>
        ))}
      </div>
      
      <button
        onClick={() => onComplete({ style_tags: selectedStyles })}
        disabled={selectedStyles.length === 0}
        className="btn-continue"
      >
        Continue
      </button>
    </div>
  );
}
```

### AI Style Analysis

```
// Generate style vector from profile data
export async function generateStyleVector(profile: Partial<StyleProfile>): Promise<number[]> {
  const response = await fetch('/api/ai/style-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      style_tags: [profile.style](http://profile.style)_tags,
      color_palette: profile.color_palette,
      inspiration_images: profile.inspiration_images,
      aesthetic_preferences: profile.aesthetic_preferences
    })
  });
  
  const { style_vector } = await response.json();
  return style_vector;
}

// Analyze supplier portfolio for style
export async function analyzeSupplierPortfolio(supplierId: string): Promise<StyleProfile> {
  const portfolio = await getSupplierPortfolio(supplierId);
  
  const analysis = await Promise.all([
    analyzePortfolioColors(portfolio.images),
    detectStyleTags(portfolio.images),
    extractAestheticTrends(portfolio.images)
  ]);
  
  return {
    id: `supplier-${supplierId}`,
    owner_id: supplierId,
    owner_type: 'supplier',
    style_tags: analysis[1],
    color_palette: analysis[0],
    aesthetic_preferences: analysis[2],
    inspiration_images: portfolio.images.slice(0, 10),
    style_vector: await generateStyleVector({
      style_tags: analysis[1],
      color_palette: analysis[0],
      aesthetic_preferences: analysis[2]
    }),
    confidence_score: calculatePortfolioConfidence(portfolio)
  };
}
```

### Style Matching Results

```
export function StyleMatchResults({ matches }: Props) {
  const [sortBy, setSortBy] = useState<'compatibility' | 'rating' | 'price'>('compatibility');
  
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case 'compatibility':
          return b.compatibility_score - a.compatibility_score;
        case 'rating':
          return b.supplier.average_rating - a.supplier.average_rating;
        case 'price':
          return a.supplier.starting_price - b.supplier.starting_price;
        default:
          return 0;
      }
    });
  }, [matches, sortBy]);
  
  return (
    <div className="style-match-results">
      <div className="results-header">
        <h2>{matches.length} Style-Compatible Suppliers Found</h2>
        
        <SortSelector value={sortBy} onChange={setSortBy} options={[
          { value: 'compatibility', label: 'Best Style Match' },
          { value: 'rating', label: 'Highest Rated' },
          { value: 'price', label: 'Price: Low to High' }
        ]} />
      </div>
      
      <div className="match-list">
        {[sortedMatches.map](http://sortedMatches.map)((match) => (
          <StyleMatchCard
            key={[match.supplier.id](http://match.supplier.id)}
            match={match}
            onViewProfile={() => openSupplierProfile([match.supplier.id](http://match.supplier.id))}
            onContact={() => contactSupplier([match.supplier.id](http://match.supplier.id))}
          />
        ))}
      </div>
    </div>
  );
}

export function StyleMatchCard({ match, onViewProfile, onContact }: MatchCardProps) {
  return (
    <div className="style-match-card">
      <div className="supplier-info">
        <img src={match.supplier.hero_image} alt={[match.supplier.business](http://match.supplier.business)_name} />
        <div className="details">
          <h3>{[match.supplier.business](http://match.supplier.business)_name}</h3>
          <p className="category">{match.supplier.category}</p>
          <div className="rating">
            <StarRating value={match.supplier.average_rating} />
            <span>({[match.supplier.review](http://match.supplier.review)_count} reviews)</span>
          </div>
        </div>
      </div>
      
      <div className="style-compatibility">
        <div className="compatibility-score">
          <CircularProgress value={match.compatibility_score * 100} />
          <span>{Math.round(match.compatibility_score * 100)}% Style Match</span>
        </div>
        
        <div className="matching-elements">
          {match.matching_elements.slice(0, 3).map((element) => (
            <span key={element} className="match-tag">{element}</span>
          ))}
        </div>
      </div>
      
      <div className="actions">
        <button onClick={onViewProfile} className="btn-secondary">
          View Portfolio
        </button>
        <button onClick={onContact} className="btn-primary">
          Get Quote
        </button>
      </div>
    </div>
  );
}
```

### Database Schema

```
CREATE TABLE style_profiles (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  owner_type VARCHAR(20) CHECK (owner_type IN ('couple', 'supplier')),
  style_tags JSONB,
  color_palette JSONB,
  aesthetic_preferences JSONB,
  style_vector vector(512), -- Using pgvector for similarity search
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE style_matches (
  id UUID PRIMARY KEY,
  couple_style_id UUID REFERENCES style_profiles(id),
  supplier_style_id UUID REFERENCES style_profiles(id),
  compatibility_score DECIMAL(3,2),
  matching_elements JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index for fast style matching
CREATE INDEX idx_style_vector_similarity 
ON style_profiles USING ivfflat (style_vector vector_cosine_ops);

CREATE INDEX idx_style_profiles_owner 
ON style_profiles(owner_id, owner_type);
```