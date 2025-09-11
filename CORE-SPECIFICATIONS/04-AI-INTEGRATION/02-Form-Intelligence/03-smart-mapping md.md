# 03-smart-mapping.md

# Smart Mapping Implementation

## What to Build

Implement intelligent field mapping system that automatically maps extracted form fields to WedSync's internal schema and core wedding fields.

## Key Technical Requirements

### Core Field Mapping Engine

```
// src/lib/ai/smart-mapper.ts
export class SmartMapper {
  private coreFieldDefinitions = {
    couple_names: {
      patterns: ['bride', 'groom', 'partner', 'couple', 'names'],
      dataType: 'text',
      required: true,
      examples: ['Bride Name', 'Groom Name', 'Partner 1 Name']
    },
    wedding_date: {
      patterns: ['wedding date', 'ceremony date', 'event date'],
      dataType: 'date',
      required: true,
      examples: ['Wedding Date', 'Date of Ceremony']
    },
    guest_count: {
      patterns: ['guest count', 'number of guests', 'headcount'],
      dataType: 'number',
      required: false,
      examples: ['Number of Guests', 'Expected Attendance']
    }
    // ... more core fields
  }
  
  async mapFields(
    extractedFields: ExtractedField[],
    supplierType: SupplierType
  ): Promise<MappingResult> {
    const mappings = await this.generateMappings(extractedFields)
    const conflicts = this.detectConflicts(mappings)
    const suggestions = this.generateSuggestions(extractedFields, supplierType)
    
    return {
      mappings,
      conflicts,
      suggestions,
      confidence: this.calculateMappingConfidence(mappings)
    }
  }
  
  private async generateMappings(
    fields: ExtractedField[]
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = []
    
    for (const field of fields) {
      const coreMapping = await this.findCoreFieldMatch(field)
      const customMapping = await this.findCustomFieldMatch(field)
      
      mappings.push({
        sourceField: field,
        coreField: coreMapping,
        customField: customMapping,
        confidence: this.calculateFieldConfidence(field, coreMapping),
        requiresReview: this.needsManualReview(field, coreMapping)
      })
    }
    
    return mappings
  }
}
```

### AI-Powered Mapping Decisions

```
// Use OpenAI for complex mapping decisions
private async findCoreFieldMatch(
  field: ExtractedField
): Promise<CoreFieldMatch | null> {
  const response = await [this.openai.chat](http://this.openai.chat).completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'system',
      content: this.getMappingSystemPrompt()
    }, {
      role: 'user',
      content: `
Field to map:
Label: "${field.label}"
Type: ${field.type}
Context: ${field.context || 'N/A'}
Options: ${field.options?.join(', ') || 'N/A'}

Available core fields:
${this.formatCoreFields()}

Which core field should this map to? Return JSON with mapping decision.
`
    }],
    response_format: { type: 'json_object' },
    temperature: 0.1
  })
  
  const result = JSON.parse(response.choices[0].message.content)
  return result.mapping || null
}

private getMappingSystemPrompt(): string {
  return `
You are an expert field mapper for wedding forms. Analyze form fields and map them to standardized core wedding fields.

Return JSON in this format:
{
  "mapping": {
    "coreField": "field_name" | null,
    "confidence": 0.0-1.0,
    "reasoning": "Why this mapping was chosen",
    "alternatives": ["other_possible_mappings"]
  }
}

Mapping priorities:
1. Exact label matches (high confidence)
2. Semantic similarity (medium confidence)  
3. Field type compatibility (required)
4. Context clues from surrounding fields

Only map if confidence > 0.7, otherwise return null.
`
}
```

### Supplier-Specific Mapping Rules

```
// src/lib/ai/supplier-mappings.ts
export const supplierMappingRules = {
  photography: {
    priorityFields: ['shot_list', 'timeline', 'family_photos'],
    commonMappings: {
      'must have shots': 'shot_list',
      'family photo list': 'family_photos', 
      'wedding timeline': 'timeline',
      'getting ready time': 'prep_time'
    }
  },
  
  catering: {
    priorityFields: ['guest_count', 'dietary_requirements', 'menu_preferences'],
    commonMappings: {
      'number of guests': 'guest_count',
      'dietary restrictions': 'dietary_requirements',
      'food allergies': 'dietary_requirements',
      'menu selection': 'menu_preferences'
    }
  },
  
  music: {
    priorityFields: ['first_dance', 'playlist_requests', 'do_not_play'],
    commonMappings: {
      'first dance song': 'first_dance',
      'music requests': 'playlist_requests',
      'songs to avoid': 'do_not_play'
    }
  }
}
```

### Conflict Detection & Resolution

```
// Detect mapping conflicts
interface MappingConflict {
  type: 'duplicate_mapping' | 'incompatible_type' | 'missing_required'
  coreField: string
  conflictingFields: string[]
  severity: 'high' | 'medium' | 'low'
  resolution: ConflictResolution
}

class ConflictDetector {
  detectConflicts(mappings: FieldMapping[]): MappingConflict[] {
    const conflicts: MappingConflict[] = []
    
    // Check for duplicate mappings to same core field
    const coreFieldUsage = new Map<string, string[]>()
    mappings.forEach(mapping => {
      if (mapping.coreField) {
        const existing = coreFieldUsage.get(mapping.coreField) || []
        existing.push(mapping.sourceField.label)
        coreFieldUsage.set(mapping.coreField, existing)
      }
    })
    
    coreFieldUsage.forEach((fields, coreField) => {
      if (fields.length > 1) {
        conflicts.push({
          type: 'duplicate_mapping',
          coreField,
          conflictingFields: fields,
          severity: 'high',
          resolution: this.suggestDuplicateResolution(coreField, fields)
        })
      }
    })
    
    return conflicts
  }
  
  private suggestDuplicateResolution(
    coreField: string, 
    fields: string[]
  ): ConflictResolution {
    // Use AI to suggest best mapping
    return {
      type: 'choose_best',
      recommendation: fields[0], // Simplified
      reason: 'Most specific label match'
    }
  }
}
```

## Critical Implementation Notes

### Mapping Confidence Scoring

```
const calculateMappingConfidence = (
  sourceField: ExtractedField,
  coreMapping: CoreFieldMatch
): number => {
  let confidence = 0
  
  // Exact label match
  if (sourceField.label.toLowerCase() === coreMapping.label.toLowerCase()) {
    confidence += 0.4
  }
  
  // Semantic similarity (use embeddings)
  const semanticScore = calculateSemanticSimilarity(
    sourceField.label, 
    coreMapping.patterns
  )
  confidence += semanticScore * 0.3
  
  // Type compatibility
  if (sourceField.type === coreMapping.dataType) {
    confidence += 0.2
  }
  
  // Context relevance
  if (sourceField.context && coreMapping.contexts.includes(sourceField.context)) {
    confidence += 0.1
  }
  
  return Math.min(1.0, confidence)
}
```

### Database Schema

```
-- Store mapping configurations
CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  source_field_label TEXT NOT NULL,
  core_field_name TEXT,
  custom_field_name TEXT,
  confidence_score DECIMAL(3,2),
  manual_override BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track mapping performance
CREATE TABLE mapping_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id UUID REFERENCES field_mappings(id),
  supplier_id UUID REFERENCES suppliers(id),
  feedback_type TEXT, -- 'correct' | 'incorrect' | 'partial'
  user_correction TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Learning & Improvement

```
// Learn from user corrections
export class MappingLearner {
  async recordFeedback(
    mappingId: string,
    feedback: MappingFeedback
  ): Promise<void> {
    await this.supabase.from('mapping_feedback').insert({
      mapping_id: mappingId,
      supplier_id: feedback.supplierId,
      feedback_type: feedback.type,
      user_correction: feedback.correction
    })
    
    // Update mapping confidence based on feedback
    if (feedback.type === 'incorrect') {
      await this.adjustMappingConfidence(mappingId, -0.2)
    }
  }
  
  async improveMappings(): Promise<void> {
    // Analyze feedback patterns and update mapping rules
    const feedbackPatterns = await this.analyzeFeedbackPatterns()
    await this.updateMappingRules(feedbackPatterns)
  }
}
```

### User Interface Integration

```
// Provide mapping review interface
interface MappingReviewUI {
  automaticMappings: FieldMapping[]
  suggestedMappings: FieldMapping[]
  unmappedFields: ExtractedField[]
  conflicts: MappingConflict[]
  
  actions: {
    acceptMapping: (fieldId: string) => void
    rejectMapping: (fieldId: string) => void
    manualMap: (fieldId: string, coreField: string) => void
    skipField: (fieldId: string) => void
  }
}
```