# 01-email-templates.md

## What to Build

AI system that generates wedding-specific email templates based on supplier type and journey stage.

## Key Technical Requirements

### Template Generator

```
interface EmailGeneratorRequest {
  vendorType: 'photographer' | 'dj' | 'caterer' | 'venue'
  stage: 'inquiry' | 'booking' | 'planning' | 'final' | 'post'
  tone: 'formal' | 'friendly' | 'casual'
  includeElements: string[] // ['pricing', 'timeline', 'next-steps']
}

class EmailTemplateAI {
  async generate(request: EmailGeneratorRequest) {
    const prompt = this.buildPrompt(request)
    
    const template = await openai.complete({
      prompt,
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 500
    })
    
    return this.addMergeTags(template, request.vendorType)
  }
  
  addMergeTags(template: string, type: string) {
    const tags = {
      photographer: ['{{couple_names}}', '{{wedding_date}}', '{{venue}}'],
      dj: ['{{first_dance_song}}', '{{guest_count}}', '{{reception_time}}']
    }
    
    return this.injectTags(template, tags[type])
  }
}
```

### Personalization Engine

```
const personalizeEmail = async (template: string, client: Client) => {
  // Add dynamic content based on client data
  if (client.venue?.outdoor) {
    template += '\n\nP.S. I have great experience with outdoor ceremonies at your venue!'
  }
  return template
}
```

## Critical Implementation Notes

- Generate 5 variants per request for A/B testing
- Include industry-specific terminology
- Respect supplier's brand voice settings

## Template Storage

```
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  supplier_id UUID,
  stage TEXT,
  subject TEXT,
  body TEXT,
  merge_tags TEXT[],
  ai_generated BOOLEAN
);
```