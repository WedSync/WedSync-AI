# Knowledge Base Testing Strategy Documentation

## Overview

This document outlines the comprehensive testing strategy for the WedSync Knowledge Base system, designed to ensure reliability, performance, and user satisfaction for wedding industry professionals and couples. Our testing approach covers all aspects from unit testing to production monitoring.

## Testing Philosophy

### Core Principles

1. **Wedding Day Reliability**: Zero downtime tolerance during peak wedding periods (Saturdays, wedding season)
2. **Performance First**: Sub-500ms search responses under normal load
3. **Mobile-First Testing**: 60% of users access via mobile devices
4. **Multi-Tenant Security**: Complete data isolation between organizations
5. **AI Service Resilience**: Graceful degradation when AI services are unavailable
6. **Accessibility Compliance**: WCAG 2.1 AA standards for all interfaces

### Testing Pyramid Structure

```
        E2E & Visual Tests (10%)
           ↑ High-level workflows
    
      Integration Tests (20%)
         ↑ API & Service interactions
    
        Unit Tests (70%)
           ↑ Component & function testing
```

## Unit Testing Strategy

### Coverage Requirements

**Minimum Thresholds**:
- **Global Minimum**: 90% line coverage
- **Critical Paths**: 95% coverage (auth, security, payments, AI services)
- **Business Logic**: 95% coverage (search algorithms, multi-tenant logic)
- **API Endpoints**: 90% coverage (all routes and error conditions)

### Testing Framework: Vitest

**Configuration** (`vitest.config.ts`):
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        global: { branches: 90, functions: 90, lines: 90, statements: 90 },
        './src/lib/knowledge-base/*': { 
          branches: 95, functions: 95, lines: 95, statements: 95 
        },
        './src/lib/auth/*': { 
          branches: 95, functions: 95, lines: 95, statements: 95 
        }
      }
    }
  }
});
```

### Unit Test Categories

#### 1. Knowledge Base Service Tests

**Core Search Functionality**:
```typescript
// Tests for semantic search, embedding generation, result ranking
describe('KnowledgeBaseService', () => {
  it('should generate embeddings for search queries', async () => {
    const service = new KnowledgeBaseService();
    const embedding = await service.generateEmbedding('wedding photography pricing');
    
    expect(embedding).toHaveLength(1536); // OpenAI ada-002 embedding size
    expect(embedding.every(n => typeof n === 'number')).toBe(true);
  });
  
  it('should handle OpenAI API failures gracefully', async () => {
    mockOpenAI.embeddings.create.mockRejectedValue(new Error('Rate limit exceeded'));
    
    const service = new KnowledgeBaseService();
    const result = await service.searchArticles({
      query: 'test query',
      userType: 'supplier',
      fallbackEnabled: true
    });
    
    expect(result.fallbackUsed).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0); // Fallback text search
  });
});
```

#### 2. Multi-Tenant Security Tests

**Data Isolation Validation**:
```typescript
describe('Multi-Tenant Security', () => {
  it('should isolate organization data completely', async () => {
    const org1Results = await searchService.searchArticles({
      query: 'business tips',
      organizationId: 'org-1',
      userType: 'supplier'
    });
    
    const org2Results = await searchService.searchArticles({
      query: 'business tips', 
      organizationId: 'org-2',
      userType: 'supplier'
    });
    
    // Results should be completely different for different orgs
    const org1Ids = org1Results.articles.map(a => a.id);
    const org2Ids = org2Results.articles.map(a => a.id);
    
    expect(org1Ids.some(id => org2Ids.includes(id))).toBe(false);
  });
});
```

#### 3. React Component Tests

**UI Component Testing with Wedding Context**:
```typescript
describe('KnowledgeBaseInterface Component', () => {
  it('should display supplier-specific search interface', () => {
    render(
      <KnowledgeBaseInterface
        userType="supplier"
        supplierType="photographer"
        organizationId="test-org"
      />
    );
    
    expect(screen.getByPlaceholderText(/search.*photography/i)).toBeInTheDocument();
    expect(screen.getByText(/photography tips/i)).toBeInTheDocument();
  });
  
  it('should handle wedding industry search queries', async () => {
    const mockSearch = jest.fn().mockResolvedValue({
      articles: mockPhotographyArticles,
      total: 2,
      searchTime: 156
    });
    
    render(<KnowledgeBaseInterface onSearch={mockSearch} />);
    
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'wedding day timeline');
    await user.click(screen.getByRole('button', { name: /search/i }));
    
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'wedding day timeline'
      })
    );
  });
});
```

### Performance Unit Tests

**Search Response Time Validation**:
```typescript
describe('Performance Requirements', () => {
  it('should complete searches within 500ms', async () => {
    const startTime = Date.now();
    
    await knowledgeBaseService.searchArticles({
      query: 'wedding vendor coordination',
      userType: 'supplier',
      limit: 20
    });
    
    const searchTime = Date.now() - startTime;
    expect(searchTime).toBeLessThan(500); // Performance requirement
  });
  
  it('should cache embeddings for repeated queries', async () => {
    const query = 'wedding photography pricing strategies';
    
    // First search - should generate embedding
    const result1 = await knowledgeBaseService.searchArticles({
      query,
      userType: 'supplier',
      supplierType: 'photographer'
    });
    
    // Second search - should use cached embedding
    const startTime = Date.now();
    const result2 = await knowledgeBaseService.searchArticles({
      query,
      userType: 'supplier', 
      supplierType: 'photographer'
    });
    const searchTime = Date.now() - startTime;
    
    expect(searchTime).toBeLessThan(100); // Cached search should be much faster
    expect(result2.embeddingCached).toBe(true);
  });
});
```

## Integration Testing Strategy

### API Integration Tests

**Database and Service Integration**:
```typescript
describe('Knowledge Base API Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await seedTestData();
  });
  
  afterEach(async () => {
    await cleanupTestDatabase();
  });
  
  it('should handle full search workflow with real database', async () => {
    const response = await request(app)
      .post('/api/knowledge-base/search')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        query: 'wedding photography business tips',
        userType: 'supplier',
        supplierType: 'photographer',
        organizationId: testOrgId
      });
    
    expect(response.status).toBe(200);
    expect(response.body.articles).toBeDefined();
    expect(response.body.searchTime).toBeLessThan(500);
    expect(response.body.total).toBeGreaterThanOrEqual(0);
  });
});
```

### AI Service Integration Tests

**OpenAI API Integration with Mocking**:
```typescript
describe('AI Service Integration', () => {
  it('should handle OpenAI embedding generation', async () => {
    const mockEmbeddingResponse = {
      data: [{ embedding: new Array(1536).fill(0.1) }],
      model: 'text-embedding-ada-002',
      usage: { total_tokens: 8 }
    };
    
    mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);
    
    const service = new AISearchService();
    const embedding = await service.generateEmbedding('wedding planning tips');
    
    expect(embedding).toHaveLength(1536);
    expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
      model: 'text-embedding-ada-002',
      input: 'wedding planning tips',
      encoding_format: 'float'
    });
  });
  
  it('should fallback to text search when AI service fails', async () => {
    mockOpenAI.embeddings.create.mockRejectedValue(new Error('Service unavailable'));
    
    const searchService = new KnowledgeBaseService();
    const results = await searchService.searchArticles({
      query: 'venue planning',
      userType: 'supplier',
      enableFallback: true
    });
    
    expect(results.fallbackUsed).toBe(true);
    expect(results.articles.length).toBeGreaterThan(0);
    expect(results.searchMethod).toBe('text_search');
  });
});
```

### Supabase Integration Tests

**Database Operations and RLS Testing**:
```typescript
describe('Supabase Database Integration', () => {
  it('should enforce Row Level Security policies', async () => {
    // Test that users can only access their organization's content
    const org1User = createTestUser({ organizationId: 'org-1' });
    const org2User = createTestUser({ organizationId: 'org-2' });
    
    // Create article for org-1
    const { data: article } = await supabase
      .from('kb_articles')
      .insert({
        title: 'Org 1 Secret Article',
        content: 'This should only be visible to org-1',
        organization_id: 'org-1',
        status: 'published'
      })
      .select()
      .single();
    
    // Org-1 user should see the article
    const org1Results = await supabase
      .from('kb_articles')
      .select()
      .eq('id', article.id);
    expect(org1Results.data).toHaveLength(1);
    
    // Org-2 user should NOT see the article
    const org2Results = await supabaseAsUser(org2User)
      .from('kb_articles')
      .select()
      .eq('id', article.id);
    expect(org2Results.data).toHaveLength(0);
  });
});
```

## End-to-End (E2E) Testing Strategy

### Playwright E2E Tests

**Complete User Journeys**:
```typescript
// Wedding vendor search workflow
test('Supplier can search and find relevant articles', async ({ page }) => {
  await page.goto('/login');
  
  // Login as photographer
  await page.fill('[data-testid="email"]', 'photographer@test.com');
  await page.fill('[data-testid="password"]', 'testpass123');
  await page.click('[data-testid="login-button"]');
  
  // Navigate to knowledge base
  await page.click('[data-testid="knowledge-base-nav"]');
  await expect(page).toHaveURL(/.*knowledge-base/);
  
  // Perform search
  await page.fill('[data-testid="search-input"]', 'wedding day photography timeline');
  await page.click('[data-testid="search-button"]');
  
  // Verify results
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  await expect(page.locator('[data-testid="article-card"]').first()).toBeVisible();
  
  // Check search performance indicator
  const searchTime = await page.locator('[data-testid="search-time"]').textContent();
  const timeMs = parseInt(searchTime?.match(/\d+/)?.[0] || '0');
  expect(timeMs).toBeLessThan(500);
  
  // Click on article
  await page.click('[data-testid="article-card"]', { first: true });
  await expect(page.locator('[data-testid="article-content"]')).toBeVisible();
});
```

### Cross-Browser Testing

**Browser Compatibility Matrix**:
- **Desktop**: Chrome 120+, Firefox 115+, Safari 16+, Edge 120+
- **Mobile**: Chrome Mobile, Safari iOS, Samsung Internet
- **Testing Framework**: Playwright with BrowserStack integration

```typescript
// Cross-browser test configuration
const browsers = ['chromium', 'firefox', 'webkit'];

for (const browserName of browsers) {
  test.describe(`Knowledge Base on ${browserName}`, () => {
    test('should work consistently across browsers', async ({ browser }) => {
      const context = await browser.newContext({
        userAgent: getBrowserUserAgent(browserName)
      });
      const page = await context.newPage();
      
      await testKnowledgeBaseWorkflow(page);
    });
  });
}
```

### Visual Regression Testing

**Screenshot Comparisons**:
```typescript
test('Knowledge base interface visual consistency', async ({ page }) => {
  await page.goto('/knowledge-base');
  
  // Test different viewport sizes
  const viewports = [
    { width: 375, height: 667 },  // iPhone SE
    { width: 768, height: 1024 }, // iPad
    { width: 1920, height: 1080 } // Desktop
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page).toHaveScreenshot(`knowledge-base-${viewport.width}x${viewport.height}.png`);
  }
});
```

## Performance Testing Strategy

### Load Testing with K6

**Wedding Season Peak Load Simulation**:
```javascript
// k6 script for knowledge base load testing
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 500 },   // Peak wedding season load
    { duration: '2m', target: 1000 },  // Saturday wedding day spike
    { duration: '5m', target: 1000 },  // Sustain peak
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failures
  }
};

export default function () {
  const weddingQueries = [
    'wedding photography pricing',
    'venue coordination timeline',
    'client communication tips',
    'emergency wedding protocols',
    'vendor contract templates'
  ];
  
  const query = weddingQueries[Math.floor(Math.random() * weddingQueries.length)];
  
  const response = http.post(`${BASE_URL}/api/knowledge-base/search`, 
    JSON.stringify({
      query,
      userType: Math.random() > 0.7 ? 'couple' : 'supplier',
      supplierType: 'photographer',
      limit: 20
    }),
    {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.TEST_TOKEN}`
      }
    }
  );
  
  check(response, {
    'search returns 200': (r) => r.status === 200,
    'search under 500ms': (r) => r.timings.duration < 500,
    'returns articles': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body.articles);
    }
  });
  
  sleep(Math.random() * 2 + 1); // 1-3 second think time
}
```

### Database Performance Testing

**Query Performance Monitoring**:
```sql
-- Performance monitoring queries for testing
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename = 'kb_articles';

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'kb_articles';

-- Monitor query performance
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements 
WHERE query LIKE '%kb_articles%'
ORDER BY mean_exec_time DESC;
```

## Security Testing Strategy

### Authentication and Authorization Testing

**Token Validation and Permissions**:
```typescript
describe('Security Testing', () => {
  it('should reject requests without valid authentication', async () => {
    const response = await request(app)
      .post('/api/knowledge-base/search')
      .send({ query: 'test' });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/unauthorized/i);
  });
  
  it('should enforce organization-level access controls', async () => {
    const org1Token = generateToken({ userId: 'user1', organizationId: 'org-1' });
    const org2Token = generateToken({ userId: 'user2', organizationId: 'org-2' });
    
    // Create org-1 specific article
    await createTestArticle({ organizationId: 'org-1', title: 'Org 1 Secret' });
    
    // User from org-1 should see it
    const org1Response = await request(app)
      .get('/api/knowledge-base/search')
      .set('Authorization', `Bearer ${org1Token}`)
      .query({ q: 'Org 1 Secret' });
    
    expect(org1Response.body.articles.length).toBeGreaterThan(0);
    
    // User from org-2 should NOT see it  
    const org2Response = await request(app)
      .get('/api/knowledge-base/search')
      .set('Authorization', `Bearer ${org2Token}`)
      .query({ q: 'Org 1 Secret' });
    
    expect(org2Response.body.articles.length).toBe(0);
  });
});
```

### Input Validation and Sanitization Testing

**SQL Injection and XSS Prevention**:
```typescript
describe('Input Validation Security', () => {
  it('should sanitize search queries to prevent injection', async () => {
    const maliciousQueries = [
      "'; DROP TABLE kb_articles; --",
      '<script>alert("xss")</script>',
      '../../etc/passwd',
      'UNION SELECT * FROM users',
    ];
    
    for (const query of maliciousQueries) {
      const response = await request(app)
        .post('/api/knowledge-base/search')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ query, userType: 'supplier' });
      
      // Should either reject or sanitize, but not fail
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.articles).toBeDefined();
        expect(Array.isArray(response.body.articles)).toBe(true);
      }
    }
  });
});
```

## Accessibility Testing Strategy

### WCAG 2.1 AA Compliance Testing

**Automated Accessibility Testing**:
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Testing', () => {
  it('should meet WCAG 2.1 AA standards', async () => {
    render(
      <KnowledgeBaseInterface
        userType="supplier"
        supplierType="photographer"
      />
    );
    
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
  
  it('should support keyboard navigation', async () => {
    render(<KnowledgeBaseInterface userType="couple" />);
    
    const searchInput = screen.getByRole('textbox');
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Test keyboard navigation
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
    
    fireEvent.keyDown(searchInput, { key: 'Tab' });
    expect(document.activeElement).toBe(searchButton);
    
    fireEvent.keyDown(searchButton, { key: 'Enter' });
    // Should trigger search
  });
  
  it('should provide appropriate ARIA labels', () => {
    render(<KnowledgeBaseInterface userType="supplier" />);
    
    const searchInput = screen.getByRole('textbox');
    expect(searchInput).toHaveAttribute('aria-label');
    expect(searchInput).toHaveAttribute('aria-describedby');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toHaveAttribute('aria-label');
  });
});
```

### Screen Reader Testing

**Automated Screen Reader Simulation**:
```typescript
describe('Screen Reader Compatibility', () => {
  it('should announce search results to screen readers', async () => {
    const mockAnnounce = jest.fn();
    
    render(
      <KnowledgeBaseInterface
        userType="supplier"
        onAnnouncement={mockAnnounce}
      />
    );
    
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'wedding tips');
    await user.click(screen.getByRole('button', { name: /search/i }));
    
    await waitFor(() => {
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringMatching(/found \d+ results/i)
      );
    });
  });
});
```

## Mobile Testing Strategy

### Responsive Design Testing

**Multi-Device Testing**:
```typescript
describe('Mobile Responsiveness', () => {
  const mobileViewports = [
    { width: 320, height: 568 }, // iPhone SE
    { width: 375, height: 667 }, // iPhone 8
    { width: 414, height: 896 }, // iPhone XR
    { width: 360, height: 640 }, // Android
  ];
  
  mobileViewports.forEach(viewport => {
    it(`should work on ${viewport.width}x${viewport.height} viewport`, () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width,
      });
      
      render(<KnowledgeBaseInterface userType="couple" />);
      
      // Check mobile-specific features
      expect(screen.getByTestId('mobile-search-interface')).toBeVisible();
      expect(screen.getByTestId('voice-search-button')).toBeVisible();
      
      // Check touch targets are large enough
      const touchTargets = screen.getAllByRole('button');
      touchTargets.forEach(target => {
        const style = window.getComputedStyle(target);
        const height = parseInt(style.height);
        const width = parseInt(style.width);
        
        expect(height).toBeGreaterThanOrEqual(44); // iOS minimum
        expect(width).toBeGreaterThanOrEqual(44);
      });
    });
  });
});
```

### Touch Interaction Testing

**Gesture and Touch Testing**:
```typescript
describe('Touch Interactions', () => {
  it('should handle swipe gestures for article navigation', async () => {
    const user = userEvent.setup();
    
    render(<ArticleViewer article={mockArticle} />);
    
    const articleContent = screen.getByTestId('article-content');
    
    // Simulate swipe left
    fireEvent.touchStart(articleContent, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    
    fireEvent.touchMove(articleContent, {
      touches: [{ clientX: 50, clientY: 100 }]
    });
    
    fireEvent.touchEnd(articleContent, {
      changedTouches: [{ clientX: 50, clientY: 100 }]
    });
    
    // Should navigate to next article
    await waitFor(() => {
      expect(screen.getByText('Next Article Title')).toBeVisible();
    });
  });
});
```

## Continuous Integration Testing

### GitHub Actions Workflow

```yaml
# .github/workflows/knowledge-base-tests.yml
name: Knowledge Base Tests

on:
  push:
    paths:
      - 'src/lib/knowledge-base/**'
      - 'src/components/knowledge-base/**'
      - 'src/app/api/knowledge-base/**'
  pull_request:
    paths:
      - 'src/lib/knowledge-base/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:knowledge-base
      - run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm start &
      - run: sleep 10
      - run: npm run test:performance
        env:
          TARGET_URL: http://localhost:3000
```

## Test Data Management

### Test Database Seeding

**Realistic Wedding Industry Test Data**:
```typescript
// test-utils/seed-knowledge-base.ts
export async function seedKnowledgeBaseTestData() {
  const testArticles = [
    {
      title: 'Wedding Photography Pricing Strategy 2025',
      content: generateRealisticArticleContent('photography', 'pricing'),
      category: 'Business',
      tags: ['photography', 'pricing', 'business'],
      target_audience: ['supplier'],
      supplier_types: ['photographer'],
      difficulty: 'intermediate',
      read_time: 420, // 7 minutes
      status: 'published'
    },
    {
      title: 'Venue Coordination Timeline Template',
      content: generateRealisticArticleContent('venue', 'coordination'),
      category: 'Planning',
      tags: ['venue', 'timeline', 'coordination'],
      target_audience: ['supplier'],
      supplier_types: ['venue', 'coordinator'],
      difficulty: 'beginner',
      read_time: 300, // 5 minutes
      status: 'published'
    },
    // ... more realistic test data
  ];
  
  for (const article of testArticles) {
    await supabase.from('kb_articles').insert(article);
  }
}

function generateRealisticArticleContent(category: string, topic: string): string {
  // Generate realistic article content based on category and topic
  const templates = {
    photography: {
      pricing: `# Wedding Photography Pricing Strategy
      
      Setting the right price for your wedding photography services...
      
      ## Market Analysis
      Research shows that couples typically allocate 10-15% of their wedding budget...
      
      ## Pricing Models
      1. Package Pricing
      2. Hourly Rates  
      3. Value-Based Pricing
      
      ## Implementation Tips
      - Start with market research in your area
      - Calculate your true cost of doing business
      - Factor in your experience and unique value proposition
      `
    },
    // ... more content templates
  };
  
  return templates[category]?.[topic] || 'Default test content';
}
```

## Monitoring and Alerting

### Production Monitoring Tests

**Health Check Validation**:
```typescript
describe('Production Health Checks', () => {
  it('should validate knowledge base health endpoint', async () => {
    const response = await request(app).get('/api/health/knowledge-base');
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'healthy',
      checks: {
        database: 'connected',
        openai: 'available',
        redis: 'connected',
        search_performance: 'optimal'
      },
      metrics: {
        avg_search_time: expect.any(Number),
        cache_hit_rate: expect.any(Number),
        error_rate: expect.any(Number)
      }
    });
    
    // Verify performance metrics are within acceptable ranges
    expect(response.body.metrics.avg_search_time).toBeLessThan(500);
    expect(response.body.metrics.cache_hit_rate).toBeGreaterThan(0.8);
    expect(response.body.metrics.error_rate).toBeLessThan(0.01);
  });
});
```

### Error Tracking and Analytics

**Error Handling Validation**:
```typescript
describe('Error Tracking', () => {
  it('should track and report search failures', async () => {
    const mockLogger = jest.fn();
    const mockAnalytics = jest.fn();
    
    // Force a search failure
    mockOpenAI.embeddings.create.mockRejectedValue(new Error('API quota exceeded'));
    
    const service = new KnowledgeBaseService({ logger: mockLogger, analytics: mockAnalytics });
    
    await expect(service.searchArticles({
      query: 'test query',
      userType: 'supplier',
      enableFallback: false // Force failure
    })).rejects.toThrow();
    
    // Verify error was logged and tracked
    expect(mockLogger).toHaveBeenCalledWith('error', expect.objectContaining({
      error: 'API quota exceeded',
      query: 'test query',
      userType: 'supplier'
    }));
    
    expect(mockAnalytics).toHaveBeenCalledWith('knowledge_base_error', expect.any(Object));
  });
});
```

## Test Reporting and Metrics

### Coverage Reports

**Automated Coverage Analysis**:
- **HTML Reports**: Generated after each test run for detailed line-by-line coverage
- **Badge Integration**: Coverage badges in README and PR comments
- **Trend Tracking**: Coverage percentage trends over time
- **Critical Path Alerts**: Notifications when critical code paths drop below thresholds

### Performance Benchmarking

**Automated Performance Regression Detection**:
```typescript
// performance-tests/benchmark.test.ts
describe('Performance Benchmarks', () => {
  it('should maintain search performance standards', async () => {
    const benchmarks = [];
    
    // Run multiple search scenarios
    const scenarios = [
      { query: 'wedding photography', userType: 'supplier', supplierType: 'photographer' },
      { query: 'venue planning tips', userType: 'supplier', supplierType: 'venue' },
      { query: 'budget wedding ideas', userType: 'couple' },
    ];
    
    for (const scenario of scenarios) {
      const startTime = performance.now();
      await knowledgeBaseService.searchArticles(scenario);
      const endTime = performance.now();
      
      benchmarks.push({
        scenario: scenario.query,
        duration: endTime - startTime
      });
    }
    
    // Verify all searches meet performance requirements
    benchmarks.forEach(benchmark => {
      expect(benchmark.duration).toBeLessThan(500);
    });
    
    // Calculate and report average performance
    const avgDuration = benchmarks.reduce((sum, b) => sum + b.duration, 0) / benchmarks.length;
    console.log(`Average search duration: ${avgDuration.toFixed(2)}ms`);
    
    // Fail if performance degrades significantly
    expect(avgDuration).toBeLessThan(300); // Target: sub-300ms average
  });
});
```

## Testing Best Practices

### 1. Test Naming Conventions

**Descriptive Test Names**:
```typescript
// ✅ Good: Descriptive and specific
it('should return photography articles when supplier searches for "wedding photos"', () => {});

// ❌ Bad: Vague and unhelpful  
it('should return results', () => {});
```

### 2. Test Data Management

**Isolated and Deterministic Tests**:
```typescript
// ✅ Good: Each test creates its own data
beforeEach(async () => {
  await cleanDatabase();
  await seedTestData();
});

// ❌ Bad: Tests depend on shared state
const sharedArticle = createTestArticle(); // Used across multiple tests
```

### 3. Mock Strategy

**Strategic Mocking**:
```typescript
// ✅ Good: Mock external services, test our logic
jest.mock('openai', () => ({
  embeddings: {
    create: jest.fn().mockResolvedValue(mockEmbeddingResponse)
  }
}));

// ❌ Bad: Over-mocking hides real bugs
jest.mock('../knowledge-base-service'); // Mocking the code we want to test
```

### 4. Wedding Industry Context

**Industry-Realistic Testing**:
```typescript
// ✅ Good: Use real wedding industry terms and scenarios
const testScenarios = [
  { query: 'outdoor ceremony rain backup', userType: 'couple' },
  { query: 'vendor timeline coordination', userType: 'supplier', supplierType: 'coordinator' },
  { query: 'client questionnaire templates', userType: 'supplier', supplierType: 'photographer' }
];

// ❌ Bad: Generic test data that doesn't reflect real usage
const testScenarios = [
  { query: 'foo bar', userType: 'user' },
  { query: 'test search', userType: 'admin' }
];
```

## Conclusion

This comprehensive testing strategy ensures the WedSync Knowledge Base system meets the demanding requirements of the wedding industry. By combining thorough unit testing, realistic integration testing, comprehensive E2E validation, and continuous performance monitoring, we maintain the high reliability standards essential for wedding professionals and couples during their most important moments.

**Key Success Metrics**:
- **>90% Test Coverage**: Comprehensive code coverage across all components
- **<500ms Search Performance**: Fast response times under normal load  
- **Zero Wedding Day Failures**: Perfect reliability during peak periods
- **100% Accessibility Compliance**: WCAG 2.1 AA standards met
- **Cross-Platform Consistency**: Identical experience across all devices and browsers

Regular review and updates of this testing strategy ensure we continue meeting evolving user needs and maintain our position as the most reliable wedding industry platform.