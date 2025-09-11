# 03-quality-control.md

## What to Build

Automated and manual quality assurance system ensuring templates meet platform standards before marketplace listing.

## Key Technical Requirements

### Automated Quality Checks

```
interface QualityChecks {
  automated: {
    completeness: {
      hasTitle: boolean
      hasDescription: boolean
      minDescriptionLength: 100
      hasScreenshots: boolean
      minScreenshots: 3
    },
    technical: {
      validJSON: boolean
      noErrors: boolean
      dependenciesResolved: boolean
      performanceScore: number // Load time simulation
    },
    content: {
      noProfanity: boolean
      noPersonalData: boolean
      originalContent: boolean // Plagiarism check
      spellCheck: boolean
    },
    compliance: {
      termsAccepted: boolean
      appropriateContent: boolean
      noMisleadingClaims: boolean
    }
  },
  manual: {
    designQuality: number // 1-10 scale
    usefulness: number // 1-10 scale
    uniqueness: number // 1-10 scale
    documentation: number // 1-10 scale
  }
}
```

### Plagiarism Detection

```
class PlagiarismDetector {
  async checkOriginality(template: Template): Promise<OriginalityScore> {
    // Generate content hash
    const contentHash = await this.hashContent(template)
    
    // Check against existing templates
    const similar = await db.query(
      `SELECT * FROM template_hashes 
       WHERE similarity(hash, $1) > 0.8`,
      [contentHash]
    )
    
    if (similar.length > 0) {
      return {
        isOriginal: false,
        similarTo: similar[0].template_id,
        similarity: similar[0].similarity
      }
    }
    
    // Check structure similarity
    const structureScore = await this.checkStructureSimilarity(template)
    
    return {
      isOriginal: structureScore < 0.7,
      originalityScore: 1 - structureScore
    }
  }
  
  private async hashContent(template: Template): Promise<string> {
    // Create semantic hash of content
    const normalized = this.normalizeContent(template)
    return crypto.createHash('sha256').update(normalized).digest('hex')
  }
}
```

### Review Queue System

```
class ReviewQueue {
  async submitForReview(templateId: string) {
    // Run automated checks
    const autoChecks = await this.runAutomatedChecks(templateId)
    
    if (!autoChecks.passed) {
      return {
        status: 'rejected',
        reasons: autoChecks.failures,
        canResubmit: true
      }
    }
    
    // Add to manual review queue
    await db.insert('review_queue', {
      template_id: templateId,
      priority: this.calculatePriority(templateId),
      auto_score: autoChecks.score,
      submitted_at: new Date()
    })
    
    // Notify reviewers
    await this.notifyReviewers()
  }
  
  calculatePriority(templateId: string): number {
    const creator = this.getCreator(templateId)
    
    // Verified creators get priority
    if (creator.verified) return 1
    if (creator.previousApprovals > 5) return 2
    return 3
  }
}
```

### Manual Review Interface

```
interface ReviewerDashboard {
  queue: {
    pending: Template[]
    inReview: Template[]
    completed: Template[]
  },
  actions: {
    approve: (templateId: string, notes?: string) => void
    reject: (templateId: string, reasons: string[]) => void
    requestChanges: (templateId: string, changes: string[]) => void
    escalate: (templateId: string, reason: string) => void
  },
  metrics: {
    avgReviewTime: number
    approvalRate: number
    rejectionReasons: Map<string, number>
  }
}
```

### Performance Testing

```
class TemplatePerformance {
  async testTemplate(templateId: string): Promise<PerformanceReport> {
    const template = await this.loadTemplate(templateId)
    
    const metrics = {
      loadTime: await this.measureLoadTime(template),
      renderTime: await this.measureRenderTime(template),
      interactionTime: await this.measureInteraction(template),
      memoryUsage: await this.measureMemory(template)
    }
    
    const score = this.calculatePerformanceScore(metrics)
    
    return {
      passed: score >= 70,
      score,
      metrics,
      recommendations: this.generateRecommendations(metrics)
    }
  }
}
```

## Critical Implementation Notes

- Fast-track approval for trusted creators
- Detailed rejection feedback for improvements
- A/B test quality thresholds
- Regular audits of approved templates
- Community reporting system for issues

## Database Structure

```
CREATE TABLE review_queue (
  id UUID PRIMARY KEY,
  template_id UUID,
  priority INTEGER,
  auto_score DECIMAL(3,2),
  reviewer_id UUID,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE review_results (
  id UUID PRIMARY KEY,
  template_id UUID,
  reviewer_id UUID,
  decision TEXT,
  scores JSONB,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_hashes (
  template_id UUID PRIMARY KEY,
  content_hash TEXT,
  structure_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```