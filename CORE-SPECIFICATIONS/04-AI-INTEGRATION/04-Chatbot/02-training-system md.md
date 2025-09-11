# 02-training-system.md

# Chatbot Training System

## What to Build

Comprehensive training pipeline that creates vendor-specific chatbots from FAQ content, articles, and real conversation data with continuous improvement through feedback loops.

## Key Technical Requirements

### Training Data Pipeline

```
interface TrainingData {
  faqs: FAQ[]
  articles: Article[]
  conversations: ChatLog[]
  feedback: UserFeedback[]
}

class ChatbotTrainer {
  async trainFromSources(vendorId: string) {
    const sources = await this.gatherTrainingSources(vendorId)
    
    // Create training pairs
    const pairs = await this.createTrainingPairs(sources)
    
    // Generate embeddings
    const embeddings = await this.generateEmbeddings(pairs)
    
    // Store in vector database
    await this.storeKnowledgeBase(vendorId, embeddings)
    
    // Generate system prompt
    const prompt = this.generateSystemPrompt(vendorId, sources)
    
    return { pairs: pairs.length, embeddings: embeddings.length, prompt }
  }
  
  private async createTrainingPairs(sources: TrainingData) {
    const pairs = []
    
    // FAQ pairs (highest quality)
    for (const faq of sources.faqs) {
      pairs.push({
        question: faq.question,
        answer: faq.answer,
        source: 'faq',
        confidence: 1.0
      })
    }
    
    // Article-derived pairs
    for (const article of sources.articles) {
      const extracted = await this.extractQAPairs(article)
      pairs.push(...extracted)
    }
    
    return pairs
  }
}
```

### System Prompt Generation

```
const generateSystemPrompt = (vendor: Vendor, sources: TrainingData) => {
  const basePrompt = `You are a helpful assistant for ${vendor.businessName}, a ${vendor.type} service.

KEY INSTRUCTIONS:
- Only answer from your provided knowledge base
- Never make up information or prices
- If unsure, offer to connect with ${vendor.contactName}
- Maintain a ${vendor.brandTone || 'professional and friendly'} tone
- Always include relevant contact information when appropriate

BUSINESS CONTEXT:
- Business: ${vendor.businessName}
- Service: ${vendor.type}
- Location: ${vendor.location}
- Specialties: ${vendor.specialties?.join(', ') || 'Full wedding services'}

CONTACT INFORMATION:
- Email: ${[vendor.email](http://vendor.email)}
- Phone: ${[vendor.phone](http://vendor.phone)}
- Website: ${[vendor.website](http://vendor.website)}

When you cannot answer a question:
1. Acknowledge the question
2. Explain you don't have that specific information
3. Offer to connect them with ${vendor.contactName}
4. Provide contact details

Remember: Quality over quantity. Better to connect them personally than guess.`

  return basePrompt
}
```

### Content Extraction from Articles

```
class ContentExtractor {
  async extractQAPairs(article: Article): Promise<TrainingPair[]> {
    const prompt = `Extract Q&A pairs from this wedding business article:

${article.content}

Generate realistic questions a couple might ask and clear answers based only on the article content. Return as JSON array with 'question' and 'answer' fields.

Focus on:
- Pricing information
- Service details
- Process/timeline questions
- Logistics/location info
- Package options

Avoid:
- Making up specific prices not mentioned
- Adding information not in the article
- Generic wedding advice

Return max 10 high-quality pairs.`

    const response = await openai.complete({
      prompt,
      model: 'gpt-4',
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
    
    const pairs = JSON.parse(response)
    return [pairs.map](http://pairs.map)(pair => ({
      ...pair,
      source: 'article',
      sourceId: [article.id](http://article.id),
      confidence: 0.8 // Lower than FAQ
    }))
  }
}
```

### Conversation Learning

```
class ConversationLearner {
  async learnFromFeedback(feedback: ChatFeedback[]) {
    const improvements = []
    
    for (const item of feedback) {
      if (item.rating < 3) { // Poor rating
        const improvement = await this.analyzeFailure(item)
        improvements.push(improvement)
      }
      
      if (item.correction) { // User provided correction
        improvements.push({
          type: 'correction',
          original: item.botResponse,
          corrected: item.correction,
          question: item.userQuestion
        })
      }
    }
    
    return this.processImprovements(improvements)
  }
  
  private async analyzeFailure(feedback: ChatFeedback) {
    const analysis = await openai.complete({
      prompt: `Analyze this chatbot failure:
        Question: ${feedback.userQuestion}
        Bot Response: ${feedback.botResponse}
        User Rating: ${feedback.rating}/5
        User Comment: ${feedback.comment}
        
        Why might this have failed? What should the bot have said instead?`,
      model: 'gpt-3.5-turbo',
      temperature: 0.1
    })
    
    return {
      type: 'failure_analysis',
      original: feedback,
      analysis,
      suggestedImprovement: analysis
    }
  }
}
```

## Critical Implementation Notes

### Training Data Quality

- **Manual Review**: All auto-generated Q&A pairs require approval
- **Version Control**: Track training data changes and performance
- **Validation**: Test against holdout questions before deployment
- **Vendor Approval**: Suppliers must approve their chatbot's knowledge

### Continuous Improvement

```
class TrainingScheduler {
  async scheduleRetraining(vendorId: string) {
    const lastTrained = await this.getLastTrainingDate(vendorId)
    const newContent = await this.getNewContent(vendorId, lastTrained)
    const feedback = await this.getRecentFeedback(vendorId, lastTrained)
    
    // Retrain if significant new content or poor performance
    if (newContent.length > 10 || this.averageRating(feedback) < 3.5) {
      await this.scheduleBatchRetrain(vendorId)
    }
  }
  
  // Run weekly for all vendors
  async weeklyRetrainingCheck() {
    const vendors = await this.getActiveVendors()
    
    for (const vendor of vendors) {
      await this.scheduleRetraining([vendor.id](http://vendor.id))
    }
  }
}
```

### Testing Framework

```
class ChatbotTesting {
  async testChatbot(vendorId: string) {
    const testQuestions = await this.getTestQuestions(vendorId)
    const results = []
    
    for (const question of testQuestions) {
      const response = await this.getChatbotResponse(vendorId, question.text)
      const score = await this.scoreResponse(question, response)
      
      results.push({
        question: question.text,
        response: response.text,
        expectedAnswer: question.expectedAnswer,
        score,
        passed: score > 0.7
      })
    }
    
    return {
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      averageScore: results.reduce((a, b) => a + b.score, 0) / results.length,
      details: results
    }
  }
}
```

## Database Structure

```
CREATE TABLE training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES suppliers(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'faq', 'article', 'conversation'
  source_id UUID,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES suppliers(id),
  training_pairs_count INTEGER,
  embeddings_generated INTEGER,
  system_prompt TEXT,
  performance_score DECIMAL(3,2),
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  user_question TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  correction TEXT, -- What response should have been
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_vendor ON training_data(vendor_id);
CREATE INDEX idx_training_verified ON training_data(verified);
CREATE INDEX idx_feedback_rating ON chat_feedback(rating);
```

### Performance Monitoring

```
interface TrainingMetrics {
  knowledgeBase: {
    totalPairs: number
    verifiedPairs: number
    sources: Record<string, number>
    lastUpdated: Date
  }
  performance: {
    averageRating: number
    responseAccuracy: number
    fallbackRate: number
    userSatisfaction: number
  }
  improvement: {
    weeklyNewPairs: number
    accuracyTrend: number[]
    commonFailures: string[]
  }
}
```

### Training Quality Gates

- **Minimum Data**: 50+ verified Q&A pairs before activation
- **Coverage**: Questions must cover core business areas
- **Testing**: 80%+ accuracy on test questions
- **Review**: Manual supplier approval required
- **Monitoring**: Weekly performance reviews
- **Feedback Loop**: <24hr response to poor ratings