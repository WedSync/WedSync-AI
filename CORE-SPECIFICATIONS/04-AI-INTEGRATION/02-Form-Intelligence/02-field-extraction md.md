# 02-field-extraction.md

# Field Extraction Implementation

## What to Build

Implement intelligent field extraction from form images and text using OpenAI models to identify and categorize form fields with wedding-specific intelligence.

## Key Technical Requirements

### Field Type Detection

```
// src/lib/ai/field-extractor.ts
export class FieldExtractor {
  private fieldPatterns = {
    email: /email|e[-\s]?mail/i,
    phone: /phone|mobile|cell|tel|contact/i,
    date: /date|when|day|time/i,
    address: /address|location|venue|where/i,
    number: /count|number|quantity|guests|people|size/i,
    multiSelect: /select\s+all|choose\s+multiple|check\s+all/i,
    payment: /payment|add[-\s]?on|upgrade|option|package/i
  }
  
  async extractFields(text: string, context: 'wedding' | 'general' = 'wedding'): Promise<ExtractedField[]> {
    const response = await [this.openai.chat](http://this.openai.chat).completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: this.getExtractionSystemPrompt(context)
      }, {
        role: 'user',
        content: `Extract form fields from this text:\n\n${text}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
    
    const extracted = JSON.parse(response.choices[0].message.content)
    return this.enhanceWithPatterns(extracted.fields)
  }
  
  private enhanceWithPatterns(fields: RawExtractedField[]): ExtractedField[] {
    return [fields.map](http://fields.map)(field => ({
      ...field,
      type: this.detectFieldType(field.label, field.type),
      isWeddingSpecific: this.isWeddingSpecific(field.label),
      coreFieldMapping: this.mapToCoreField(field.label),
      validation: this.generateValidation(field)
    }))
  }
  
  private detectFieldType(label: string, suggestedType: string): FieldType {
    // Use pattern matching to refine AI suggestions
    for (const [type, pattern] of Object.entries(this.fieldPatterns)) {
      if (pattern.test(label)) {
        return type as FieldType
      }
    }
    return suggestedType as FieldType
  }
}
```

### Wedding-Specific Field Intelligence

```
// src/lib/ai/wedding-field-detector.ts
export class WeddingFieldDetector {
  private weddingFields = {
    coreFields: {
      'couple_names': ['bride', 'groom', 'partner', 'couple', 'names'],
      'wedding_date': ['wedding date', 'ceremony date', 'big day'],
      'ceremony_venue': ['ceremony venue', 'church', 'location'],
      'reception_venue': ['reception venue', 'party location'],
      'guest_count': ['guest count', 'number of guests', 'headcount']
    },
    
    photographyFields: {
      'shot_list': ['must have shots', 'photo list', 'pictures wanted'],
      'family_photos': ['family photos', 'group photos', 'formal shots'],
      'timeline': ['timeline', 'schedule', 'itinerary'],
      'style_preference': ['style', 'photography style', 'approach']
    },
    
    cateringFields: {
      'dietary_requirements': ['dietary', 'allergies', 'restrictions'],
      'menu_preferences': ['menu', 'food preferences', 'cuisine'],
      'bar_package': ['bar', 'drinks', 'alcohol', 'beverage']
    },
    
    musicFields: {
      'first_dance': ['first dance', 'special dance'],
      'playlist': ['music', 'songs', 'playlist'],
      'do_not_play': ['do not play', 'avoid', 'skip']
    }
  }
  
  detectWeddingCategory(label: string): WeddingCategory | null {
    const normalizedLabel = label.toLowerCase()
    
    for (const [category, fields] of Object.entries(this.weddingFields)) {
      for (const [fieldType, keywords] of Object.entries(fields)) {
        if (keywords.some(keyword => normalizedLabel.includes(keyword))) {
          return {
            category: category as WeddingFieldCategory,
            fieldType,
            confidence: this.calculateConfidence(normalizedLabel, keywords)
          }
        }
      }
    }
    
    return null
  }
}
```

### Extraction System Prompts

```
private getExtractionSystemPrompt(context: string): string {
  const basePrompt = `
You are an expert form field extractor. Extract all form fields and return a JSON object.

For each field, determine:
1. Label (exact text)
2. Type (text, email, phone, date, select, checkbox, radio, textarea, number, file)
3. Required status (if indicated by * or "required")
4. Placeholder text (if any)
5. Options (for select/radio/checkbox fields)
6. Help text or description
`

  if (context === 'wedding') {
    return basePrompt + `
Pay special attention to wedding-specific fields:
- Wedding date and time
- Venue information
- Guest counts and dietary requirements
- Photography shot lists
- Music preferences
- Timeline information
- Vendor coordination details

Mark fields that could auto-populate from core wedding data.
`
  }
  
  return basePrompt
}
```

## Critical Implementation Notes

### Confidence Scoring

```
// Calculate extraction confidence
interface ExtractionConfidence {
  overall: number // 0-100
  fieldLevel: Map<string, number>
  issues: string[]
}

const calculateConfidence = (extraction: ExtractedField[]): ExtractionConfidence => {
  let totalScore = 0
  const fieldScores = new Map<string, number>()
  const issues = []
  
  extraction.forEach(field => {
    let score = 50 // Base score
    
    // Increase confidence for clear indicators
    if (field.label.length > 2) score += 20
    if (field.type !== 'text') score += 15 // Non-generic type
    if (field.validation) score += 10
    if (field.isWeddingSpecific) score += 5
    
    // Decrease for potential issues
    if (field.label.length < 3) {
      score -= 30
      issues.push(`Very short label: "${field.label}"`)
    }
    
    fieldScores.set(field.label, Math.min(100, Math.max(0, score)))
    totalScore += score
  })
  
  return {
    overall: Math.min(100, totalScore / extraction.length),
    fieldLevel: fieldScores,
    issues
  }
}
```

### Error Recovery

```
// Handle extraction failures gracefully
export const recoverFromExtractionError = async (
  originalText: string,
  error: Error
): Promise<ExtractedField[]> => {
  console.error('Field extraction failed:', error)
  
  // Fallback to pattern-based extraction
  const patternFields = await extractWithPatterns(originalText)
  
  if (patternFields.length === 0) {
    // Last resort: manual field creation prompts
    return [{
      label: 'Manual Field 1',
      type: 'text',
      required: false,
      isWeddingSpecific: false,
      extractionMethod: 'manual_fallback'
    }]
  }
  
  return patternFields
}
```

### Integration Points

```
// Interface with form builder
export const convertToFormSchema = (
  extractedFields: ExtractedField[]
): FormBuilderSchema => {
  return {
    sections: [{
      name: 'Imported Fields',
      fields: [extractedFields.map](http://extractedFields.map)(field => ({
        id: generateFieldId(),
        ...field,
        settings: {
          required: field.required,
          validation: field.validation,
          coreFieldMapping: field.coreFieldMapping
        }
      }))
    }]
  }
}
```

### Performance Considerations

- Process large documents in chunks
- Use streaming for real-time feedback
- Cache common field patterns
- Implement timeout handling for slow extractions
- Provide manual override options for critical fields