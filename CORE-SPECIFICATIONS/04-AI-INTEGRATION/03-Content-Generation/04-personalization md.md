# 04-personalization.md

# AI Personalization Engine Implementation

## What to Build

Intelligent content personalization system that adapts all communication based on couple details, wedding characteristics, and supplier brand voice.

## Key Technical Requirements

### Personalization Context System

```
interface PersonalizationContext {
  couple: {
    names: string[]
    pronouns?: string[]
    communication_style: 'formal' | 'casual' | 'friendly'
    response_patterns: 'quick' | 'detailed' | 'mixed'
    previous_interactions: InteractionHistory[]
  }
  wedding: {
    date: Date
    venue: {
      type: 'church' | 'barn' | 'hotel' | 'outdoor' | 'beach' | 'mansion'
      name: string
      indoor: boolean
      previous_experience?: boolean // Has supplier worked there before
    }
    style: 'traditional' | 'modern' | 'bohemian' | 'luxury' | 'rustic' | 'destination'
    size: 'intimate' | 'small' | 'medium' | 'large' // <30, 30-80, 80-150, 150+
    season: 'spring' | 'summer' | 'fall' | 'winter'
    time_of_day: 'morning' | 'afternoon' | 'evening'
    timeline_stress_level: 'relaxed' | 'moderate' | 'rushed'
  }
  supplier: {
    type: 'photographer' | 'dj' | 'caterer' | 'venue' | 'planner'
    brand_voice: 'professional' | 'warm' | 'creative' | 'luxury' | 'down_to_earth'
    experience_level: 'new' | 'experienced' | 'expert'
    specialties: string[]
  }
  relationship_context: {
    booking_recency: number // days since booking
    engagement_level: 'low' | 'medium' | 'high'
    concerns_expressed: string[]
    excitement_indicators: string[]
  }
}

class PersonalizationEngine {
  async personalizeContent(
    content: string, 
    context: PersonalizationContext,
    contentType: 'email' | 'sms' | 'article' | 'form_intro'
  ): Promise<PersonalizedContent> {
    
    const systemPrompt = this.buildPersonalizationPrompt(context, contentType)
    
    const response = await [openai.chat](http://openai.chat).completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Personalize this content: ${content}` }
      ],
      temperature: 0.4, // Balanced creativity with consistency
      max_tokens: 800
    })
    
    const personalized = response.choices[0].message.content
    
    return {
      original: content,
      personalized: this.processVariables(personalized, context),
      confidence: this.calculatePersonalizationConfidence(personalized, context),
      personalizations_applied: this.detectAppliedPersonalizations(content, personalized)
    }
  }
  
  private buildPersonalizationPrompt(context: PersonalizationContext, type: string): string {
    return `You are personalizing wedding communication for a ${context.supplier.type}.
    
    Context:
    - Couple: ${context.couple.names.join(' & ')}
    - Wedding: ${[context.wedding.style](http://context.wedding.style)} ${[context.wedding](http://context.wedding).size} wedding at ${[context.wedding.venue.name](http://context.wedding.venue.name)}
    - Season: ${[context.wedding](http://context.wedding).season} ${[context.wedding](http://context.wedding).time_of_day}
    - Supplier brand: ${context.supplier.brand_voice}
    - Communication style: ${context.couple.communication_style}
    
    Personalization rules:
    1. Use couple's names naturally (not excessively)
    2. Reference venue/style appropriately
    3. Match brand voice: ${this.getBrandVoiceDescription(context.supplier.brand_voice)}
    4. Include relevant expertise mentions
    5. Acknowledge timeline pressure: ${[context.wedding](http://context.wedding).timeline_stress_level}
    6. Never change dates, prices, or critical details
    
    ${this.getContentTypeGuidelines(type)}`
  }
}
```

### Dynamic Variable System

```
class DynamicVariableProcessor {
  private variables = {
    // Time-based variables
    '{{days_until_wedding}}': (context: PersonalizationContext) => {
      return Math.ceil(([context.wedding.date](http://context.wedding.date).getTime() - [Date.now](http://Date.now)()) / (1000 * 60 * 60 * 24))
    },
    '{{weeks_until_wedding}}': (context: PersonalizationContext) => {
      return Math.ceil(this.variables['{{days_until_wedding}}'](context) / 7)
    },
    '{{months_until_wedding}}': (context: PersonalizationContext) => {
      return Math.ceil(this.variables['{{days_until_wedding}}'](context) / 30)
    },
    
    // Couple variables
    '{{couple_names}}': (context: PersonalizationContext) => {
      return context.couple.names.join(' & ')
    },
    '{{couple_first_names}}': (context: PersonalizationContext) => {
      return [context.couple.names.map](http://context.couple.names.map)(name => name.split(' ')[0]).join(' & ')
    },
    
    // Wedding variables
    '{{wedding_date_formatted}}': (context: PersonalizationContext) => {
      return [context.wedding.date](http://context.wedding.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },
    '{{wedding_date_short}}': (context: PersonalizationContext) => {
      return [context.wedding.date](http://context.wedding.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    },
    '{{venue_name}}': (context: PersonalizationContext) => {
      return [context.wedding.venue.name](http://context.wedding.venue.name)
    },
    '{{season}}': (context: PersonalizationContext) => {
      return [context.wedding](http://context.wedding).season
    },
    
    // Dynamic context variables
    '{{appropriate_greeting}}': (context: PersonalizationContext) => {
      const timeUntil = this.variables['{{days_until_wedding}}'](context)
      if (timeUntil > 180) return 'Hope your planning is going well!'
      if (timeUntil > 90) return 'Getting excited for your big day!'
      if (timeUntil > 30) return 'Your wedding is getting close!'
      if (timeUntil > 7) return 'Almost time for your big day!'
      return 'Your wedding is this week!'
    },
    
    '{{season_appropriate_comment}}': (context: PersonalizationContext) => {
      const seasonComments = {
        spring: 'Perfect timing for blooming flowers and mild weather!',
        summer: 'Great choice for outdoor celebrations and golden hour photos!',
        fall: 'Beautiful autumn colors will make stunning photos!',
        winter: 'Winter weddings have such a magical, cozy atmosphere!'
      }
      return seasonComments[[context.wedding](http://context.wedding).season] || ''
    }
  }
  
  processVariables(content: string, context: PersonalizationContext): string {
    let processed = content
    
    for (const [variable, processor] of Object.entries(this.variables)) {
      if (processed.includes(variable)) {
        const value = processor(context)
        processed = processed.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value)
      }
    }
    
    return processed
  }
}
```

### Vendor-Specific Enhancement Rules

```
class VendorPersonalizationSpecialist {
  private vendorEnhancements = {
    photographer: {
      venue_familiarity: (context: PersonalizationContext) => {
        if ([context.wedding](http://context.wedding).venue.previous_experience) {
          return `I've had the pleasure of shooting at ${[context.wedding.venue.name](http://context.wedding.venue.name)} before and know all the best spots for photos!`
        }
        return `I'm excited to explore ${[context.wedding.venue.name](http://context.wedding.venue.name)} with you and find the perfect photo locations.`
      },
      
      lighting_expertise: (context: PersonalizationContext) => {
        const timeComments = {
          morning: 'Morning ceremonies have such beautiful, soft light.',
          afternoon: 'Afternoon lighting will be perfect for bright, joyful photos.',
          evening: 'Evening weddings create stunning golden hour opportunities.'
        }
        return timeComments[[context.wedding](http://context.wedding).time_of_day]
      },
      
      style_alignment: (context: PersonalizationContext) => {
        const styleComments = {
          traditional: 'I love capturing the timeless elegance of traditional weddings.',
          modern: 'Modern weddings offer such great opportunities for creative, artistic shots.',
          bohemian: 'Bohemian style weddings are perfect for capturing natural, candid moments.',
          rustic: 'Rustic venues create such warm, authentic photo opportunities.'
        }
        return styleComments[[context.wedding.style](http://context.wedding.style)]
      }
    },
    
    caterer: {
      guest_count_planning: (context: PersonalizationContext) => {
        const sizeComments = {
          intimate: 'For intimate celebrations like yours, we can focus on elevated, plated service and personalized attention.',
          small: 'Perfect size for family-style service or elegant plated meals.',
          medium: 'Great guest count for interactive stations or buffet-style service.',
          large: 'With your guest count, we can create impressive displays and multiple service options.'
        }
        return sizeComments[[context.wedding](http://context.wedding).size]
      },
      
      venue_considerations: (context: PersonalizationContext) => {
        if ([context.wedding](http://context.wedding).venue.indoor) {
          return 'Indoor venues give us great flexibility with service timing and setup.'
        }
        return 'Outdoor venues allow us to create beautiful displays and interactive stations.'
      }
    },
    
    dj: {
      venue_acoustics: (context: PersonalizationContext) => {
        const venueComments = {
          church: 'Church venues have amazing natural acoustics for ceremony music.',
          barn: 'Barn venues create such a fun, energetic atmosphere for dancing.',
          outdoor: 'Outdoor venues let us really crank up the energy for dancing under the stars.',
          hotel: 'Hotel ballrooms are perfect for sophisticated sound and lighting setups.'
        }
        return venueComments[[context.wedding](http://context.wedding).venue.type]
      }
    }
  }
  
  applyVendorPersonalization(
    content: string, 
    context: PersonalizationContext
  ): string {
    const enhancements = this.vendorEnhancements[context.supplier.type]
    if (!enhancements) return content
    
    let enhanced = content
    
    // Apply contextual enhancements
    for (const [key, enhancer] of Object.entries(enhancements)) {
      if (this.shouldApplyEnhancement(key, context)) {
        const enhancement = enhancer(context)
        enhanced = this.insertEnhancement(enhanced, enhancement)
      }
    }
    
    return enhanced
  }
  
  private shouldApplyEnhancement(enhancementType: string, context: PersonalizationContext): boolean {
    // Logic to determine if enhancement is appropriate
    const relevanceRules = {
      venue_familiarity: () => !![context.wedding](http://context.wedding).venue.previous_experience,
      lighting_expertise: () => context.supplier.type === 'photographer',
      guest_count_planning: () => context.supplier.type === 'caterer',
      venue_acoustics: () => context.supplier.type === 'dj' && [context.wedding](http://context.wedding).venue.type
    }
    
    return relevanceRules[enhancementType]?.()
  }
}
```

### Emotional Intelligence & Tone Matching

```
class EmotionalPersonalization {
  analyzeEmotionalContext(context: PersonalizationContext): EmotionalProfile {
    const stressIndicators = {
      timeline: [context.wedding](http://context.wedding).timeline_stress_level,
      planning_stage: this.determineStage([context.wedding.date](http://context.wedding.date)),
      guest_count_pressure: [context.wedding](http://context.wedding).size === 'large',
      venue_complexity: ![context.wedding](http://context.wedding).venue.indoor
    }
    
    return {
      stress_level: this.calculateStressLevel(stressIndicators),
      excitement_level: this.calculateExcitementLevel(context),
      support_needed: this.determineSupportNeeds(context),
      communication_approach: this.recommendApproach(stressIndicators)
    }
  }
  
  adaptToneForEmotionalState(
    content: string, 
    emotional_profile: EmotionalProfile
  ): string {
    if (emotional_profile.stress_level === 'high') {
      return this.addSupportiveLanguage(content)
    }
    
    if (emotional_profile.excitement_level === 'high') {
      return this.addEnthusiasticLanguage(content)
    }
    
    return content
  }
  
  private addSupportiveLanguage(content: string): string {
    const supportivePhrases = [
      'We know planning can be overwhelming, and we\'re here to make this part easy.',
      'Don\'t worry about the details - we\'ve got everything covered.',
      'Take a deep breath - you\'re doing great!'
    ]
    
    const randomPhrase = supportivePhrases[Math.floor(Math.random() * supportivePhrases.length)]
    return content + '\n\n' + randomPhrase
  }
}
```

## Critical Implementation Notes

### Quality Control System

```
class PersonalizationValidator {
  validatePersonalization(
    original: string, 
    personalized: string, 
    context: PersonalizationContext
  ): ValidationResult {
    const issues = []
    
    // Check for critical info preservation
    const criticalPatterns = [/\d{1,2}[/-]\d{1,2}[/-]\d{4}/, /\$\d+/, /\b\d{1,2}:\d{2}\s?(AM|PM)\b/i]
    
    for (const pattern of criticalPatterns) {
      const originalMatches = original.match(pattern)
      const personalizedMatches = personalized.match(pattern)
      
      if (originalMatches && !personalizedMatches) {
        issues.push('Critical information (dates/prices/times) was removed')
      }
    }
    
    // Check for appropriate personalization level
    const nameCount = (personalized.match(new RegExp(context.couple.names.join('|'), 'gi')) || []).length
    if (nameCount > 3) {
      issues.push('Overuse of couple names')
    }
    
    // Verify tone consistency
    if (!this.verifyToneConsistency(personalized, context.supplier.brand_voice)) {
      issues.push('Tone inconsistent with brand voice')
    }
    
    return {
      valid: issues.length === 0,
      issues,
      confidence: this.calculateConfidence(original, personalized)
    }
  }
}
```

### Performance Tracking

```
interface PersonalizationMetrics {
  engagement_improvement: number // % increase vs generic content
  response_rate: number
  client_satisfaction_score: number
  time_to_completion: number // for forms/tasks
  vendor_feedback_score: number
}

class PersonalizationAnalytics {
  async trackPersonalizationEffectiveness(
    personalization_id: string,
    metrics: PersonalizationMetrics
  ) {
    await db.from('personalization_performance').insert({
      personalization_id,
      ...metrics,
      tracked_at: new Date()
    })
    
    // Update ML training data
    await this.updatePersonalizationModel(personalization_id, metrics)
  }
}
```

### Database Schema

```
CREATE TABLE personalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  original_content TEXT NOT NULL,
  personalized_content TEXT NOT NULL,
  context_data JSONB NOT NULL,
  personalizations_applied TEXT[],
  confidence_score DECIMAL(3,2),
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE personalization_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personalization_id UUID REFERENCES personalizations(id),
  engagement_improvement DECIMAL(5,2),
  response_rate DECIMAL(3,2),
  client_satisfaction_score INTEGER,
  time_to_completion INTEGER, -- seconds
  vendor_feedback_score INTEGER,
  tracked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personalization_supplier ON personalizations(supplier_id);
CREATE INDEX idx_personalization_type ON personalizations(content_type);
```

### API Implementation

```
// Personalize content endpoint
POST /api/ai/personalize
{
  content: string,
  context: PersonalizationContext,
  content_type: 'email' | 'sms' | 'article' | 'form_intro',
  preserve_critical_info: boolean = true
}

// Get personalization suggestions
GET /api/ai/personalization/suggestions?vendor_type=:type&wedding_style=:style

// Track effectiveness
POST /api/ai/personalization/:id/metrics
{
  engagement_improvement: number,
  response_rate: number,
  client_satisfaction_score: number
}

// Bulk personalize journey
POST /api/ai/personalize/journey
{
  journey_id: string,
  context: PersonalizationContext
}
```

This personalization engine creates truly tailored experiences that feel personal without being invasive, helping wedding suppliers build stronger relationships with their clients through intelligent, contextual communication.