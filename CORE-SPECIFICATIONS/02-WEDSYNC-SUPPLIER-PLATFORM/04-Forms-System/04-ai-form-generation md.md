# 04-ai-form-generation.md

## Overview

Critical feature using OpenAI to generate complete forms from natural language descriptions or PDF imports.

## Generation Methods

### 1. Natural Language Generation

**Input**: "I need to collect shot list preferences and family photo groups"

**Output**: Complete form with appropriate fields

### 2. PDF Import & Analysis

**Process**:

1. Upload existing PDF form
2. OpenAI Vision API extracts fields
3. Intelligent field type detection
4. Layout preservation where logical
5. Instant preview and edit

### 3. Template Enhancement

**Input**: Select basic template

**AI Enhancement**: Add vendor-specific fields

## Implementation

### API Integration

```
const generateForm = async (prompt: string) => {
  const systemPrompt = `
    You are a wedding form builder. Generate form fields for: ${vendorType}.
    Include field types, validation, and helpful descriptions.
    Output as JSON matching our FormSchema.
  `
  
  const response = await [openai.chat](http://openai.chat).completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  })
  
  return parseFormSchema(response)
}
```

### Cost Management

- Cache generated forms by prompt similarity
- Use GPT-3.5 for simple requests
- Batch similar requests
- Track usage per supplier tier

## Field Intelligence

### Smart Defaults

- Wedding date → Date picker with "flexible" option
- Guest count → Number with adult/child split
- Venue → Autocomplete with Google Places
- Budget → Range slider with currency

### Vendor-Specific Intelligence

- **Photographer**: Shot list, family groups, style preferences
- **DJ**: Song requests, do-not-play, timeline
- **Caterer**: Dietary matrix, service style, tastings

## Quality Assurance

- Validate generated JSON schema
- Ensure accessibility standards
- Check mobile responsiveness
- Verify field relationships