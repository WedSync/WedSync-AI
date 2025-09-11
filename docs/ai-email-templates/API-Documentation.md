# AI Email Templates API Documentation

## Overview

The AI Email Templates API provides intelligent email template generation using AI/ML services to create personalized, context-aware email content for wedding communications.

## Base URL

```
/api/ai-email-templates
```

## Authentication

All endpoints require valid session authentication. Include authentication headers with your requests.

## Rate Limiting

- **Rate Limit**: 10 requests per minute per IP/User-Agent combination
- **Response Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Timestamp when rate limit resets

## Endpoints

### POST /api/ai-email-templates

Generate, refine, or create variations of AI-powered email templates.

#### Request Body

```typescript
interface RequestBody {
  action: 'generate' | 'refine' | 'variations' | 'personalize';
  
  // For 'generate' action
  context?: {
    communication_purpose: string;
    relationship_stage: 'new_client' | 'existing_client' | 'post_wedding';
    client_name?: string;
    vendor_name?: string;
    wedding_date?: string; // ISO date string
    venue_name?: string;
    additional_data?: Record<string, any>;
  };
  
  template_type?: 'welcome' | 'payment_reminder' | 'meeting_confirmation' | 'thank_you' | 'client_communication' | 'custom';
  tone?: 'formal' | 'friendly' | 'professional' | 'warm' | 'urgent' | 'celebratory';
  length?: 'short' | 'medium' | 'long';
  include_call_to_action?: boolean;
  
  style_preferences?: {
    use_emojis: boolean;
    include_personal_touches: boolean;
    formal_language: boolean;
    include_vendor_branding: boolean;
    template_structure: 'minimal' | 'standard' | 'detailed';
  };
  
  personalization_data?: {
    client_preferences?: {
      communication_style?: string;
      preferred_name?: string;
      special_requirements?: string[];
    };
    wedding_details?: {
      theme?: string;
      season?: string;
      guest_count?: number;
      budget_tier?: 'budget' | 'mid-range' | 'luxury';
    };
  };
  
  brand_guidelines?: {
    primary_colors?: string[];
    fonts?: string[];
    voice_tone?: string;
    key_messaging?: string[];
    do_not_use?: string[];
  };
  
  client_id?: string; // For personalization
  vendor_id?: string; // For personalization
  
  // For 'refine' action
  template?: EmailTemplate;
  refinement_instructions?: string;
  
  // For 'variations' action
  base_request?: AIEmailGenerationRequest;
  variation_count?: number;
  
  // For 'personalize' action
  base_template?: {
    category: string;
    subject: string;
    content: string;
  };
}
```

#### Responses

##### Generate Action Success Response

```typescript
interface GenerateResponse {
  success: true;
  data: {
    generated_template: {
      subject: string;
      body_html: string;
      body_text: string;
      variables_used: string[];
      estimated_engagement_score: number; // 0-1
      key_points: string[];
      call_to_action?: string;
    };
    alternatives: GeneratedTemplate[]; // Alternative versions
    personalization_score: number; // 0-1
    tone_match_score: number; // 0-1
    suggestions: {
      type: 'subject_alternative' | 'tone_adjustment' | 'personalization_opportunity' | 'call_to_action_improvement';
      suggestion: string;
      reasoning: string;
      impact_score: number; // 0-1
    }[];
    generation_metadata: {
      model_used: string;
      generation_time_ms: number;
      confidence_score: number; // 0-1
      tokens_used: number;
    };
  };
  metadata: {
    personalized: boolean;
    generation_time_ms: number;
  };
}
```

##### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: string; // Only in development mode
  retry_after?: number; // For rate limit errors
}
```

#### Example Requests

##### Generate Welcome Template

```bash
curl -X POST /api/ai-email-templates \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "context": {
      "communication_purpose": "Welcome new client to photography services",
      "relationship_stage": "new_client",
      "client_name": "Sarah Johnson",
      "vendor_name": "Elite Photography",
      "wedding_date": "2024-06-15",
      "venue_name": "Garden Pavilion"
    },
    "template_type": "welcome",
    "tone": "friendly",
    "length": "medium",
    "include_call_to_action": true,
    "style_preferences": {
      "use_emojis": true,
      "include_personal_touches": true,
      "formal_language": false,
      "include_vendor_branding": true,
      "template_structure": "standard"
    },
    "client_id": "client_123",
    "vendor_id": "vendor_456"
  }'
```

##### Refine Existing Template

```bash
curl -X POST /api/ai-email-templates \
  -H "Content-Type: application/json" \
  -d '{
    "action": "refine",
    "template": {
      "id": "template_123",
      "subject": "Payment Reminder",
      "content": "<p>Your payment is due.</p>",
      "category": "payment_reminder"
    },
    "refinement_instructions": "Make this more personal and urgent, add specific payment details"
  }'
```

##### Generate Template Variations

```bash
curl -X POST /api/ai-email-templates \
  -H "Content-Type: application/json" \
  -d '{
    "action": "variations",
    "base_request": {
      "context": {
        "communication_purpose": "Meeting confirmation",
        "relationship_stage": "existing_client"
      },
      "template_type": "meeting_confirmation",
      "tone": "professional"
    },
    "variation_count": 3
  }'
```

### GET /api/ai-email-templates

Retrieve personalization recommendations, insights, and profiles.

#### Query Parameters

- `action`: 'recommendations' | 'insights' | 'profile'
- `client_id`: Required. Client identifier
- `vendor_id`: Optional. Vendor identifier
- `template_type`: Optional. Template type for context

#### Example Requests

##### Get Personalization Recommendations

```bash
curl "GET /api/ai-email-templates?action=recommendations&client_id=client_123&template_type=welcome"
```

Response:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "field": "subject_line",
        "recommendation": "Use client's preferred name in subject",
        "reasoning": "Personalized subjects have 26% higher open rates",
        "confidence": 0.85,
        "impact_score": 0.8
      }
    ]
  }
}
```

##### Get Contextual Insights

```bash
curl "GET /api/ai-email-templates?action=insights&client_id=client_123&vendor_id=vendor_456"
```

Response:
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "timing",
        "insight": "Client is in final month before wedding",
        "recommendation": "Use calm, reassuring tone",
        "priority": "high"
      }
    ]
  }
}
```

##### Get Personalization Profile

```bash
curl "GET /api/ai-email-templates?action=profile&client_id=client_123"
```

Response:
```json
{
  "success": true,
  "data": {
    "profile": {
      "client_id": "client_123",
      "personalization_score": 0.85,
      "communication_preferences": {
        "preferred_tone": "warm",
        "content_length": "medium",
        "include_emojis": false
      },
      "behavioral_data": {
        "email_engagement": {
          "open_rate": 0.8,
          "click_rate": 0.4
        }
      },
      "wedding_context": {
        "wedding_phase": "mid_planning",
        "days_until_wedding": 120
      }
    }
  }
}
```

### PUT /api/ai-email-templates

Track email engagement for personalization learning.

#### Request Body

```typescript
interface TrackingRequest {
  client_id: string;
  vendor_id?: string;
  email_data: {
    template_type: string;
    subject: string;
    sent_at: string; // ISO timestamp
    opened_at?: string; // ISO timestamp
    clicked_at?: string; // ISO timestamp
    responded_at?: string; // ISO timestamp
  };
}
```

#### Example Request

```bash
curl -X PUT /api/ai-email-templates \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client_123",
    "vendor_id": "vendor_456",
    "email_data": {
      "template_type": "welcome",
      "subject": "Welcome to Elite Photography",
      "sent_at": "2024-01-15T10:00:00Z",
      "opened_at": "2024-01-15T10:30:00Z",
      "clicked_at": "2024-01-15T11:00:00Z"
    }
  }'
```

Response:
```json
{
  "success": true,
  "message": "Email engagement tracked successfully"
}
```

## Integration Examples

### JavaScript/TypeScript

```typescript
// Generate personalized email template
async function generateEmailTemplate(clientId: string, context: any) {
  const response = await fetch('/api/ai-email-templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'generate',
      client_id: clientId,
      context: context,
      template_type: 'welcome',
      tone: 'friendly',
      length: 'medium',
      include_call_to_action: true
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.data.generated_template;
}

// Track email engagement
async function trackEngagement(clientId: string, emailData: any) {
  await fetch('/api/ai-email-templates', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      email_data: emailData
    })
  });
}
```

### React Hook

```typescript
import { useState, useCallback } from 'react';

export function useAIEmailTemplates() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateTemplate = useCallback(async (request: any) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', ...request })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);
  
  const getRecommendations = useCallback(async (clientId: string, templateType: string) => {
    const response = await fetch(
      `/api/ai-email-templates?action=recommendations&client_id=${clientId}&template_type=${templateType}`
    );
    
    const result = await response.json();
    return result.success ? result.data.recommendations : [];
  }, []);
  
  return {
    generateTemplate,
    getRecommendations,
    isGenerating,
    error
  };
}
```

## Error Codes and Handling

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 400 | Bad Request - Missing or invalid parameters | Check request format and required fields |
| 401 | Unauthorized - Invalid or missing authentication | Verify authentication headers |
| 429 | Rate Limit Exceeded | Wait before making more requests (see `retry_after`) |
| 500 | Internal Server Error - AI service or database issue | Retry request, contact support if persistent |

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string; // Human-readable error message
  details?: string; // Technical details (development only)
  retry_after?: number; // Seconds to wait (rate limit errors)
  code?: string; // Machine-readable error code
}
```

### Best Practices for Error Handling

```typescript
async function handleAIRequest(requestData: any) {
  try {
    const response = await fetch('/api/ai-email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      // Handle specific error cases
      switch (response.status) {
        case 400:
          console.error('Invalid request:', result.error);
          // Show user-friendly validation message
          break;
        case 429:
          console.warn('Rate limited, retrying in', result.retry_after, 'seconds');
          // Implement exponential backoff
          setTimeout(() => handleAIRequest(requestData), result.retry_after * 1000);
          return;
        case 500:
          console.error('Service error:', result.error);
          // Show fallback UI or retry option
          break;
      }
      throw new Error(result.error);
    }
    
    return result.data;
  } catch (error) {
    // Handle network or parsing errors
    console.error('Request failed:', error);
    throw error;
  }
}
```

## Performance Considerations

### Response Times

- **Template Generation**: 1-3 seconds typical
- **Personalization Lookup**: 100-300ms typical
- **Template Refinement**: 1-2 seconds typical

### Optimization Tips

1. **Cache Personalization Data**: Profile data changes infrequently
2. **Batch Requests**: Generate variations in single request
3. **Use Appropriate Length**: Shorter templates generate faster
4. **Implement Fallbacks**: Always have backup templates ready

### Monitoring

Monitor these metrics for optimal performance:

- Generation success rate
- Average response time
- Rate limit hit rate
- Personalization score trends

## Security Considerations

### Data Privacy

- Client data is only used for personalization during request
- No persistent storage of personal information in AI system
- All communications encrypted in transit

### Input Validation

All user inputs are validated and sanitized:
- Email content is HTML-sanitized
- Template variables are validated against allowed patterns
- File uploads (if applicable) are scanned for malicious content

### Rate Limiting

Prevents abuse while allowing legitimate usage:
- 10 requests per minute per IP/User-Agent
- Higher limits available for verified accounts
- Temporary blocks for repeated violations