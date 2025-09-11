# 01-api-strategy.md

# AI API Strategy Implementation

## What to Build

Implement a dual-API architecture where WedSync uses platform APIs for core features and allows suppliers to configure their own APIs for high-usage features.

## Key Technical Requirements

### Platform API Configuration

```
// src/lib/ai/platform-api.ts
interface PlatformAPIConfig {
  openai: {
    apiKey: string // Platform's OpenAI key
    model: 'gpt-4' | 'gpt-3.5-turbo'
    maxTokens: number
    temperature: number
  }
  usage: {
    formGeneration: boolean
    websiteAnalysis: boolean  
    templateGeneration: boolean
  }
}

export const platformAI = {
  generateForm: async (description: string) => {
    // Use platform API for form generation
  },
  analyzeWebsite: async (url: string) => {
    // Use platform API for website scraping
  }
}
```

### Client API Configuration

```
// src/lib/ai/client-api.ts
interface ClientAPIConfig {
  openai?: {
    apiKey: string // Encrypted supplier's key
    model: string
    monthlyBudget: number
    currentUsage: number
  }
  enabled: boolean
}

export const clientAI = {
  chatbot: async (message: string, context: string[]) => {
    // Use client's API for chatbot
  },
  generateContent: async (prompt: string) => {
    // Use client's API for custom content
  }
}
```

## Critical Implementation Notes

### API Key Management

- Store client API keys encrypted using Supabase Vault
- Validate API keys on setup with test requests
- Implement automatic budget monitoring and alerts
- Provide clear setup wizards for non-technical users

### Usage Tracking

```
// Database table: ai_usage_tracking
CREATE TABLE ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  api_type TEXT, -- 'platform' | 'client'
  feature TEXT, -- 'form_generation' | 'chatbot' | etc
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Cost Control

- Set hard limits on client API usage
- Implement circuit breakers for failed requests
- Cache responses to reduce API calls
- Provide real-time usage dashboards

### Error Handling

- Graceful fallbacks when AI services fail
- Clear error messages for API setup issues
- Retry logic with exponential backoff
- Manual override options for critical functions