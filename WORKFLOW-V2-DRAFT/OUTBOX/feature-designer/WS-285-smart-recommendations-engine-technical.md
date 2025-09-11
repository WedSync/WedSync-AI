# WS-285: Smart Recommendations Engine

## Feature ID
**WS-285**

## Feature Name  
**Smart Recommendations Engine**

## Feature Type
**Core AI Feature - Intelligent Matching & Personalization**

## User Stories

### Couple User Story
> **As Emma and James, a couple who just completed their wedding basics setup,**  
> I want to receive personalized vendor recommendations, timeline suggestions, and task priorities based on my wedding details, so that I can quickly discover the right suppliers and know exactly what to focus on first for my wedding planning.

### Supplier User Story  
> **As Maria, a wedding photographer looking to connect with ideal clients,**  
> I want the platform to intelligently match me with couples who fit my style, location, and availability, so that I can focus my time on high-quality leads rather than searching through endless profiles.

### System Intelligence Story
> **As the WedSync platform,**  
> I need to analyze wedding details, supplier capabilities, and historical success patterns to provide accurate recommendations that drive engagement, bookings, and overall platform success while continuously learning from user interactions and outcomes.

## Core Requirements

### 1. Multi-Dimensional Recommendation Engine
- **Vendor Matching Algorithm**: Match couples with suppliers based on style, budget, location, availability
- **Timeline Intelligence**: Generate personalized planning timelines with optimal task sequencing
- **Budget Optimization**: Recommend budget allocation based on wedding size, style, and location
- **Task Prioritization**: Intelligent task ordering based on dependencies and time constraints

### 2. Real-Time Learning & Adaptation
- **Interaction Tracking**: Monitor user engagement with recommendations and adjust algorithms
- **Success Pattern Analysis**: Learn from completed weddings and successful vendor-couple matches
- **Feedback Integration**: Incorporate user ratings and outcomes to improve future recommendations
- **Seasonal Adjustments**: Adapt recommendations based on wedding season and local trends

### 3. Context-Aware Intelligence
- **Location Intelligence**: Factor in regional preferences, vendor availability, and local regulations
- **Style Consistency**: Ensure all recommendations align with selected wedding style themes
- **Budget Awareness**: Respect budget constraints while maximizing value recommendations
- **Timeline Sensitivity**: Prioritize urgent tasks and time-sensitive decisions

### 4. Supplier Discovery & Matching
- **Portfolio Analysis**: AI-powered style matching between supplier portfolios and couple preferences
- **Availability Integration**: Real-time availability checking and booking recommendation timing
- **Quality Scoring**: Multi-factor supplier quality assessment including reviews, completion rates, responsiveness
- **Compatibility Metrics**: Predict supplier-couple compatibility based on communication styles and preferences

## Database Schema

### Core Recommendation Engine

```sql
-- Main recommendations table
CREATE TABLE smart_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN 
        ('vendor', 'timeline', 'budget', 'task', 'venue', 'style', 'planning')),
    category TEXT NOT NULL, -- vendor_type, task_category, etc.
    recommended_item_id UUID, -- References suppliers, templates, etc.
    recommendation_title TEXT NOT NULL,
    recommendation_description TEXT,
    
    -- Scoring and confidence
    confidence_score NUMERIC(5,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    match_score NUMERIC(5,3) CHECK (match_score >= 0 AND match_score <= 1),
    priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
    
    -- Context and reasoning
    matching_factors JSONB NOT NULL DEFAULT '{}', -- What factors influenced this recommendation
    contextual_data JSONB DEFAULT '{}', -- Wedding details that influenced matching
    reasoning_explanation TEXT, -- Human-readable explanation of why recommended
    
    -- Recommendation metadata
    recommendation_source TEXT DEFAULT 'algorithm' CHECK (recommendation_source IN 
        ('algorithm', 'manual', 'supplier_request', 'peer_recommendation', 'trending')),
    recommendation_version INTEGER DEFAULT 1, -- Algorithm version used
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- User interaction tracking
    status TEXT DEFAULT 'pending' CHECK (status IN 
        ('pending', 'viewed', 'clicked', 'contacted', 'bookmarked', 'dismissed', 'booked', 'completed')),
    viewed_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    dismissal_reason TEXT,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    
    -- Success tracking
    outcome_status TEXT CHECK (outcome_status IN 
        ('pending', 'successful_contact', 'booking_made', 'service_completed', 'unsuccessful')),
    outcome_recorded_at TIMESTAMPTZ,
    outcome_value NUMERIC(10,2), -- Booking value if applicable
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX (couple_id, recommendation_type, status),
    INDEX (recommended_item_id, recommendation_type),
    INDEX (generated_at DESC),
    INDEX (confidence_score DESC, match_score DESC)
);

-- Recommendation interaction events for detailed analytics
CREATE TABLE recommendation_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES smart_recommendations(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN 
        ('view', 'click', 'save', 'share', 'contact', 'dismiss', 'rate', 'book')),
    interaction_context JSONB DEFAULT '{}', -- Page, section, search query, etc.
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    user_agent TEXT,
    session_id UUID,
    interaction_duration_ms INTEGER, -- How long they engaged
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (recommendation_id, interaction_type),
    INDEX (couple_id, created_at DESC),
    INDEX (interaction_type, created_at DESC)
);

-- Algorithm performance tracking
CREATE TABLE recommendation_algorithms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    algorithm_name TEXT UNIQUE NOT NULL,
    algorithm_version TEXT NOT NULL,
    description TEXT,
    configuration JSONB NOT NULL DEFAULT '{}',
    
    -- Performance metrics
    is_active BOOLEAN DEFAULT true,
    success_rate NUMERIC(5,3), -- % of recommendations that lead to positive outcomes
    click_through_rate NUMERIC(5,3), -- % of recommendations clicked
    conversion_rate NUMERIC(5,3), -- % of recommendations leading to bookings
    user_satisfaction_score NUMERIC(3,2), -- Average user rating
    
    -- A/B testing support
    test_group TEXT, -- For A/B testing different algorithms
    test_start_date TIMESTAMPTZ,
    test_end_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Vendor Matching Intelligence

```sql
-- Supplier matching profiles for enhanced recommendations
CREATE TABLE supplier_matching_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Style and aesthetic analysis
    style_tags TEXT[] DEFAULT '{}', -- Extracted from portfolio analysis
    color_preferences TEXT[] DEFAULT '{}',
    formality_levels TEXT[] DEFAULT '{}', -- casual, formal, black_tie, etc.
    venue_types TEXT[] DEFAULT '{}', -- Indoor, outdoor, beach, etc.
    
    -- Service characteristics
    average_wedding_size INTEGER,
    budget_range_min NUMERIC(10,2),
    budget_range_max NUMERIC(10,2),
    service_style TEXT, -- Traditional, modern, artistic, documentary, etc.
    communication_style TEXT, -- Professional, friendly, casual, detailed
    
    -- Geographic and availability data
    primary_service_area GEOGRAPHY(POLYGON),
    travel_radius_km INTEGER DEFAULT 50,
    seasonal_availability JSONB DEFAULT '{}', -- Busy/available seasons
    booking_lead_time_weeks INTEGER DEFAULT 12,
    
    -- Performance and quality metrics
    response_time_avg_hours NUMERIC(5,2),
    booking_conversion_rate NUMERIC(5,3),
    client_satisfaction_avg NUMERIC(3,2),
    completion_rate NUMERIC(5,3),
    rebook_recommendation_rate NUMERIC(5,3),
    
    -- AI-derived insights
    ideal_client_profile JSONB DEFAULT '{}', -- AI analysis of best-match clients
    success_patterns JSONB DEFAULT '{}', -- What leads to successful bookings
    strength_areas TEXT[], -- What this supplier excels at
    
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (supplier_id),
    INDEX USING GIST (primary_service_area),
    INDEX (style_tags),
    INDEX (budget_range_min, budget_range_max)
);

-- Couple preference profiles for better matching
CREATE TABLE couple_preference_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    
    -- Explicit preferences from wedding basics and interactions
    preferred_styles TEXT[] DEFAULT '{}',
    budget_priorities TEXT[] DEFAULT '{}', -- Where they want to spend more/less
    communication_preferences JSONB DEFAULT '{}', -- How they like to be contacted
    decision_making_style TEXT, -- Quick, research-heavy, collaborative, etc.
    
    -- Implicit preferences learned from behavior
    vendor_interaction_patterns JSONB DEFAULT '{}', -- What types they click/contact
    price_sensitivity_score NUMERIC(3,2), -- 0-1, derived from behavior
    style_consistency_score NUMERIC(3,2), -- How consistent their choices are
    
    -- Context and constraints
    planning_timeline_preference TEXT, -- Early planner, last-minute, etc.
    vendor_meeting_preferences JSONB DEFAULT '{}', -- In-person, virtual, etc.
    special_requirements TEXT[],
    cultural_considerations TEXT[],
    
    -- Learning and adaptation tracking
    preference_confidence NUMERIC(3,2) DEFAULT 0.5, -- How confident we are in profile
    last_interaction_at TIMESTAMPTZ,
    profile_completeness_score NUMERIC(3,2), -- How complete the profile is
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (couple_id),
    INDEX (preferred_styles),
    INDEX (budget_priorities)
);
```

### Learning and Performance Analytics

```sql
-- Machine learning model performance tracking
CREATE TABLE ml_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN 
        ('vendor_matching', 'style_analysis', 'budget_optimization', 'timeline_prediction')),
    
    -- Training and deployment info
    training_data_size INTEGER,
    training_completed_at TIMESTAMPTZ,
    deployed_at TIMESTAMPTZ,
    
    -- Performance metrics over time
    accuracy_score NUMERIC(5,3),
    precision_score NUMERIC(5,3),
    recall_score NUMERIC(5,3),
    f1_score NUMERIC(5,3),
    
    -- Business impact metrics
    user_engagement_improvement NUMERIC(5,3), -- % improvement in engagement
    booking_rate_improvement NUMERIC(5,3), -- % improvement in bookings
    user_satisfaction_improvement NUMERIC(5,3), -- % improvement in satisfaction
    
    -- Evaluation period
    evaluation_start_date TIMESTAMPTZ,
    evaluation_end_date TIMESTAMPTZ,
    evaluation_sample_size INTEGER,
    
    -- Configuration and parameters
    model_parameters JSONB DEFAULT '{}',
    feature_importance JSONB DEFAULT '{}', -- Which factors matter most
    
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (model_name, model_version),
    INDEX (model_type, is_active),
    INDEX (deployed_at DESC)
);

-- Real-time recommendation effectiveness tracking
CREATE TABLE recommendation_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES smart_recommendations(id) ON DELETE CASCADE,
    
    -- Effectiveness metrics
    view_to_click_rate NUMERIC(5,3),
    click_to_contact_rate NUMERIC(5,3),
    contact_to_booking_rate NUMERIC(5,3),
    booking_to_completion_rate NUMERIC(5,3),
    
    -- Time-based metrics
    time_to_first_interaction_hours NUMERIC(8,2),
    time_to_booking_days NUMERIC(6,2),
    recommendation_lifespan_days NUMERIC(6,2),
    
    -- Context effectiveness
    device_performance JSONB DEFAULT '{}', -- Performance by device type
    timing_effectiveness JSONB DEFAULT '{}', -- Performance by time of day/week
    placement_effectiveness JSONB DEFAULT '{}', -- Performance by page placement
    
    -- Comparative analysis
    recommendation_rank INTEGER, -- Where in the list this appeared
    competitors_shown INTEGER, -- How many alternatives were shown
    position_click_advantage NUMERIC(5,3), -- Click rate vs. average for position
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    data_window_start TIMESTAMPTZ,
    data_window_end TIMESTAMPTZ,
    
    INDEX (recommendation_id),
    INDEX (calculated_at DESC)
);
```

## API Endpoints

### Core Recommendation APIs

```typescript
// Get personalized recommendations for a couple
GET    /api/couple/recommendations                    // Get current recommendations
GET    /api/couple/recommendations/:type             // Get specific type of recommendations
POST   /api/couple/recommendations/refresh           // Regenerate recommendations
GET    /api/couple/recommendations/trending          // Get trending recommendations

// Recommendation interactions
POST   /api/couple/recommendations/:id/view          // Track recommendation view
POST   /api/couple/recommendations/:id/click         // Track recommendation click
POST   /api/couple/recommendations/:id/save          // Save/bookmark recommendation
POST   /api/couple/recommendations/:id/dismiss       // Dismiss recommendation
POST   /api/couple/recommendations/:id/rate          // Rate recommendation quality
POST   /api/couple/recommendations/:id/feedback      // Provide detailed feedback

// Advanced recommendation features
GET    /api/couple/recommendations/similar           // Get similar recommendations
GET    /api/couple/recommendations/alternatives      // Get alternative options
POST   /api/couple/recommendations/custom            // Generate custom recommendations
GET    /api/couple/recommendations/explanation/:id   // Get detailed explanation
```

### Vendor Recommendation & Discovery

```typescript
// Vendor-specific recommendation endpoints
GET    /api/couple/vendors/recommended               // Get recommended vendors
GET    /api/couple/vendors/matches                   // Get high-match vendors
POST   /api/couple/vendors/find-matches              // Find matches with criteria
GET    /api/couple/vendors/:id/compatibility         // Get compatibility score

// Vendor discovery and filtering
GET    /api/couple/vendors/discover                  // Discover new vendors
POST   /api/couple/vendors/smart-search              // AI-powered vendor search
GET    /api/couple/vendors/categories/:type          // Get vendors by category
GET    /api/couple/vendors/local                     // Get local vendor recommendations

// Comparison and alternatives
GET    /api/couple/vendors/compare                   // Compare recommended vendors
GET    /api/couple/vendors/:id/alternatives          // Get alternatives to specific vendor
POST   /api/couple/vendors/batch-evaluate            // Evaluate multiple vendors
```

### Supplier Intelligence APIs

```typescript
// Supplier-side recommendation intelligence
GET    /api/supplier/recommendations/clients         // Get recommended clients
GET    /api/supplier/leads/smart-matches             // Get high-potential leads
GET    /api/supplier/profile/optimization            // Get profile optimization suggestions
GET    /api/supplier/performance/recommendations     // Get performance improvement recommendations

// Market intelligence for suppliers
GET    /api/supplier/market/insights                 // Get market insights and trends
GET    /api/supplier/competitors/analysis            // Competitive positioning analysis
GET    /api/supplier/pricing/recommendations         // Get pricing optimization suggestions
GET    /api/supplier/booking/predictions             // Get booking demand predictions

// Supplier matching profile management
GET    /api/supplier/matching-profile                // Get current matching profile
PUT    /api/supplier/matching-profile                // Update matching profile
POST   /api/supplier/matching-profile/analyze        // Analyze and optimize profile
GET    /api/supplier/matching-profile/performance    // Get profile performance metrics
```

### Analytics & Learning APIs

```typescript
// Recommendation system analytics
GET    /api/admin/recommendations/performance        // Get system-wide performance metrics
GET    /api/admin/recommendations/algorithms         // Get algorithm performance comparison
POST   /api/admin/recommendations/retrain            // Trigger model retraining
GET    /api/admin/recommendations/insights           // Get system insights and patterns

// A/B testing and experimentation
POST   /api/admin/recommendations/experiments        // Create new experiment
GET    /api/admin/recommendations/experiments        // List active experiments
PUT    /api/admin/recommendations/experiments/:id    // Update experiment
GET    /api/admin/recommendations/experiments/:id/results // Get experiment results

// Model management
GET    /api/admin/ml-models                          // List all ML models
POST   /api/admin/ml-models/deploy                   // Deploy new model version
GET    /api/admin/ml-models/:id/performance          // Get model performance metrics
POST   /api/admin/ml-models/:id/rollback             // Rollback to previous version
```

## Frontend Components

### Smart Recommendations Dashboard

```typescript
// Main recommendations dashboard component
const SmartRecommendationsDashboard: React.FC = () => {
    const { couple } = useAuth();
    const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'card' | 'list' | 'priority'>('card');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: recommendationData, isLoading, mutate } = useSWR(
        `/api/couple/recommendations?filter=${activeFilter}`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false
        }
    );

    const recommendationTypes = [
        { key: 'all', label: 'All Recommendations', icon: Sparkles },
        { key: 'vendor', label: 'Vendors', icon: Users },
        { key: 'timeline', label: 'Timeline', icon: Calendar },
        { key: 'budget', label: 'Budget', icon: DollarSign },
        { key: 'task', label: 'Tasks', icon: CheckSquare }
    ];

    const handleRecommendationInteraction = useCallback(async (
        recommendationId: string, 
        interaction: 'view' | 'click' | 'save' | 'dismiss'
    ) => {
        try {
            await fetch(`/api/couple/recommendations/${recommendationId}/${interaction}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            // Optimistically update UI
            if (interaction === 'dismiss') {
                setRecommendations(prev => 
                    prev.filter(rec => rec.id !== recommendationId)
                );
            }
        } catch (error) {
            console.error(`Failed to track ${interaction}:`, error);
        }
    }, []);

    const refreshRecommendations = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await fetch('/api/couple/recommendations/refresh', { method: 'POST' });
            mutate(); // Revalidate SWR data
        } catch (error) {
            console.error('Failed to refresh recommendations:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [mutate]);

    return (
        <div className="space-y-6">
            {/* Header with Controls */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Your Recommendations
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Personalized suggestions based on your wedding details
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    {/* View Mode Selector */}
                    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                        {[
                            { mode: 'card', icon: Grid3X3, label: 'Cards' },
                            { mode: 'list', icon: List, label: 'List' },
                            { mode: 'priority', icon: TrendingUp, label: 'Priority' }
                        ].map(({ mode, icon: Icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode as any)}
                                className={cn(
                                    "p-2 rounded-md transition-colors",
                                    viewMode === mode 
                                        ? "bg-white shadow-sm text-blue-600" 
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                                title={label}
                            >
                                <Icon className="h-4 w-4" />
                            </button>
                        ))}
                    </div>

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshRecommendations}
                        disabled={isRefreshing}
                        className="flex items-center space-x-2"
                    >
                        <RefreshCw className={cn(
                            "h-4 w-4",
                            isRefreshing && "animate-spin"
                        )} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Recommendation Type Filter */}
            <div className="flex flex-wrap gap-2">
                {recommendationTypes.map(({ key, label, icon: Icon }) => (
                    <Button
                        key={key}
                        variant={activeFilter === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveFilter(key)}
                        className="flex items-center space-x-2"
                    >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        {recommendationData?.counts?.[key] && (
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                                {recommendationData.counts[key]}
                            </Badge>
                        )}
                    </Button>
                ))}
            </div>

            {/* Recommendations Content */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="p-4">
                            <div className="animate-pulse space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-full"></div>
                                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <RecommendationsContent
                    recommendations={recommendationData?.recommendations || []}
                    viewMode={viewMode}
                    onInteraction={handleRecommendationInteraction}
                />
            )}

            {/* Empty State */}
            {!isLoading && (!recommendationData?.recommendations?.length) && (
                <Card className="p-12 text-center">
                    <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No recommendations yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Complete your wedding basics to get personalized recommendations
                    </p>
                    <Button asChild>
                        <Link href="/wedding-setup">
                            Complete Wedding Setup
                        </Link>
                    </Button>
                </Card>
            )}
        </div>
    );
};
```

### Individual Recommendation Card

```typescript
// Enhanced recommendation card with interaction tracking
const RecommendationCard: React.FC<{
    recommendation: SmartRecommendation;
    onInteraction: (id: string, type: string) => void;
    viewMode: 'card' | 'list' | 'priority';
}> = ({ recommendation, onInteraction, viewMode }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [userRating, setUserRating] = useState<number | null>(recommendation.user_rating);
    const cardRef = useRef<HTMLDivElement>(null);

    // Track view when component becomes visible
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !recommendation.viewed_at) {
                    onInteraction(recommendation.id, 'view');
                }
            },
            { threshold: 0.5, rootMargin: '50px' }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, [recommendation.id, recommendation.viewed_at, onInteraction]);

    const handleClick = () => {
        onInteraction(recommendation.id, 'click');
        setIsExpanded(!isExpanded);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        onInteraction(recommendation.id, 'save');
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        onInteraction(recommendation.id, 'dismiss');
    };

    const handleRate = (rating: number) => {
        setUserRating(rating);
        onInteraction(recommendation.id, 'rate');
        // Also send rating value to API
        fetch(`/api/couple/recommendations/${recommendation.id}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });
    };

    const confidenceColor = recommendation.confidence_score > 0.8 
        ? 'text-green-600 bg-green-50' 
        : recommendation.confidence_score > 0.6 
        ? 'text-blue-600 bg-blue-50'
        : 'text-yellow-600 bg-yellow-50';

    if (viewMode === 'list') {
        return (
            <Card 
                ref={cardRef}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={handleClick}
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                            <RecommendationIcon type={recommendation.recommendation_type} />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 truncate">
                                    {recommendation.recommendation_title}
                                </h3>
                                <p className="text-sm text-gray-600 truncate">
                                    {recommendation.recommendation_description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 ml-4">
                        <Badge 
                            variant="outline" 
                            className={cn("text-xs", confidenceColor)}
                        >
                            {Math.round(recommendation.confidence_score * 100)}% match
                        </Badge>

                        <div className="flex items-center space-x-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSave}
                                className="text-gray-400 hover:text-blue-600"
                            >
                                <Bookmark className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDismiss}
                                className="text-gray-400 hover:text-red-600"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card 
            ref={cardRef}
            className={cn(
                "cursor-pointer transition-all duration-200",
                "hover:shadow-lg hover:ring-1 hover:ring-blue-200",
                isExpanded && "ring-2 ring-blue-500"
            )}
            onClick={handleClick}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <RecommendationIcon 
                            type={recommendation.recommendation_type} 
                            className="h-8 w-8" 
                        />
                        <div>
                            <h3 className="font-semibold text-gray-900 line-clamp-2">
                                {recommendation.recommendation_title}
                            </h3>
                            <p className="text-sm text-gray-600 capitalize">
                                {recommendation.category.replace('_', ' ')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Badge 
                            variant="outline" 
                            className={cn("text-xs font-medium", confidenceColor)}
                        >
                            {Math.round(recommendation.confidence_score * 100)}% match
                        </Badge>
                    </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {recommendation.recommendation_description}
                </p>

                {/* Matching Factors */}
                {recommendation.matching_factors && Object.keys(recommendation.matching_factors).length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Why this matches:</p>
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(recommendation.matching_factors).slice(0, 3).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                    {key.replace('_', ' ')}: {String(value)}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                        {/* Detailed Reasoning */}
                        {recommendation.reasoning_explanation && (
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">
                                    Why we recommend this:
                                </h4>
                                <p className="text-sm text-gray-600">
                                    {recommendation.reasoning_explanation}
                                </p>
                            </div>
                        )}

                        {/* User Rating */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                How helpful is this recommendation?
                            </label>
                            <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRate(rating);
                                        }}
                                        className="text-gray-300 hover:text-yellow-400 transition-colors"
                                    >
                                        <Star 
                                            className={cn(
                                                "h-5 w-5",
                                                userRating && rating <= userRating 
                                                    ? "text-yellow-400 fill-current" 
                                                    : ""
                                            )} 
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSave}
                            className="text-gray-600 hover:text-blue-600"
                        >
                            <Bookmark className="h-4 w-4 mr-1" />
                            Save
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="text-gray-600 hover:text-red-600"
                        >
                            <X className="h-4 w-4 mr-1" />
                            Dismiss
                        </Button>
                    </div>

                    {recommendation.recommended_item_id && (
                        <Button size="sm" asChild>
                            <Link 
                                href={`/vendors/${recommendation.recommended_item_id}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                View Details
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};
```

### Vendor Matching Component

```typescript
// Smart vendor matching and discovery component
const SmartVendorMatching: React.FC<{
    vendorType?: string;
    onVendorSelect?: (vendor: Supplier) => void;
}> = ({ vendorType, onVendorSelect }) => {
    const { couple } = useAuth();
    const [matches, setMatches] = useState<VendorMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<VendorFilters>({
        maxDistance: 50,
        budgetRange: [0, 10000],
        stylePreferences: [],
        availabilityRequired: true
    });

    const { data: weddingBasics } = useSWR('/api/couple/core-fields/wedding-basics');

    useEffect(() => {
        findSmartMatches();
    }, [vendorType, filters]);

    const findSmartMatches = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/couple/vendors/find-matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendor_type: vendorType,
                    filters,
                    wedding_context: weddingBasics,
                    limit: 20
                })
            });

            const data = await response.json();
            setMatches(data.matches || []);
        } catch (error) {
            console.error('Failed to find vendor matches:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVendorClick = (vendor: VendorMatch) => {
        // Track interaction
        fetch(`/api/couple/recommendations/${vendor.recommendation_id}/click`, {
            method: 'POST'
        });

        if (onVendorSelect) {
            onVendorSelect(vendor.supplier);
        }
    };

    return (
        <div className="space-y-6">
            {/* Smart Filters */}
            <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">
                    Smart Matching Preferences
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Distance Filter */}
                    <div>
                        <Label className="text-sm font-medium">Max Distance</Label>
                        <Select 
                            value={filters.maxDistance.toString()} 
                            onValueChange={(value) => 
                                setFilters(prev => ({ ...prev, maxDistance: parseInt(value) }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25 km</SelectItem>
                                <SelectItem value="50">50 km</SelectItem>
                                <SelectItem value="100">100 km</SelectItem>
                                <SelectItem value="200">200 km</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Budget Range */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Budget Range</Label>
                        <div className="px-3">
                            <Slider
                                value={filters.budgetRange}
                                onValueChange={(value) => 
                                    setFilters(prev => ({ ...prev, budgetRange: value }))
                                }
                                max={20000}
                                min={500}
                                step={500}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>${filters.budgetRange[0]}</span>
                                <span>${filters.budgetRange[1]}</span>
                            </div>
                        </div>
                    </div>

                    {/* Style Matching */}
                    <div>
                        <Label className="text-sm font-medium">Style Matching</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Match my style" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="strict">Strict match</SelectItem>
                                <SelectItem value="flexible">Flexible match</SelectItem>
                                <SelectItem value="all">Show all styles</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Smart Matches Results */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="p-4">
                            <div className="animate-pulse space-y-3">
                                <div className="flex items-center space-x-3">
                                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                                    </div>
                                </div>
                                <div className="h-3 bg-gray-200 rounded w-full"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {matches.map((match) => (
                        <VendorMatchCard
                            key={match.supplier.id}
                            match={match}
                            onClick={() => handleVendorClick(match)}
                        />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && matches.length === 0 && (
                <Card className="p-8 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No matches found
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Try adjusting your preferences to see more options
                    </p>
                    <Button onClick={findSmartMatches}>
                        Search Again
                    </Button>
                </Card>
            )}
        </div>
    );
};
```

## Implementation Code Examples

### Smart Recommendations Service

```typescript
// Core recommendation engine service
export class SmartRecommendationsService {
    constructor(
        private supabase: SupabaseClient,
        private mlService: MLService,
        private couplesService: CouplesService,
        private suppliersService: SuppliersService,
        private analyticsService: AnalyticsService
    ) {}

    async generateRecommendationsForCouple(
        coupleId: string,
        options: {
            types?: RecommendationType[];
            limit?: number;
            refreshCache?: boolean;
        } = {}
    ): Promise<SmartRecommendation[]> {
        const { types = ['vendor', 'timeline', 'task'], limit = 50, refreshCache = false } = options;

        // Get couple context and preferences
        const [coupleProfile, weddingBasics, existingRecommendations] = await Promise.all([
            this.getCouplePreferenceProfile(coupleId),
            this.couplesService.getWeddingBasics(coupleId),
            refreshCache ? [] : this.getExistingRecommendations(coupleId, types)
        ]);

        if (!refreshCache && existingRecommendations.length > 0) {
            return this.rankAndFilterRecommendations(existingRecommendations, limit);
        }

        const recommendations: SmartRecommendation[] = [];

        // Generate recommendations for each requested type
        for (const type of types) {
            const typeRecommendations = await this.generateTypeSpecificRecommendations({
                type,
                coupleId,
                coupleProfile,
                weddingBasics,
                limit: Math.ceil(limit / types.length)
            });

            recommendations.push(...typeRecommendations);
        }

        // Apply ML scoring and ranking
        const scoredRecommendations = await this.applyMLScoring(recommendations, coupleProfile);
        
        // Store recommendations in database
        await this.storeRecommendations(scoredRecommendations);

        // Return top recommendations
        return this.rankAndFilterRecommendations(scoredRecommendations, limit);
    }

    private async generateTypeSpecificRecommendations(params: {
        type: RecommendationType;
        coupleId: string;
        coupleProfile: CouplePreferenceProfile;
        weddingBasics: WeddingBasics;
        limit: number;
    }): Promise<SmartRecommendation[]> {
        const { type, coupleId, coupleProfile, weddingBasics, limit } = params;

        switch (type) {
            case 'vendor':
                return this.generateVendorRecommendations({
                    coupleId,
                    coupleProfile,
                    weddingBasics,
                    limit
                });
            case 'timeline':
                return this.generateTimelineRecommendations({
                    coupleId,
                    weddingBasics,
                    limit: Math.min(limit, 10) // Timeline recommendations are fewer but more important
                });
            case 'task':
                return this.generateTaskRecommendations({
                    coupleId,
                    weddingBasics,
                    limit
                });
            case 'budget':
                return this.generateBudgetRecommendations({
                    coupleId,
                    coupleProfile,
                    weddingBasics,
                    limit: Math.min(limit, 5) // Budget recommendations are strategic
                });
            default:
                return [];
        }
    }

    private async generateVendorRecommendations(params: {
        coupleId: string;
        coupleProfile: CouplePreferenceProfile;
        weddingBasics: WeddingBasics;
        limit: number;
    }): Promise<SmartRecommendation[]> {
        const { coupleId, coupleProfile, weddingBasics, limit } = params;

        // Define vendor types needed based on wedding basics
        const neededVendorTypes = this.determineNeededVendorTypes(weddingBasics);

        const recommendations: SmartRecommendation[] = [];

        for (const vendorType of neededVendorTypes) {
            // Find matching suppliers for this vendor type
            const matchingSuppliers = await this.findMatchingSuppliers({
                vendorType,
                coupleProfile,
                weddingBasics,
                limit: Math.ceil(limit / neededVendorTypes.length)
            });

            for (const supplier of matchingSuppliers) {
                const matchScore = await this.calculateVendorMatchScore(
                    supplier,
                    coupleProfile,
                    weddingBasics
                );

                if (matchScore.overall_score > 0.4) { // Minimum threshold
                    recommendations.push({
                        id: generateId(),
                        couple_id: coupleId,
                        recommendation_type: 'vendor',
                        category: vendorType,
                        recommended_item_id: supplier.id,
                        recommendation_title: `${supplier.business_name} - ${vendorType}`,
                        recommendation_description: this.generateVendorRecommendationDescription(
                            supplier,
                            matchScore
                        ),
                        confidence_score: matchScore.confidence,
                        match_score: matchScore.overall_score,
                        matching_factors: matchScore.factors,
                        reasoning_explanation: matchScore.reasoning,
                        recommendation_source: 'algorithm',
                        priority_score: this.calculatePriorityScore(vendorType, weddingBasics),
                        contextual_data: {
                            wedding_date: weddingBasics.wedding_date,
                            venue_location: weddingBasics.ceremony_venue?.coordinates,
                            guest_count: weddingBasics.guest_count,
                            style_preferences: coupleProfile.preferred_styles
                        }
                    });
                }
            }
        }

        return recommendations;
    }

    private async calculateVendorMatchScore(
        supplier: Supplier,
        coupleProfile: CouplePreferenceProfile,
        weddingBasics: WeddingBasics
    ): Promise<VendorMatchScore> {
        const factors: Record<string, number> = {};
        let totalScore = 0;
        let factorCount = 0;

        // Style matching
        if (coupleProfile.preferred_styles.length > 0) {
            const supplierProfile = await this.getSupplierMatchingProfile(supplier.id);
            const styleOverlap = this.calculateArrayOverlap(
                coupleProfile.preferred_styles,
                supplierProfile?.style_tags || []
            );
            factors.style_match = styleOverlap;
            totalScore += styleOverlap * 0.3; // 30% weight
            factorCount += 0.3;
        }

        // Location proximity
        if (weddingBasics.ceremony_venue?.coordinates && supplier.service_area) {
            const distance = this.calculateDistance(
                weddingBasics.ceremony_venue.coordinates,
                supplier.location
            );
            const proximityScore = Math.max(0, 1 - (distance / 100)); // 100km max distance
            factors.location_proximity = proximityScore;
            totalScore += proximityScore * 0.25; // 25% weight
            factorCount += 0.25;
        }

        // Budget alignment
        if (weddingBasics.budget_estimate && supplier.pricing_info) {
            const budgetAlignment = this.calculateBudgetAlignment(
                weddingBasics.budget_estimate,
                supplier.pricing_info
            );
            factors.budget_alignment = budgetAlignment;
            totalScore += budgetAlignment * 0.2; // 20% weight
            factorCount += 0.2;
        }

        // Availability
        if (weddingBasics.wedding_date) {
            const availability = await this.checkSupplierAvailability(
                supplier.id,
                weddingBasics.wedding_date
            );
            factors.availability = availability ? 1 : 0;
            totalScore += (availability ? 1 : 0) * 0.15; // 15% weight
            factorCount += 0.15;
        }

        // Quality metrics
        const qualityScore = this.calculateQualityScore(supplier);
        factors.quality_score = qualityScore;
        totalScore += qualityScore * 0.1; // 10% weight
        factorCount += 0.1;

        const overallScore = factorCount > 0 ? totalScore / factorCount : 0;
        const confidence = this.calculateConfidence(factors, factorCount);

        return {
            overall_score: overallScore,
            confidence,
            factors,
            reasoning: this.generateMatchingReasoning(factors, supplier)
        };
    }

    private async applyMLScoring(
        recommendations: SmartRecommendation[],
        coupleProfile: CouplePreferenceProfile
    ): Promise<SmartRecommendation[]> {
        // Use ML model to enhance scores based on historical data
        const mlPredictions = await this.mlService.predictRecommendationSuccess({
            recommendations,
            coupleProfile,
            model: 'recommendation_scoring_v2'
        });

        return recommendations.map((rec, index) => ({
            ...rec,
            confidence_score: Math.min(1, rec.confidence_score + mlPredictions[index].confidence_boost),
            match_score: Math.min(1, rec.match_score + mlPredictions[index].match_boost),
            recommendation_version: 2 // Track ML enhancement
        }));
    }

    async trackRecommendationInteraction(
        recommendationId: string,
        interactionType: RecommendationInteractionType,
        context: InteractionContext = {}
    ): Promise<void> {
        const interaction: RecommendationInteraction = {
            id: generateId(),
            recommendation_id: recommendationId,
            couple_id: context.coupleId || '',
            interaction_type: interactionType,
            interaction_context: context,
            device_type: this.detectDeviceType(context.userAgent),
            user_agent: context.userAgent,
            session_id: context.sessionId,
            interaction_duration_ms: context.duration,
            created_at: new Date().toISOString()
        };

        await this.supabase
            .from('recommendation_interactions')
            .insert(interaction);

        // Update recommendation status
        const statusUpdate: Partial<SmartRecommendation> = {
            updated_at: new Date().toISOString()
        };

        switch (interactionType) {
            case 'view':
                statusUpdate.status = 'viewed';
                statusUpdate.viewed_at = new Date().toISOString();
                break;
            case 'click':
                statusUpdate.status = 'clicked';
                statusUpdate.clicked_at = new Date().toISOString();
                break;
            case 'dismiss':
                statusUpdate.status = 'dismissed';
                statusUpdate.dismissed_at = new Date().toISOString();
                statusUpdate.dismissal_reason = context.dismissalReason;
                break;
            case 'rate':
                statusUpdate.user_rating = context.rating;
                statusUpdate.user_feedback = context.feedback;
                break;
        }

        await this.supabase
            .from('smart_recommendations')
            .update(statusUpdate)
            .eq('id', recommendationId);

        // Trigger learning update
        this.triggerLearningUpdate(recommendationId, interactionType, context);
    }

    private async triggerLearningUpdate(
        recommendationId: string,
        interactionType: RecommendationInteractionType,
        context: InteractionContext
    ): Promise<void> {
        // Queue learning update for batch processing
        await this.analyticsService.queueLearningEvent({
            type: 'recommendation_interaction',
            recommendation_id: recommendationId,
            interaction_type: interactionType,
            context,
            timestamp: new Date().toISOString()
        });
    }

    async updateCouplePreferenceProfile(
        coupleId: string,
        updates: Partial<CouplePreferenceProfile>
    ): Promise<void> {
        const existingProfile = await this.getCouplePreferenceProfile(coupleId);
        
        const updatedProfile = {
            ...existingProfile,
            ...updates,
            profile_completeness_score: this.calculateProfileCompleteness({ ...existingProfile, ...updates }),
            last_interaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await this.supabase
            .from('couple_preference_profiles')
            .upsert(updatedProfile);

        // Trigger recommendation refresh if significant changes
        const significantChanges = this.hasSignificantChanges(existingProfile, updates);
        if (significantChanges) {
            this.generateRecommendationsForCouple(coupleId, { refreshCache: true });
        }
    }
}
```

### ML-Enhanced Vendor Matching

```typescript
// Machine learning enhanced vendor matching service
export class MLVendorMatchingService {
    constructor(
        private supabase: SupabaseClient,
        private mlService: MLService
    ) {}

    async findOptimalVendorMatches(params: {
        coupleId: string;
        vendorType: string;
        weddingContext: WeddingBasics;
        preferences: CouplePreferenceProfile;
        limit: number;
    }): Promise<VendorMatch[]> {
        const { coupleId, vendorType, weddingContext, preferences, limit } = params;

        // Get candidate vendors
        const candidates = await this.getCandidateVendors({
            vendorType,
            location: weddingContext.ceremony_venue?.coordinates,
            maxDistance: 100,
            availability: weddingContext.wedding_date
        });

        if (candidates.length === 0) {
            return [];
        }

        // Apply ML-based scoring
        const scoredMatches = await this.scoreCandidatesWithML({
            candidates,
            coupleId,
            weddingContext,
            preferences
        });

        // Rank and filter results
        const rankedMatches = scoredMatches
            .sort((a, b) => b.overall_score - a.overall_score)
            .slice(0, limit);

        return rankedMatches;
    }

    private async scoreCandidatesWithML(params: {
        candidates: Supplier[];
        coupleId: string;
        weddingContext: WeddingBasics;
        preferences: CouplePreferenceProfile;
    }): Promise<VendorMatch[]> {
        const { candidates, coupleId, weddingContext, preferences } = params;

        // Prepare features for ML model
        const features = await Promise.all(
            candidates.map(async (candidate) => {
                const supplierProfile = await this.getSupplierMatchingProfile(candidate.id);
                return this.extractMatchingFeatures({
                    supplier: candidate,
                    supplierProfile,
                    weddingContext,
                    preferences
                });
            })
        );

        // Get ML predictions
        const predictions = await this.mlService.predictVendorMatches({
            features,
            model: 'vendor_matching_v3',
            couple_context: {
                couple_id: coupleId,
                wedding_style: preferences.preferred_styles,
                budget_range: weddingContext.budget_estimate,
                guest_count: weddingContext.guest_count
            }
        });

        // Combine candidates with predictions
        const matches: VendorMatch[] = candidates.map((supplier, index) => ({
            supplier,
            supplier_profile: supplierProfile[index],
            match_prediction: predictions[index],
            overall_score: predictions[index].match_probability,
            confidence_score: predictions[index].confidence,
            matching_factors: this.extractMatchingFactors(features[index], predictions[index]),
            recommendation_reasoning: this.generateRecommendationReasoning(
                supplier,
                predictions[index]
            )
        }));

        return matches;
    }

    private extractMatchingFeatures(params: {
        supplier: Supplier;
        supplierProfile: SupplierMatchingProfile | null;
        weddingContext: WeddingBasics;
        preferences: CouplePreferenceProfile;
    }): MatchingFeatures {
        const { supplier, supplierProfile, weddingContext, preferences } = params;

        return {
            // Style matching features
            style_overlap_score: this.calculateStyleOverlap(
                preferences.preferred_styles,
                supplierProfile?.style_tags || []
            ),
            formality_match: this.calculateFormalityMatch(
                weddingContext.formality_level,
                supplierProfile?.formality_levels || []
            ),
            
            // Location and logistics features
            distance_km: this.calculateDistance(
                weddingContext.ceremony_venue?.coordinates,
                supplier.location
            ),
            travel_time_minutes: this.estimateTravelTime(
                weddingContext.ceremony_venue?.coordinates,
                supplier.location
            ),
            within_service_area: this.isWithinServiceArea(
                weddingContext.ceremony_venue?.coordinates,
                supplierProfile?.primary_service_area
            ),

            // Budget and pricing features
            budget_fit_score: this.calculateBudgetFit(
                weddingContext.budget_estimate,
                supplierProfile?.budget_range_min,
                supplierProfile?.budget_range_max
            ),
            price_per_guest: this.calculatePricePerGuest(
                supplierProfile?.budget_range_min || 0,
                weddingContext.guest_count
            ),

            // Quality and reliability features
            supplier_rating: supplier.average_rating || 0,
            review_count: supplier.review_count || 0,
            response_time_hours: supplierProfile?.response_time_avg_hours || 24,
            completion_rate: supplierProfile?.completion_rate || 0.9,
            booking_conversion_rate: supplierProfile?.booking_conversion_rate || 0.1,

            // Temporal features
            days_until_wedding: this.calculateDaysUntilWedding(weddingContext.wedding_date),
            booking_lead_time_fit: this.calculateLeadTimeFit(
                weddingContext.wedding_date,
                supplierProfile?.booking_lead_time_weeks || 12
            ),
            seasonal_availability: this.checkSeasonalAvailability(
                weddingContext.wedding_date,
                supplierProfile?.seasonal_availability
            ),

            // Wedding size and complexity features
            guest_count: weddingContext.guest_count || 100,
            venue_complexity: this.assessVenueComplexity(weddingContext.ceremony_venue),
            multi_location_event: weddingContext.ceremony_venue?.place_id !== 
                                 weddingContext.reception_venue?.place_id,

            // Couple behavior features
            price_sensitivity: preferences.price_sensitivity_score || 0.5,
            decision_speed: this.assessDecisionSpeed(preferences.decision_making_style),
            communication_preference_match: this.calculateCommunicationMatch(
                preferences.communication_preferences,
                supplierProfile?.communication_style
            )
        };
    }

    async analyzeSupplierPortfolio(supplierId: string): Promise<PortfolioAnalysis> {
        const supplier = await this.suppliersService.getSupplier(supplierId);
        const portfolio = await this.getSupplierPortfolio(supplierId);

        if (!portfolio || portfolio.images.length === 0) {
            return {
                style_tags: [],
                confidence: 0,
                dominant_colors: [],
                formality_assessment: 'unknown',
                venue_types: []
            };
        }

        // Use computer vision to analyze portfolio images
        const imageAnalysis = await this.mlService.analyzeImages({
            images: portfolio.images.slice(0, 20), // Analyze up to 20 images
            analysis_types: ['style_detection', 'color_extraction', 'venue_classification', 'formality_assessment']
        });

        // Analyze text descriptions
        const textAnalysis = await this.mlService.analyzeText({
            texts: [
                supplier.business_description,
                portfolio.description,
                ...portfolio.project_descriptions
            ].filter(Boolean),
            analysis_types: ['style_keywords', 'sentiment', 'formality']
        });

        // Combine analyses
        return {
            style_tags: this.combineStyleAnalysis(imageAnalysis.styles, textAnalysis.styles),
            confidence: Math.min(imageAnalysis.confidence, textAnalysis.confidence),
            dominant_colors: imageAnalysis.dominant_colors,
            formality_assessment: this.combineFormality(
                imageAnalysis.formality,
                textAnalysis.formality
            ),
            venue_types: imageAnalysis.venue_types,
            analysis_metadata: {
                image_count: portfolio.images.length,
                text_sources: textAnalysis.sources,
                last_updated: new Date().toISOString()
            }
        };
    }

    async trainMatchingModel(): Promise<ModelTrainingResult> {
        console.log('Starting vendor matching model training...');

        // Collect training data from successful matches
        const trainingData = await this.collectTrainingData();
        
        if (trainingData.length < 1000) {
            throw new Error('Insufficient training data. Need at least 1000 examples.');
        }

        // Prepare features and labels
        const { features, labels } = this.prepareTrainingData(trainingData);

        // Train the model
        const trainingResult = await this.mlService.trainModel({
            model_type: 'vendor_matching',
            features,
            labels,
            validation_split: 0.2,
            hyperparameters: {
                learning_rate: 0.001,
                epochs: 100,
                batch_size: 32,
                regularization: 0.01
            }
        });

        // Evaluate model performance
        const evaluation = await this.evaluateModel(trainingResult.model_id);

        // Store model metadata
        await this.storeModelMetadata({
            model_name: 'vendor_matching',
            model_version: `v${Date.now()}`,
            training_result: trainingResult,
            evaluation,
            training_data_size: trainingData.length
        });

        return {
            model_id: trainingResult.model_id,
            accuracy: evaluation.accuracy,
            precision: evaluation.precision,
            recall: evaluation.recall,
            f1_score: evaluation.f1_score,
            training_time_minutes: trainingResult.training_time_minutes,
            ready_for_deployment: evaluation.accuracy > 0.75
        };
    }
}
```

## MCP Server Usage

### Development & Testing
- **Browser MCP**: Smart recommendations UI testing, vendor matching flow validation, mobile interaction patterns
- **Playwright MCP**: Automated testing of recommendation generation, interaction tracking, ML scoring accuracy
- **PostgreSQL MCP**: Recommendation data integrity, performance analytics, ML model evaluation

### AI & Machine Learning
- **OpenAI MCP**: Natural language recommendation explanations, style analysis, content personalization
- **Sequential Thinking MCP**: Complex recommendation logic planning, multi-factor scoring decisions
- **Context7 MCP**: ML library documentation, recommendation system patterns, algorithm optimization

### Real-time Analytics
- **Supabase MCP**: Real-time recommendation updates, interaction event streaming, preference profile synchronization
- **Memory MCP**: Learning pattern storage, recommendation history, algorithm performance tracking

### Performance Monitoring
- **Filesystem MCP**: ML model storage, training data management, recommendation cache optimization
- **Slack MCP**: Recommendation system alerts, performance monitoring, A/B test notifications

## Navigation Integration

### Couple Dashboard Integration
- **Recommendations Tab**: Primary navigation item with personalized recommendation feed
- **Vendor Discovery**: Smart vendor search with ML-powered matching
- **Planning Assistant**: AI-driven task and timeline recommendations
- **Saved Items**: Bookmarked recommendations and interaction history

### Vendor Platform Integration
- **Lead Intelligence**: Smart couple matching for suppliers based on profile analysis
- **Market Insights**: AI-powered competitive analysis and opportunity identification
- **Profile Optimization**: ML-driven suggestions for improving supplier visibility
- **Performance Analytics**: Recommendation effectiveness tracking and optimization

### Admin Dashboard
- **Algorithm Performance**: Real-time monitoring of recommendation system effectiveness
- **A/B Testing**: Experiment management for recommendation algorithms
- **ML Model Management**: Model deployment, performance tracking, and rollback capabilities
- **User Behavior Analytics**: Comprehensive interaction analysis and pattern identification

## Testing Requirements

### Recommendation Generation Testing
```typescript
describe('Smart Recommendations Engine', () => {
    test('generates personalized vendor recommendations', async () => {
        const couple = await createTestCouple({
            wedding_date: '2024-10-15',
            guest_count: 120,
            style_preferences: ['modern', 'elegant'],
            budget_estimate: 25000
        });

        const recommendations = await recommendationService.generateRecommendationsForCouple(
            couple.id,
            { types: ['vendor'], limit: 10 }
        );

        expect(recommendations).toHaveLength(10);
        expect(recommendations[0].recommendation_type).toBe('vendor');
        expect(recommendations[0].confidence_score).toBeGreaterThan(0.5);
        expect(recommendations[0].matching_factors).toHaveProperty('style_match');
        expect(recommendations[0].reasoning_explanation).toBeTruthy();
    });

    test('applies ML scoring to improve recommendation quality', async () => {
        const basicRecommendations = await generateBasicRecommendations();
        const mlEnhancedRecommendations = await recommendationService.applyMLScoring(
            basicRecommendations,
            testCoupleProfile
        );

        expect(mlEnhancedRecommendations[0].recommendation_version).toBe(2);
        expect(mlEnhancedRecommendations[0].confidence_score)
            .toBeGreaterThanOrEqual(basicRecommendations[0].confidence_score);
    });

    test('tracks recommendation interactions accurately', async () => {
        const recommendation = await createTestRecommendation();
        
        await recommendationService.trackRecommendationInteraction(
            recommendation.id,
            'click',
            { coupleId: testCouple.id, sessionId: 'test-session' }
        );

        const updatedRecommendation = await getRecommendation(recommendation.id);
        expect(updatedRecommendation.status).toBe('clicked');
        expect(updatedRecommendation.clicked_at).toBeTruthy();

        const interactions = await getRecommendationInteractions(recommendation.id);
        expect(interactions).toHaveLength(1);
        expect(interactions[0].interaction_type).toBe('click');
    });

    test('learns from user feedback to improve future recommendations', async () => {
        const recommendation = await createTestRecommendation();
        
        // Simulate positive user feedback
        await recommendationService.trackRecommendationInteraction(
            recommendation.id,
            'rate',
            { 
                coupleId: testCouple.id, 
                rating: 5, 
                feedback: 'Perfect match for our style!' 
            }
        );

        // Verify learning event was queued
        const learningEvents = await getLearningEvents();
        expect(learningEvents).toContainEqual(
            expect.objectContaining({
                type: 'recommendation_interaction',
                recommendation_id: recommendation.id,
                interaction_type: 'rate'
            })
        );
    });
});
```

### ML Model Performance Testing
```typescript
describe('ML Vendor Matching', () => {
    test('scores vendor matches with high accuracy', async () => {
        const testCases = await loadVendorMatchingTestCases();
        
        for (const testCase of testCases) {
            const matches = await mlVendorMatchingService.findOptimalVendorMatches({
                coupleId: testCase.couple_id,
                vendorType: testCase.vendor_type,
                weddingContext: testCase.wedding_context,
                preferences: testCase.preferences,
                limit: 10
            });

            // Verify high-confidence matches
            expect(matches[0].confidence_score).toBeGreaterThan(0.7);
            expect(matches[0].matching_factors).toHaveProperty('style_overlap_score');
            
            // Verify ranking quality
            for (let i = 1; i < matches.length; i++) {
                expect(matches[i-1].overall_score).toBeGreaterThanOrEqual(matches[i].overall_score);
            }
        }
    });

    test('analyzes supplier portfolios for style matching', async () => {
        const supplier = await createTestSupplier({
            vendor_type: 'photography',
            portfolio_images: [
                'modern_wedding_1.jpg',
                'modern_wedding_2.jpg',
                'elegant_reception.jpg'
            ]
        });

        const analysis = await mlVendorMatchingService.analyzeSupplierPortfolio(supplier.id);

        expect(analysis.style_tags).toContain('modern');
        expect(analysis.confidence).toBeGreaterThan(0.6);
        expect(analysis.dominant_colors).toHaveLength(3);
        expect(analysis.formality_assessment).toBe('formal');
    });

    test('retrains model with sufficient performance improvement', async () => {
        // Mock sufficient training data
        await seedTrainingData(1500);

        const trainingResult = await mlVendorMatchingService.trainMatchingModel();

        expect(trainingResult.accuracy).toBeGreaterThan(0.75);
        expect(trainingResult.precision).toBeGreaterThan(0.7);
        expect(trainingResult.recall).toBeGreaterThan(0.7);
        expect(trainingResult.ready_for_deployment).toBe(true);
    });
});
```

### User Experience Testing
```typescript
describe('Recommendations User Experience', () => {
    test('displays recommendations with proper interaction tracking', async () => {
        await browser.goto('/dashboard/recommendations');

        // Verify recommendations load
        await expect(browser.locator('[data-testid="recommendation-card"]')).toHaveCount(10);

        // Test view tracking
        const firstRecommendation = browser.locator('[data-testid="recommendation-card"]').first();
        await expect(firstRecommendation).toBeVisible();
        
        // View should be tracked automatically
        await browser.waitForTimeout(1000);
        const viewEvents = await getRecommendationInteractions('view');
        expect(viewEvents.length).toBeGreaterThan(0);

        // Test click tracking
        await firstRecommendation.click();
        const clickEvents = await getRecommendationInteractions('click');
        expect(clickEvents.length).toBeGreaterThan(0);
    });

    test('handles recommendation dismissal and feedback', async () => {
        await browser.goto('/dashboard/recommendations');

        const recommendationCard = browser.locator('[data-testid="recommendation-card"]').first();
        
        // Click dismiss button
        await recommendationCard.locator('[data-testid="dismiss-btn"]').click();
        
        // Should show feedback modal
        await expect(browser.locator('[data-testid="dismissal-feedback-modal"]')).toBeVisible();
        
        // Provide feedback
        await browser.selectOption('[data-testid="dismissal-reason"]', 'not_interested');
        await browser.fill('[data-testid="dismissal-feedback"]', 'Not my style');
        await browser.click('[data-testid="submit-dismissal"]');

        // Recommendation should be removed from view
        await expect(recommendationCard).not.toBeVisible();
        
        // Verify dismissal was recorded
        const dismissalEvents = await getRecommendationInteractions('dismiss');
        expect(dismissalEvents[0].dismissal_reason).toBe('not_interested');
    });

    test('provides recommendation explanations', async () => {
        await browser.goto('/dashboard/recommendations');

        const recommendationCard = browser.locator('[data-testid="recommendation-card"]').first();
        await recommendationCard.click();

        // Should expand to show detailed explanation
        await expect(browser.locator('[data-testid="recommendation-explanation"]')).toBeVisible();
        await expect(browser.locator('[data-testid="matching-factors"]')).toBeVisible();
        
        // Verify explanation contains reasoning
        const explanation = await browser.locator('[data-testid="recommendation-explanation"]').textContent();
        expect(explanation).toContain('recommended because');
    });
});
```

## Acceptance Criteria

### Recommendation Quality
- [ ] Generate vendor recommendations with 80%+ relevance based on wedding details
- [ ] Achieve 70%+ user satisfaction rating on recommendation helpfulness
- [ ] Maintain recommendation confidence scores above 60% for displayed items
- [ ] Provide detailed explanations for all high-confidence recommendations

### Machine Learning Performance
- [ ] ML models achieve 75%+ accuracy on vendor matching predictions
- [ ] Recommendation click-through rates improve 25% over baseline rules-based system
- [ ] Learning system adapts recommendations based on user feedback within 48 hours
- [ ] A/B testing framework supports concurrent algorithm evaluation

### User Interaction & Analytics
- [ ] Track all recommendation interactions (view, click, save, dismiss) with 99%+ accuracy
- [ ] Real-time interaction data influences future recommendations within 15 minutes
- [ ] User preference profiles update automatically based on behavior patterns
- [ ] Dismissal feedback collection rate above 60% for dismissed recommendations

### System Performance
- [ ] Generate personalized recommendations in under 2 seconds
- [ ] Support 1000+ concurrent recommendation generation requests
- [ ] ML inference latency under 500ms for vendor matching
- [ ] Recommendation cache hit rate above 70% for repeat requests

### Business Impact
- [ ] Increase vendor-couple connection rate by 30% compared to manual search
- [ ] Reduce time-to-first-vendor-contact by 40% through smart recommendations
- [ ] Improve user engagement with platform by 25% through personalized content
- [ ] Generate 10%+ increase in supplier booking conversion rates

## Dependencies

### Technical Dependencies
- **Wedding Basics System**: Core data for personalization (WS-284)
- **Supplier Profiles**: Complete vendor information and capabilities
- **Core Fields System**: Wedding context and preferences synchronization
- **ML Infrastructure**: Model training, inference, and deployment capabilities

### Data Dependencies
- **User Interaction Data**: Click tracking, ratings, booking outcomes
- **Supplier Performance Data**: Quality metrics, response times, success rates
- **Wedding Success Data**: Historical outcomes and satisfaction metrics
- **Market Data**: Pricing trends, seasonal patterns, regional preferences

### External Dependencies
- **ML/AI Services**: Model training infrastructure and inference APIs
- **Analytics Platform**: User behavior tracking and performance monitoring
- **A/B Testing Framework**: Algorithm comparison and optimization
- **Real-time Data Pipeline**: Immediate preference and behavior updates

## Effort Estimation

### Development Phase (3-4 weeks)
- **Core Recommendation Engine**: 1.5 weeks
  - Multi-factor scoring algorithms
  - Real-time recommendation generation
  - Interaction tracking and feedback systems
- **ML Integration**: 1 week
  - Vendor matching models
  - Portfolio analysis with computer vision
  - Learning and adaptation systems
- **Smart UI Components**: 1 week
  - Personalized recommendation dashboard
  - Interactive recommendation cards
  - Explanation and feedback interfaces
- **Analytics & Monitoring**: 0.5 weeks
  - Performance tracking dashboards
  - A/B testing framework
  - Real-time analytics integration

### ML Model Development (2-3 weeks)
- **Data Collection & Preparation**: 1 week
  - Historical interaction data analysis
  - Feature engineering for vendor matching
  - Training dataset preparation and validation
- **Model Training & Optimization**: 1.5 weeks
  - Vendor matching model development
  - Style analysis model training
  - Hyperparameter tuning and validation
- **Model Deployment & Integration**: 0.5 weeks
  - Production model deployment
  - A/B testing setup for model comparison
  - Performance monitoring implementation

### Testing & Optimization (1 week)
- **Recommendation Quality Testing**: 3 days
  - Algorithm accuracy validation
  - User experience testing across devices
  - Performance benchmarking under load
- **ML Model Validation**: 2 days
  - Prediction accuracy verification
  - Bias detection and mitigation
  - Model performance monitoring setup
- **Integration Testing**: 2 days
  - End-to-end recommendation flow testing
  - Real-time learning system validation
  - Cross-platform compatibility verification

**Total Estimated Effort: 4-6 weeks** (including comprehensive ML development and testing)

---

**Status**: Ready for Development  
**Priority**: High - Core AI Feature  
**Technical Complexity**: High  
**Business Impact**: Very High - Platform differentiation through intelligent personalization

This comprehensive Smart Recommendations Engine transforms WedSync from a basic directory into an intelligent wedding planning assistant that learns, adapts, and provides increasingly personalized value to both couples and suppliers. The system's ML-powered matching capabilities and real-time learning ensure continuous improvement and superior user experiences that drive engagement, bookings, and platform success.