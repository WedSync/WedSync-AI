# 03-fallback-logic.md

## What to Build

Robust fallback system that gracefully handles situations when the AI chatbot cannot answer questions, maintaining professional image and providing useful alternatives.

## Key Technical Requirements

### Confidence Scoring

```
interface ChatResponse {
  answer: string
  confidence: number // 0-1 scale
  sources: string[]
  fallbackReason?: FallbackReason
}

enum FallbackReason {
  LOW_CONFIDENCE = 'low_confidence',
  NO_MATCH = 'no_match', 
  AMBIGUOUS = 'ambiguous',
  OUT_OF_SCOPE = 'out_of_scope',
  TECHNICAL_ERROR = 'technical_error'
}
```

### Fallback Hierarchy

```
class ChatbotFallback {
  async handleResponse(query: string, confidence: number) {
    if (confidence > 0.8) {
      return this.directAnswer()
    }
    
    if (confidence > 0.6) {
      return this.qualifiedAnswer() // "Based on my knowledge..."
    }
    
    if (confidence > 0.4) {
      return this.suggestSimilar() // "You might be asking about..."
    }
    
    return this.escalateToHuman()
  }
  
  private suggestSimilar(query: string) {
    const similar = this.findSimilarQuestions(query)
    return {
      message: "I'm not sure about that exactly, but I can help with:",
      suggestions: similar.slice(0, 3),
      contactOffer: true
    }
  }
}
```

## Critical Implementation Notes

### Graceful Degradation Messages

```
const FALLBACK_MESSAGES = {
  [FallbackReason.LOW_CONFIDENCE]: [
    "I want to make sure I give you accurate information. Let me connect you with [Supplier Name] directly.",
    "That's a great question that deserves a detailed answer. Would you like me to have [Supplier Name] get back to you?"
  ],
  
  [[FallbackReason.NO](http://FallbackReason.NO)_MATCH]: [
    "I don't have information about that specific topic. Here are some questions I can help with:",
    "That's not something I'm trained on, but [Supplier Name] would love to discuss this with you personally."
  ],
  
  [FallbackReason.OUT_OF_SCOPE]: [
    "That's outside my area of expertise, but [Supplier Name] is the best person to answer that.",
    "For questions about [topic], I'd recommend speaking directly with the team."
  ]
}
```

### Contact Escalation

```
interface EscalationOptions {
  urgency: 'low' | 'medium' | 'high'
  contactMethods: {
    email: boolean
    phone: boolean
    calendar: boolean // Book consultation
  }
  context: string // What they were asking about
}

class ContactEscalation {
  async escalate(query: string, clientInfo: ClientInfo) {
    // Log the unanswered question for training
    await this.logUnanswered(query, clientInfo.supplierId)
    
    // Determine urgency from query content
    const urgency = this.assessUrgency(query)
    
    // Offer appropriate contact methods
    return this.buildContactOptions(urgency, clientInfo)
  }
  
  private assessUrgency(query: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['urgent', 'emergency', 'tomorrow', 'asap', 'help']
    const timeKeywords = ['today', 'tonight', 'this week']
    
    if (urgentKeywords.some(word => query.toLowerCase().includes(word))) {
      return 'high'
    }
    
    if (timeKeywords.some(word => query.toLowerCase().includes(word))) {
      return 'medium'
    }
    
    return 'low'
  }
}
```

### Learning from Failures

```
class FallbackLearning {
  async processUnanswered(queries: UnansweredQuery[]) {
    // Group similar questions
    const clusters = this.clusterQueries(queries)
    
    // Generate suggested FAQ updates
    for (const cluster of clusters) {
      if (cluster.count > 5) { // Threshold for action
        await this.suggestFAQAddition(cluster)
      }
    }
  }
  
  async suggestFAQAddition(cluster: QueryCluster) {
    const suggestion = {
      question: cluster.commonPattern,
      frequency: cluster.count,
      supplierId: cluster.supplierId,
      suggestedAnswer: await this.generateAnswer(cluster),
      needsReview: true
    }
    
    await this.notifySupplier(suggestion)
  }
}
```

## Database Structure

```
CREATE TABLE chatbot_fallbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  query TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  fallback_reason TEXT NOT NULL,
  escalation_method TEXT, -- 'email', 'phone', 'calendar'
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE unanswered_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  query TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_asked TIMESTAMPTZ DEFAULT NOW(),
  suggested_answer TEXT,
  added_to_faq BOOLEAN DEFAULT false,
  
  UNIQUE(supplier_id, query)
);

CREATE INDEX idx_fallbacks_supplier ON chatbot_fallbacks(supplier_id);
CREATE INDEX idx_unanswered_frequency ON unanswered_queries(frequency DESC);
```

### Error Recovery

```
class ErrorRecovery {
  async handleAPIError(error: Error, query: string) {
    // Log error for monitoring
    await this.logError(error, query)
    
    // Return helpful message instead of technical error
    return {
      message: "I'm having a technical moment. Let me connect you directly with [Supplier Name] to make sure you get the help you need.",
      contactButton: true,
      errorType: 'api_failure'
    }
  }
  
  async handleTimeout(query: string) {
    return {
      message: "Sorry for the delay! Your question is important. I'll have [Supplier Name] get back to you personally with a thorough answer.",
      escalate: true,
      priority: 'medium'
    }
  }
}
```

### Quality Metrics

- **Fallback Rate**: Target <20% of all queries
- **Escalation Success**: >90% of escalated queries resolved
- **Learning Rate**: >50% of frequent unanswered queries become FAQs
- **Recovery Time**: <2 seconds for fallback responses
- **Client Satisfaction**: >85% positive rating for fallback handling