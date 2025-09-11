# WS-251 Photography AI Intelligence - Team B (Backend) Development Prompt

## 🎯 EXECUTIVE SUMMARY
Build a sophisticated backend infrastructure for AI-powered photography planning that integrates OpenAI Vision API, astronomical calculations, and venue intelligence. This system processes wedding details, generates comprehensive shot lists using AI expertise, analyzes venue photos for optimal shooting locations, and calculates precise timing recommendations based on lighting conditions.

## 📋 TECHNICAL REQUIREMENTS

### Core API Endpoints

#### 1. Shot List Generation API
```typescript
// POST /api/photography/ai/shot-list
export async function POST(request: Request) {
  try {
    const {
      weddingId,
      venueDetails,
      weddingStyle,
      guestCount,
      ceremonyTime,
      specialRequests,
      photographerPreferences
    } = await request.json();

    // Validate user permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize photography AI service
    const photographyAI = new PhotographyAIService();
    
    // Generate comprehensive shot list with AI
    const shotList = await photographyAI.generateComprehensiveShotList({
      id: weddingId,
      venue: venueDetails,
      style: weddingStyle,
      guestCount,
      ceremonyTime,
      specialRequests,
      photographerStyle: photographerPreferences.style
    });

    // Get venue analysis if available
    const venueAnalysis = await photographyAI.getVenueInsights(venueDetails.name);

    // Calculate optimal timing
    const timing = await photographyAI.calculatePhotoTiming(
      new Date(ceremonyTime),
      venueDetails.coordinates
    );

    return NextResponse.json({
      success: true,
      shotList,
      venueInsights: venueAnalysis,
      timing,
      aiConfidence: shotList.metadata.aiConfidence
    });

  } catch (error) {
    console.error('Shot list generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate shot list' }, 
      { status: 500 }
    );
  }
}

// GET /api/photography/ai/shot-list/[shotListId]
export async function GET(
  request: Request,
  { params }: { params: { shotListId: string } }
) {
  try {
    const shotListId = params.shotListId;

    const { data: shotList, error } = await supabase
      .from('ai_generated_shot_lists')
      .select(`
        *,
        weddings (
          id,
          couple_names,
          wedding_date,
          venue_name
        )
      `)
      .eq('id', shotListId)
      .single();

    if (error || !shotList) {
      return NextResponse.json({ error: 'Shot list not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      shotList: {
        id: shotList.id,
        weddingId: shotList.wedding_id,
        categories: shotList.generated_shots.categories,
        metadata: shotList.generated_shots.metadata,
        customizations: shotList.customizations,
        timeline: shotList.timeline_suggestions,
        createdAt: shotList.generated_at,
        lastModified: shotList.last_modified,
        approved: shotList.approved_by_photographer
      }
    });

  } catch (error) {
    console.error('Error fetching shot list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shot list' }, 
      { status: 500 }
    );
  }
}

// PUT /api/photography/ai/shot-list/[shotListId]
export async function PUT(
  request: Request,
  { params }: { params: { shotListId: string } }
) {
  try {
    const shotListId = params.shotListId;
    const { customizations, timelineAdjustments, photographerNotes } = await request.json();

    const { data, error } = await supabase
      .from('ai_generated_shot_lists')
      .update({
        customizations,
        timeline_suggestions: timelineAdjustments,
        photographer_notes: photographerNotes,
        last_modified: new Date().toISOString(),
        approved_by_photographer: true
      })
      .eq('id', shotListId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update shot list' }, { status: 500 });
    }

    return NextResponse.json({ success: true, shotList: data });

  } catch (error) {
    console.error('Error updating shot list:', error);
    return NextResponse.json(
      { error: 'Failed to update shot list' }, 
      { status: 500 }
    );
  }
}
```

#### 2. Venue Analysis API
```typescript
// POST /api/photography/ai/venue-analysis
export async function POST(request: Request) {
  try {
    const { venueId, photoUrls, analyzeFeatures = true } = await request.json();

    // Validate input
    if (!venueId || !photoUrls || photoUrls.length === 0) {
      return NextResponse.json(
        { error: 'Venue ID and photo URLs required' }, 
        { status: 400 }
      );
    }

    // Check if analysis already exists (within 30 days)
    const { data: existingAnalysis } = await supabase
      .from('photo_venue_data')
      .select('*')
      .eq('venue_id', venueId)
      .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (existingAnalysis) {
      return NextResponse.json({
        success: true,
        analysis: {
          photoSpots: existingAnalysis.best_photo_spots,
          lightingAnalysis: existingAnalysis.lighting_analysis,
          weatherBackups: existingAnalysis.indoor_backup_spots,
          uniqueFeatures: existingAnalysis.seasonal_notes,
          photographerTips: existingAnalysis.photographer_tips
        },
        cached: true
      });
    }

    // Initialize venue analysis service
    const venueAnalyzer = new VenueAnalysisService();
    
    // Analyze venue photos with AI Vision
    const analysis = await venueAnalyzer.analyzeVenuePhotos(venueId, photoUrls);

    return NextResponse.json({
      success: true,
      analysis,
      cached: false
    });

  } catch (error) {
    console.error('Venue analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to analyze venue' }, 
      { status: 500 }
    );
  }
}

// GET /api/photography/ai/venue-analysis/[venueId]
export async function GET(
  request: Request,
  { params }: { params: { venueId: string } }
) {
  try {
    const venueId = params.venueId;

    const { data: venueData, error } = await supabase
      .from('photo_venue_data')
      .select(`
        *,
        venue_photo_analysis (
          photo_url,
          analysis_results,
          lighting_quality_score,
          photo_spot_potential,
          analyzed_at
        )
      `)
      .eq('venue_id', venueId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !venueData) {
      return NextResponse.json({ error: 'Venue analysis not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        photoSpots: venueData.best_photo_spots.map(spot => ({
          name: spot.name,
          description: spot.description,
          bestTiming: spot.bestTiming,
          lightingConditions: spot.lightingConditions,
          suitableFor: spot.suitableFor,
          score: spot.score
        })),
        lightingAnalysis: venueData.lighting_analysis,
        weatherBackups: venueData.indoor_backup_spots,
        uniqueFeatures: venueData.seasonal_notes,
        photographerTips: venueData.photographer_tips,
        photoAnalysisResults: venueData.venue_photo_analysis
      },
      lastAnalyzed: venueData.updated_at
    });

  } catch (error) {
    console.error('Error fetching venue analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue analysis' }, 
      { status: 500 }
    );
  }
}
```

#### 3. Photo Timing Calculation API
```typescript
// GET /api/photography/ai/timing/[weddingId]
export async function GET(
  request: Request,
  { params }: { params: { weddingId: string } }
) {
  try {
    const weddingId = params.weddingId;

    // Get wedding details
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select(`
        wedding_date,
        ceremony_time,
        venues (
          name,
          address,
          coordinates
        )
      `)
      .eq('id', weddingId)
      .single();

    if (weddingError || !wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    // Parse coordinates
    const coordinates = {
      lat: wedding.venues.coordinates.coordinates[1], // PostGIS format
      lng: wedding.venues.coordinates.coordinates[0]
    };

    // Initialize timing calculator
    const calculator = new LightingCalculatorService();
    
    // Calculate optimal timing
    const timing = await calculator.calculateOptimalTiming(
      new Date(wedding.wedding_date),
      coordinates
    );

    // Generate optimal schedule recommendations
    const schedule = await calculator.generateOptimalSchedule(
      new Date(wedding.ceremony_time),
      timing,
      wedding.venues.name
    );

    // Get weather considerations
    const weatherService = new WeatherService();
    const weatherConsiderations = await weatherService.getPhotographyWeather(
      coordinates,
      new Date(wedding.wedding_date)
    );

    return NextResponse.json({
      success: true,
      timing: {
        date: wedding.wedding_date,
        sunrise: timing.sunrise,
        sunset: timing.sunset,
        goldenHour: {
          morning: timing.goldenHour.morning,
          evening: timing.goldenHour.evening
        },
        blueHour: timing.blueHour,
        optimalSchedule: schedule,
        weatherConsiderations: weatherConsiderations.tips
      }
    });

  } catch (error) {
    console.error('Error calculating photo timing:', error);
    return NextResponse.json(
      { error: 'Failed to calculate timing' }, 
      { status: 500 }
    );
  }
}

// POST /api/photography/ai/timing/calculate
export async function POST(request: Request) {
  try {
    const { date, coordinates, ceremonyTime } = await request.json();

    // Validate input
    if (!date || !coordinates || !coordinates.lat || !coordinates.lng) {
      return NextResponse.json(
        { error: 'Date and coordinates required' }, 
        { status: 400 }
      );
    }

    const calculator = new LightingCalculatorService();
    
    // Calculate timing for specific date and location
    const timing = await calculator.calculateOptimalTiming(new Date(date), coordinates);

    return NextResponse.json({
      success: true,
      timing: {
        date,
        sunrise: timing.sunrise,
        sunset: timing.sunset,
        goldenHour: timing.goldenHour,
        blueHour: timing.blueHour,
        solarNoon: timing.solarNoon,
        dayLength: timing.dayLength
      }
    });

  } catch (error) {
    console.error('Error calculating timing:', error);
    return NextResponse.json(
      { error: 'Failed to calculate timing' }, 
      { status: 500 }
    );
  }
}
```

### Core Service Classes

#### Photography AI Service
```typescript
// /wedsync/src/lib/photography/shot-list-ai.ts
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase';

interface WeddingDetails {
  id: string;
  venue: {
    name: string;
    type: string;
    coordinates: { lat: number; lng: number };
    description?: string;
  };
  style: string;
  guestCount: number;
  ceremonyTime: string;
  seasonalNotes?: string;
  specialRequests: string[];
  photographerStyle: string[];
}

export class PhotographyAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateComprehensiveShotList(weddingDetails: WeddingDetails): Promise<any> {
    try {
      // Get venue analysis if available
      const venueAnalysis = await this.getVenueAnalysis(weddingDetails.venue.name);
      
      // Calculate optimal timing
      const calculator = new LightingCalculatorService();
      const photoTiming = await calculator.calculateOptimalTiming(
        new Date(weddingDetails.ceremonyTime), 
        weddingDetails.venue.coordinates
      );

      // Build comprehensive AI prompt
      const prompt = this.buildShotListPrompt(weddingDetails, venueAnalysis, photoTiming);

      // Generate shot list using OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert wedding photographer with 15 years of experience specializing in ${weddingDetails.venue.type} venues. Generate comprehensive shot lists that ensure no important moments are missed while being practical and achievable. Focus on the specific venue characteristics, wedding style, and optimal timing.

Your expertise includes:
- Understanding of lighting conditions and optimal timing
- Venue-specific photography challenges and opportunities  
- Wedding timeline optimization for efficient coverage
- Equipment recommendations for different scenarios
- Weather backup planning and contingencies
- Cultural and stylistic considerations

Respond with a structured JSON format including categories, individual shots with priority levels, timing recommendations, and practical notes.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) throw new Error('Failed to generate shot list');

      // Parse and structure the AI response
      const rawShotList = JSON.parse(aiResponse);
      const structuredShotList = await this.structureShotListResponse(rawShotList, weddingDetails);

      // Calculate AI confidence score based on response quality
      const aiConfidence = this.calculateConfidenceScore(structuredShotList, weddingDetails);

      // Store in database for future reference
      await this.storeShotList(weddingDetails.id, structuredShotList, aiConfidence);

      return {
        ...structuredShotList,
        metadata: {
          ...structuredShotList.metadata,
          aiConfidence
        }
      };

    } catch (error) {
      console.error('Error generating shot list:', error);
      throw new Error('Failed to generate AI shot list');
    }
  }

  private buildShotListPrompt(
    wedding: WeddingDetails, 
    venueAnalysis: any, 
    timing: any
  ): string {
    const season = this.detectSeason(new Date(wedding.ceremonyTime));
    
    return `Generate a comprehensive wedding shot list for this ${wedding.style} wedding:

WEDDING DETAILS:
- Venue: ${wedding.venue.name} (${wedding.venue.type})
- Wedding Style: ${wedding.style}
- Guest Count: ${wedding.guestCount}
- Ceremony Time: ${wedding.ceremonyTime}
- Season: ${season}
- Special Requests: ${wedding.specialRequests.join(', ')}
- Photographer Style: ${wedding.photographerStyle.join(', ')}

VENUE INSIGHTS:
${venueAnalysis?.bestPhotoSpots ? `Best Photo Spots: ${venueAnalysis.bestPhotoSpots.map(s => s.name).join(', ')}` : 'No previous analysis available'}
${venueAnalysis?.photographerTips ? `Previous Tips: ${venueAnalysis.photographerTips.join(', ')}` : ''}
${venueAnalysis?.challenges ? `Known Challenges: ${venueAnalysis.challenges.join(', ')}` : ''}

OPTIMAL TIMING:
- Sunrise: ${timing?.sunrise || 'Unknown'}
- Sunset: ${timing?.sunset || 'Unknown'}
- Golden Hour (Evening): ${timing?.goldenHour?.evening?.start} - ${timing?.goldenHour?.evening?.end}
- Blue Hour: ${timing?.blueHour?.start} - ${timing?.blueHour?.end}

REQUIREMENTS:
Generate a JSON response with this structure:
{
  "categories": [
    {
      "name": "Category Name",
      "estimatedTime": "30-45 minutes",
      "optimalTiming": "timing recommendation",
      "shots": [
        {
          "id": "unique-id",
          "description": "specific shot description",
          "priority": "must-have" | "important" | "nice-to-have",
          "estimatedTime": 3,
          "equipment": ["recommended equipment"],
          "notes": "practical notes",
          "venueSpecific": true/false
        }
      ]
    }
  ],
  "timelineRecommendations": {
    "gettingReady": "time suggestion",
    "firstLook": "time suggestion",
    "familyFormals": "time suggestion",
    "couplePortraits": "time suggestion",
    "ceremony": "during ceremony",
    "cocktailHour": "candid coverage",
    "reception": "key moments"
  },
  "weatherBackupPlan": ["backup options"],
  "equipmentRecommendations": ["essential equipment for this venue"]
}

CATEGORIES TO INCLUDE:
1. GETTING READY (bride and groom preparation)
2. FIRST LOOK (if requested)
3. FAMILY FORMALS (organized group photos)  
4. COUPLE PORTRAITS (intimate photos)
5. CEREMONY MOMENTS (key ceremony events)
6. COCKTAIL HOUR (candid reception coverage)
7. RECEPTION HIGHLIGHTS (first dance, cake cutting, etc.)
8. DETAIL SHOTS (rings, flowers, decor)

For each shot:
- Be specific to the ${wedding.venue.type} venue type
- Consider the ${wedding.style} wedding style
- Account for ${wedding.guestCount} guests in group shot planning
- Optimize for available lighting conditions
- Include venue-specific opportunities
- Provide practical timing and equipment guidance
- Consider ${season} seasonal factors

Focus on creating a comprehensive yet achievable shot list that demonstrates professional photography expertise while being practical for the actual wedding day.`;
  }

  private async structureShotListResponse(rawShotList: any, wedding: WeddingDetails): Promise<any> {
    const structuredShots = {
      id: `shotlist-${wedding.id}`,
      weddingId: wedding.id,
      categories: rawShotList.categories || [],
      timeline: rawShotList.timelineRecommendations || {},
      weatherBackup: rawShotList.weatherBackupPlan || [],
      equipmentRecommendations: rawShotList.equipmentRecommendations || [],
      metadata: {
        generatedAt: new Date().toISOString(),
        venue: wedding.venue.name,
        venueType: wedding.venue.type,
        style: wedding.style,
        guestCount: wedding.guestCount,
        totalShots: 0,
        totalEstimatedTime: 0,
        season: this.detectSeason(new Date(wedding.ceremonyTime))
      }
    };

    // Calculate totals
    let totalShots = 0;
    let totalTime = 0;

    structuredShots.categories.forEach(category => {
      totalShots += category.shots?.length || 0;
      category.shots?.forEach(shot => {
        totalTime += shot.estimatedTime || 1;
      });
    });

    structuredShots.metadata.totalShots = totalShots;
    structuredShots.metadata.totalEstimatedTime = totalTime;

    return structuredShots;
  }

  private calculateConfidenceScore(shotList: any, wedding: WeddingDetails): number {
    let score = 0.5; // Base score

    // Check for venue-specific content
    const venueSpecificShots = shotList.categories.reduce((count, cat) => {
      return count + (cat.shots?.filter(shot => shot.venueSpecific).length || 0);
    }, 0);
    
    if (venueSpecificShots > 0) score += 0.1;

    // Check for comprehensive categories
    const expectedCategories = ['getting ready', 'family formals', 'couple portraits', 'ceremony'];
    const foundCategories = shotList.categories.filter(cat => 
      expectedCategories.some(expected => 
        cat.name.toLowerCase().includes(expected)
      )
    ).length;
    
    score += (foundCategories / expectedCategories.length) * 0.2;

    // Check for timing optimization
    if (shotList.timeline && Object.keys(shotList.timeline).length > 4) {
      score += 0.1;
    }

    // Check for practical details
    const shotsWithEquipment = shotList.categories.reduce((count, cat) => {
      return count + (cat.shots?.filter(shot => shot.equipment?.length > 0).length || 0);
    }, 0);
    
    if (shotsWithEquipment > 5) score += 0.1;

    return Math.min(score, 1.0);
  }

  private detectSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';  
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private async storeShotList(weddingId: string, shotList: any, confidence: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_generated_shot_lists')
        .upsert({
          wedding_id: weddingId,
          photographer_id: await this.getCurrentPhotographerId(),
          generated_shots: shotList,
          timeline_suggestions: shotList.timeline,
          weather_backup_plan: {
            options: shotList.weatherBackup,
            equipment: shotList.equipmentRecommendations
          },
          ai_confidence_score: confidence,
          generation_prompt: 'AI Generated Shot List',
          generated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing shot list:', error);
    }
  }

  private async getCurrentPhotographerId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || '';
  }

  async getVenueAnalysis(venueName: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('photo_venue_data')
        .select('*')
        .ilike('venue_name', `%${venueName}%`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      return data ? {
        bestPhotoSpots: data.best_photo_spots || [],
        photographerTips: data.photographer_tips || [],
        challenges: data.lighting_analysis?.challenges || [],
        opportunities: data.lighting_analysis?.opportunities || []
      } : null;
    } catch (error) {
      console.error('Error fetching venue analysis:', error);
      return null;
    }
  }

  async getVenueInsights(venueName: string): Promise<any> {
    const analysis = await this.getVenueAnalysis(venueName);
    
    if (!analysis) {
      return {
        bestPhotoSpots: [],
        lightingTips: ['Consider golden hour timing for outdoor shots'],
        weatherBackupPlan: ['Scout indoor backup locations']
      };
    }

    return {
      bestPhotoSpots: analysis.bestPhotoSpots.map(spot => spot.name || spot),
      lightingTips: analysis.photographerTips.filter(tip => 
        tip.toLowerCase().includes('light') || tip.toLowerCase().includes('timing')
      ),
      weatherBackupPlan: analysis.challenges.filter(challenge =>
        challenge.toLowerCase().includes('weather') || challenge.toLowerCase().includes('indoor')
      )
    };
  }

  async calculatePhotoTiming(ceremonyDate: Date, coordinates: { lat: number; lng: number }): Promise<any> {
    try {
      const calculator = new LightingCalculatorService();
      return await calculator.calculateOptimalTiming(ceremonyDate, coordinates);
    } catch (error) {
      console.error('Error calculating photo timing:', error);
      return null;
    }
  }
}
```

#### Venue Analysis Service  
```typescript
// /wedsync/src/lib/photography/venue-intelligence.ts
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase';

export class VenueAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeVenuePhotos(venueId: string, photoUrls: string[]): Promise<any> {
    try {
      const analysisResults = [];

      // Analyze each photo individually (with rate limiting)
      for (const photoUrl of photoUrls) {
        const analysis = await this.analyzeIndividualPhoto(photoUrl);
        analysisResults.push(analysis);
        
        // Rate limiting: 500ms between requests
        await this.delay(500);
      }

      // Aggregate all analysis results
      const venueAnalysis = this.aggregatePhotoAnalysis(analysisResults);
      
      // Store aggregated results in database
      await this.storeVenueAnalysis(venueId, venueAnalysis, photoUrls);

      return venueAnalysis;

    } catch (error) {
      console.error('Venue analysis failed:', error);
      throw new Error('Failed to analyze venue photos');
    }
  }

  private async analyzeIndividualPhoto(photoUrl: string): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system", 
            content: `You are an expert wedding photographer analyzing venue photos. Your task is to identify photography opportunities, lighting conditions, architectural features, and practical considerations. Focus on actionable insights that will help photographers plan better shots and avoid common pitfalls.

Analyze the image and provide specific, practical recommendations including:
1. Best photo locations and what they're suited for
2. Lighting challenges and optimal timing
3. Architectural or natural features to highlight  
4. Equipment recommendations for this space
5. Potential obstacles or logistics to consider
6. Weather backup considerations if outdoor

Be specific and practical in your recommendations.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this wedding venue photo for photography planning. Provide a JSON response with this structure:

{
  "photoSpots": [
    {
      "name": "spot name",
      "description": "what makes it good for photos",
      "bestTiming": ["golden hour", "blue hour", "midday", etc.],
      "suitableFor": ["ceremony", "portraits", "family photos", "detail shots"],
      "lightingConditions": "description of lighting",
      "score": 0.8
    }
  ],
  "lightingAnalysis": {
    "naturalLightAvailability": "description",
    "challenges": ["list of lighting challenges"],
    "recommendations": ["specific lighting tips"]
  },
  "architecturalFeatures": ["notable features for photography"],
  "equipmentRecommendations": ["specific equipment for this venue"],
  "practicalConsiderations": ["logistics, accessibility, restrictions"],
  "weatherBackups": ["indoor alternatives if outdoor venue"]
}

Focus on providing specific, actionable insights that a professional photographer would find valuable.`
              },
              {
                type: "image_url",
                image_url: {
                  url: photoUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const analysisText = response.choices[0]?.message?.content;
      
      if (!analysisText) {
        throw new Error('No analysis received from AI');
      }

      const analysisData = JSON.parse(analysisText);

      return {
        photoUrl,
        analysis: analysisData,
        analyzedAt: new Date().toISOString(),
        success: true
      };

    } catch (error) {
      console.error(`Error analyzing photo ${photoUrl}:`, error);
      return {
        photoUrl,
        analysis: { 
          error: 'Analysis failed',
          photoSpots: [],
          lightingAnalysis: { challenges: ['Analysis unavailable'] },
          architecturalFeatures: [],
          equipmentRecommendations: [],
          practicalConsiderations: ['Manual analysis required']
        },
        analyzedAt: new Date().toISOString(),
        success: false
      };
    }
  }

  private aggregatePhotoAnalysis(results: any[]): any {
    const aggregated = {
      photoSpots: [],
      lightingAnalysis: {
        naturalLightAvailability: 'varied',
        challenges: [],
        recommendations: []
      },
      architecturalFeatures: [],
      practicalConsiderations: [],
      equipmentRecommendations: new Set<string>(),
      weatherBackups: [],
      uniqueFeatures: [],
      analysisQuality: 0
    };

    let successfulAnalyses = 0;

    // Process each analysis result
    for (const result of results) {
      if (!result.success || result.analysis.error) continue;

      successfulAnalyses++;
      const analysis = result.analysis;

      // Aggregate photo spots with deduplication
      if (analysis.photoSpots) {
        for (const spot of analysis.photoSpots) {
          const existing = aggregated.photoSpots.find(s => 
            s.name.toLowerCase().includes(spot.name.toLowerCase()) ||
            spot.name.toLowerCase().includes(s.name.toLowerCase())
          );
          
          if (!existing) {
            aggregated.photoSpots.push(spot);
          } else {
            // Merge timing and suitability info
            existing.bestTiming = [...new Set([...existing.bestTiming, ...spot.bestTiming])];
            existing.suitableFor = [...new Set([...existing.suitableFor, ...spot.suitableFor])];
            existing.score = Math.max(existing.score, spot.score);
          }
        }
      }

      // Aggregate lighting information
      if (analysis.lightingAnalysis) {
        if (analysis.lightingAnalysis.challenges) {
          aggregated.lightingAnalysis.challenges.push(...analysis.lightingAnalysis.challenges);
        }
        if (analysis.lightingAnalysis.recommendations) {
          aggregated.lightingAnalysis.recommendations.push(...analysis.lightingAnalysis.recommendations);
        }
      }

      // Aggregate features and recommendations
      if (analysis.architecturalFeatures) {
        aggregated.architecturalFeatures.push(...analysis.architecturalFeatures);
      }
      
      if (analysis.practicalConsiderations) {
        aggregated.practicalConsiderations.push(...analysis.practicalConsiderations);
      }

      if (analysis.equipmentRecommendations) {
        analysis.equipmentRecommendations.forEach(item => 
          aggregated.equipmentRecommendations.add(item)
        );
      }

      if (analysis.weatherBackups) {
        aggregated.weatherBackups.push(...analysis.weatherBackups);
      }
    }

    // Calculate analysis quality score
    aggregated.analysisQuality = Math.min(successfulAnalyses / results.length, 1.0);

    // Remove duplicates and clean up arrays
    return {
      photoSpots: aggregated.photoSpots.sort((a, b) => (b.score || 0) - (a.score || 0)),
      lightingAnalysis: {
        ...aggregated.lightingAnalysis,
        challenges: this.removeDuplicates(aggregated.lightingAnalysis.challenges),
        recommendations: this.removeDuplicates(aggregated.lightingAnalysis.recommendations)
      },
      architecturalFeatures: this.removeDuplicates(aggregated.architecturalFeatures),
      practicalConsiderations: this.removeDuplicates(aggregated.practicalConsiderations),
      equipmentRecommendations: Array.from(aggregated.equipmentRecommendations),
      weatherBackups: this.removeDuplicates(aggregated.weatherBackups),
      photographerTips: this.generatePhotographerTips(aggregated),
      analysisQuality: aggregated.analysisQuality
    };
  }

  private generatePhotographerTips(aggregated: any): string[] {
    const tips = [];

    // Generate tips based on photo spots
    if (aggregated.photoSpots.length > 3) {
      tips.push(`This venue offers ${aggregated.photoSpots.length} distinct photo opportunities - plan for variety`);
    }

    // Generate tips based on lighting challenges
    if (aggregated.lightingAnalysis.challenges.some(c => c.toLowerCase().includes('low'))) {
      tips.push('Consider bringing additional lighting equipment for indoor areas');
    }

    // Generate tips based on architectural features
    if (aggregated.architecturalFeatures.length > 2) {
      tips.push('Take advantage of the architectural details for unique framing opportunities');
    }

    return tips;
  }

  private removeDuplicates(array: string[]): string[] {
    const seen = new Set<string>();
    return array.filter(item => {
      const key = item.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async storeVenueAnalysis(venueId: string, analysis: any, photoUrls: string[]): Promise<void> {
    try {
      // Store main venue analysis
      const { error: venueError } = await supabase
        .from('photo_venue_data')
        .upsert({
          venue_id: venueId,
          best_photo_spots: analysis.photoSpots || [],
          lighting_analysis: analysis.lightingAnalysis || {},
          photographer_tips: analysis.photographerTips || [],
          weather_considerations: { backups: analysis.weatherBackups || [] },
          indoor_backup_spots: analysis.weatherBackups || [],
          analyzed_by_ai: true,
          photo_samples: photoUrls,
          updated_at: new Date().toISOString()
        });

      if (venueError) {
        console.error('Error storing venue analysis:', venueError);
      }

      // Store individual photo analysis results
      for (let i = 0; i < photoUrls.length; i++) {
        const photoUrl = photoUrls[i];
        const photoAnalysis = analysis.photoSpots[i] || {};
        
        const { error: photoError } = await supabase
          .from('venue_photo_analysis')
          .insert({
            venue_id: venueId,
            photo_url: photoUrl,
            analysis_results: photoAnalysis,
            lighting_quality_score: photoAnalysis.score || 0.5,
            photo_spot_potential: photoAnalysis.score || 0.5,
            analyzed_at: new Date().toISOString(),
            ai_model_version: 'gpt-4-vision-preview'
          });

        if (photoError) {
          console.error(`Error storing photo analysis for ${photoUrl}:`, photoError);
        }
      }

    } catch (error) {
      console.error('Error storing venue analysis:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Lighting Calculator Service
```typescript
// /wedsync/src/lib/photography/lighting-calculator.ts
import { supabase } from '@/lib/supabase';

interface Coordinates {
  lat: number;
  lng: number;
}

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  civilTwilightBegin: Date;
  civilTwilightEnd: Date;
  nauticalTwilightBegin: Date;
  nauticalTwilightEnd: Date;
  astronomicalTwilightBegin: Date;
  astronomicalTwilightEnd: Date;
  dayLength: number; // in minutes
}

interface PhotoTiming {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  goldenHour: {
    morning: { start: Date; end: Date };
    evening: { start: Date; end: Date };
  };
  blueHour: {
    start: Date;
    end: Date;
  };
  dayLength: number;
}

export class LightingCalculatorService {
  async calculateOptimalTiming(date: Date, coordinates: Coordinates): Promise<PhotoTiming> {
    try {
      // Check cache first
      const cached = await this.getCachedTiming(date, coordinates);
      if (cached && this.isCacheValid(cached.calculated_at)) {
        return this.formatCachedTiming(cached);
      }

      // Calculate new timing data
      const sunTimes = await this.getSunTimes(coordinates, date);
      const timing = this.calculatePhotoTiming(sunTimes);

      // Cache the results
      await this.cachePhotoTiming(date, coordinates, timing, sunTimes);

      return timing;

    } catch (error) {
      console.error('Error calculating photo timing:', error);
      throw new Error('Failed to calculate optimal timing');
    }
  }

  private async getSunTimes(coordinates: Coordinates, date: Date): Promise<SunTimes> {
    try {
      const dateString = date.toISOString().split('T')[0];
      
      const response = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${coordinates.lat}&lng=${coordinates.lng}&date=${dateString}&formatted=0`
      );
      
      if (!response.ok) {
        throw new Error(`Sunrise API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Sunrise API returned status: ${data.status}`);
      }

      const results = data.results;

      return {
        sunrise: new Date(results.sunrise),
        sunset: new Date(results.sunset),
        solarNoon: new Date(results.solar_noon),
        civilTwilightBegin: new Date(results.civil_twilight_begin),
        civilTwilightEnd: new Date(results.civil_twilight_end),
        nauticalTwilightBegin: new Date(results.nautical_twilight_begin),
        nauticalTwilightEnd: new Date(results.nautical_twilight_end),
        astronomicalTwilightBegin: new Date(results.astronomical_twilight_begin),
        astronomicalTwilightEnd: new Date(results.astronomical_twilight_end),
        dayLength: results.day_length / 60 // Convert seconds to minutes
      };

    } catch (error) {
      console.error('Error fetching sun times:', error);
      throw new Error('Failed to fetch sun timing data');
    }
  }

  private calculatePhotoTiming(sunTimes: SunTimes): PhotoTiming {
    // Golden Hour calculations (typically 1 hour after sunrise, 1 hour before sunset)
    const goldenHourDuration = 60 * 60 * 1000; // 1 hour in milliseconds
    
    const morningGoldenStart = new Date(sunTimes.sunrise.getTime() + 15 * 60 * 1000); // 15 min after sunrise
    const morningGoldenEnd = new Date(sunTimes.sunrise.getTime() + goldenHourDuration);
    
    const eveningGoldenStart = new Date(sunTimes.sunset.getTime() - goldenHourDuration);
    const eveningGoldenEnd = new Date(sunTimes.sunset.getTime() - 15 * 60 * 1000); // 15 min before sunset

    // Blue Hour calculations (20-40 minutes after sunset/before sunrise)
    const blueHourStart = new Date(sunTimes.sunset.getTime() + 10 * 60 * 1000); // 10 min after sunset
    const blueHourEnd = new Date(sunTimes.civilTwilightEnd);

    return {
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
      solarNoon: sunTimes.solarNoon,
      goldenHour: {
        morning: {
          start: morningGoldenStart,
          end: morningGoldenEnd
        },
        evening: {
          start: eveningGoldenStart,
          end: eveningGoldenEnd
        }
      },
      blueHour: {
        start: blueHourStart,
        end: blueHourEnd
      },
      dayLength: sunTimes.dayLength
    };
  }

  async generateOptimalSchedule(
    ceremonyTime: Date, 
    timing: PhotoTiming, 
    venueName?: string
  ): Promise<any> {
    const schedule = {
      gettingReady: this.calculateGettingReadyTime(ceremonyTime),
      firstLook: this.calculateFirstLookTime(ceremonyTime, timing),
      familyFormals: this.calculateFamilyTime(ceremonyTime),
      couplePortraits: this.calculateCouplePortraitTime(ceremonyTime, timing),
      ceremony: ceremonyTime.toISOString(),
      cocktailHour: this.calculateCocktailTime(ceremonyTime),
      reception: this.calculateReceptionTime(ceremonyTime)
    };

    return schedule;
  }

  private calculateGettingReadyTime(ceremonyTime: Date): string {
    // Usually 2-3 hours before ceremony
    const gettingReadyTime = new Date(ceremonyTime.getTime() - 3 * 60 * 60 * 1000);
    return gettingReadyTime.toISOString();
  }

  private calculateFirstLookTime(ceremonyTime: Date, timing: PhotoTiming): string {
    // Ideally during golden hour, or 1 hour before ceremony
    const goldenHourStart = timing.goldenHour.evening.start;
    const oneHourBefore = new Date(ceremonyTime.getTime() - 60 * 60 * 1000);
    
    // Choose the better option
    if (goldenHourStart < ceremonyTime && goldenHourStart > oneHourBefore) {
      return goldenHourStart.toISOString();
    }
    
    return oneHourBefore.toISOString();
  }

  private calculateFamilyTime(ceremonyTime: Date): string {
    // Right after ceremony, 15-30 minutes
    const familyTime = new Date(ceremonyTime.getTime() + 30 * 60 * 1000);
    return familyTime.toISOString();
  }

  private calculateCouplePortraitTime(ceremonyTime: Date, timing: PhotoTiming): string {
    // During golden hour if possible
    const goldenHourStart = timing.goldenHour.evening.start;
    const cocktailTime = new Date(ceremonyTime.getTime() + 60 * 60 * 1000);
    
    if (goldenHourStart > ceremonyTime && goldenHourStart < cocktailTime) {
      return goldenHourStart.toISOString();
    }
    
    return cocktailTime.toISOString();
  }

  private calculateCocktailTime(ceremonyTime: Date): string {
    const cocktailTime = new Date(ceremonyTime.getTime() + 90 * 60 * 1000); // 1.5 hours after
    return cocktailTime.toISOString();
  }

  private calculateReceptionTime(ceremonyTime: Date): string {
    const receptionTime = new Date(ceremonyTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after
    return receptionTime.toISOString();
  }

  private async getCachedTiming(date: Date, coordinates: Coordinates): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('photography_timing_cache')
        .select('*')
        .eq('wedding_date', date.toISOString().split('T')[0])
        .eq('venue_coordinates', `POINT(${coordinates.lng} ${coordinates.lat})`)
        .single();

      if (error || !data) return null;
      
      return data;
    } catch (error) {
      console.error('Error fetching cached timing:', error);
      return null;
    }
  }

  private isCacheValid(calculatedAt: string): boolean {
    const cacheAge = Date.now() - new Date(calculatedAt).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    return cacheAge < maxAge;
  }

  private formatCachedTiming(cached: any): PhotoTiming {
    return {
      sunrise: new Date(cached.sunrise_time),
      sunset: new Date(cached.sunset_time),
      solarNoon: new Date(cached.sunrise_time), // Approximate
      goldenHour: {
        morning: {
          start: new Date(cached.golden_hour_morning_start),
          end: new Date(cached.golden_hour_morning_end)
        },
        evening: {
          start: new Date(cached.golden_hour_evening_start),
          end: new Date(cached.golden_hour_evening_end)
        }
      },
      blueHour: {
        start: new Date(cached.blue_hour_start),
        end: new Date(cached.blue_hour_end)
      },
      dayLength: 0 // Calculate if needed
    };
  }

  private async cachePhotoTiming(
    date: Date, 
    coordinates: Coordinates, 
    timing: PhotoTiming,
    sunTimes: SunTimes
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('photography_timing_cache')
        .upsert({
          wedding_date: date.toISOString().split('T')[0],
          venue_coordinates: `POINT(${coordinates.lng} ${coordinates.lat})`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          sunrise_time: timing.sunrise.toISOString(),
          sunset_time: timing.sunset.toISOString(),
          golden_hour_morning_start: timing.goldenHour.morning.start.toISOString(),
          golden_hour_morning_end: timing.goldenHour.morning.end.toISOString(),
          golden_hour_evening_start: timing.goldenHour.evening.start.toISOString(),
          golden_hour_evening_end: timing.goldenHour.evening.end.toISOString(),
          blue_hour_start: timing.blueHour.start.toISOString(),
          blue_hour_end: timing.blueHour.end.toISOString(),
          calculated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error caching timing data:', error);
      }
    } catch (error) {
      console.error('Error caching photo timing:', error);
    }
  }
}

// Weather service for photography considerations
export class WeatherService {
  async getPhotographyWeather(coordinates: Coordinates, date: Date): Promise<any> {
    // This would integrate with a weather API like OpenWeatherMap
    // For now, return basic considerations
    return {
      tips: [
        'Check weather forecast 48 hours before the wedding',
        'Have indoor backup locations identified',
        'Bring weather protection for equipment',
        'Consider golden hour timing adjustments for cloudy days'
      ]
    };
  }
}
```

## 🧪 TESTING STRATEGY

### Unit Tests
```typescript
// Tests for AI services
describe('PhotographyAIService', () => {
  it('should generate structured shot list from wedding details', async () => {
    const ai = new PhotographyAIService();
    const mockWedding = {
      id: 'test-wedding',
      venue: { name: 'Garden Venue', type: 'outdoor', coordinates: { lat: 40.7128, lng: -74.0060 } },
      style: 'rustic',
      guestCount: 100,
      ceremonyTime: '2024-06-15T16:00:00Z',
      specialRequests: [],
      photographerStyle: ['candid', 'natural']
    };

    const shotList = await ai.generateComprehensiveShotList(mockWedding);

    expect(shotList.categories).toBeDefined();
    expect(shotList.categories.length).toBeGreaterThan(5);
    expect(shotList.metadata.venue).toBe('Garden Venue');
    expect(shotList.metadata.aiConfidence).toBeGreaterThan(0);
  });

  it('should calculate confidence score correctly', () => {
    const ai = new PhotographyAIService();
    const mockShotList = {
      categories: [
        { name: 'Getting Ready', shots: [{ venueSpecific: true, equipment: ['85mm lens'] }] },
        { name: 'Family Formals', shots: [{ venueSpecific: false, equipment: [] }] }
      ],
      timeline: { gettingReady: '10:00', ceremony: '16:00' }
    };

    const confidence = ai.calculateConfidenceScore(mockShotList, {});
    expect(confidence).toBeGreaterThan(0.5);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });
});

describe('LightingCalculatorService', () => {
  it('should calculate accurate photo timing for coordinates', async () => {
    const calculator = new LightingCalculatorService();
    const timing = await calculator.calculateOptimalTiming(
      new Date('2024-06-15T16:00:00Z'),
      { lat: 40.7128, lng: -74.0060 }
    );

    expect(timing.sunrise).toBeDefined();
    expect(timing.sunset).toBeDefined();
    expect(timing.goldenHour.evening.start).toEqual(
      expect.any(Date)
    );
    expect(timing.goldenHour.evening.start.getTime()).toBeLessThan(
      timing.sunset.getTime()
    );
  });

  it('should use cached timing when available', async () => {
    const calculator = new LightingCalculatorService();
    const date = new Date('2024-06-15');
    const coordinates = { lat: 40.7128, lng: -74.0060 };

    // First call should calculate and cache
    const timing1 = await calculator.calculateOptimalTiming(date, coordinates);
    
    // Second call should use cache
    const timing2 = await calculator.calculateOptimalTiming(date, coordinates);

    expect(timing1.sunrise.getTime()).toBe(timing2.sunrise.getTime());
  });
});
```

### Integration Tests
```typescript
describe('Photography AI API Integration', () => {
  it('should generate shot list via API', async () => {
    const response = await fetch('/api/photography/ai/shot-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId: 'test-wedding',
        venueDetails: {
          name: 'Test Venue',
          type: 'outdoor',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        weddingStyle: 'modern',
        guestCount: 100,
        ceremonyTime: '2024-06-15T16:00:00Z',
        specialRequests: [],
        photographerPreferences: { style: ['candid'] }
      })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.shotList.categories).toBeDefined();
  });

  it('should handle venue analysis API', async () => {
    const response = await fetch('/api/photography/ai/venue-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venueId: 'test-venue',
        photoUrls: ['https://example.com/venue.jpg']
      })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.analysis.photoSpots).toBeDefined();
  });
});
```

This comprehensive backend implementation provides robust AI-powered photography planning capabilities with proper error handling, caching, and wedding industry optimization. The system integrates multiple AI services while maintaining high performance and reliability standards.