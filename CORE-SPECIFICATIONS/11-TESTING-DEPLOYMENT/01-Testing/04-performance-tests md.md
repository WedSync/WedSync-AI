# 04-performance-tests.md

# Performance Tests Implementation

## What to Build

Implement performance testing to ensure WedSync/WedMe can handle expected load, maintain fast response times, and scale efficiently. Use k6 for load testing and Lighthouse for frontend performance.

## Load Testing with k6

```
// tests/performance/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.01'],             // Error rate under 1%
  },
}

export default function () {
  const BASE_URL = '[https://staging.wedsync.com](https://staging.wedsync.com)'
  
  // Test form submission endpoint
  const formPayload = JSON.stringify({
    form_id: 'test-form',
    data: {
      venue_name: 'Test Venue',
      wedding_date: '2025-06-15',
      guest_count: 120
    }
  })
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TEST_TOKEN}`
    },
  }
  
  const res = [http.post](http://http.post)(`${BASE_URL}/api/forms/submit`, formPayload, params)
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has success message': (r) => r.json('success') === true,
  })
  
  errorRate.add(res.status !== 200)
  sleep(1)
}
```

## API Endpoint Performance Tests

```
// tests/performance/api-performance.js
export default function () {
  const scenarios = [
    {
      name: 'Get Supplier Dashboard',
      method: 'GET',
      endpoint: '/api/supplier/dashboard',
      expectedTime: 200
    },
    {
      name: 'Load Client List',
      method: 'GET',
      endpoint: '/api/clients?limit=50',
      expectedTime: 300
    },
    {
      name: 'Form Builder Data',
      method: 'GET',
      endpoint: '/api/forms/builder-data',
      expectedTime: 150
    },
    {
      name: 'Core Fields Update',
      method: 'POST',
      endpoint: '/api/core-fields',
      payload: { wedding_date: '2025-06-15' },
      expectedTime: 250
    }
  ]
  
  scenarios.forEach(scenario => {
    const start = [Date.now](http://Date.now)()
    const res = scenario.method === 'GET' 
      ? http.get(`${BASE_URL}${scenario.endpoint}`, params)
      : [http.post](http://http.post)(`${BASE_URL}${scenario.endpoint}`, JSON.stringify(scenario.payload), params)
    
    const duration = [Date.now](http://Date.now)() - start
    
    check(res, {
      [`${[scenario.name](http://scenario.name)} - Status 200`]: (r) => r.status === 200,
      [`${[scenario.name](http://scenario.name)} - Under ${scenario.expectedTime}ms`]: () => duration < scenario.expectedTime,
    })
  })
}
```

## Database Query Performance

```
// tests/performance/db-performance.test.ts
import { performance } from 'perf_hooks'
import { supabase } from '@/lib/supabase'

describe('Database Performance', () => {
  it('should fetch supplier with clients in under 100ms', async () => {
    const start = [performance.now](http://performance.now)()
    
    const { data, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        clients(count),
        forms(id, name),
        active_journeys:customer_journeys(count)
      `)
      .eq('id', 'test-supplier-id')
      .single()
    
    const duration = [performance.now](http://performance.now)() - start
    
    expect(error).toBeNull()
    expect(duration).toBeLessThan(100)
  })
  
  it('should update core fields for 100 couples in under 500ms', async () => {
    const updates = Array.from({ length: 100 }, (_, i) => ({
      couple_id: `couple-${i}`,
      fields: { venue_name: 'Test Venue' }
    }))
    
    const start = [performance.now](http://performance.now)()
    
    const promises = [updates.map](http://updates.map)(update => 
      supabase
        .from('core_fields')
        .upsert(update)
    )
    
    await Promise.all(promises)
    const duration = [performance.now](http://performance.now)() - start
    
    expect(duration).toBeLessThan(500)
  })
})
```

## Frontend Performance Testing

```
// tests/performance/lighthouse.ts
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

const runLighthouse = async (url: string) => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
  }
  
  const runnerResult = await lighthouse(url, options)
  await chrome.kill()
  
  return runnerResult.lhr
}

const testPages = [
  { url: '/', minScore: 90 },
  { url: '/supplier/dashboard', minScore: 85 },
  { url: '/forms/builder', minScore: 80 },
  { url: '/wedme/dashboard', minScore: 85 },
]

testPages.forEach(page => {
  test(`${page.url} performance score > ${page.minScore}`, async () => {
    const results = await runLighthouse(`[http://localhost:3000${page.url}`](http://localhost:3000${page.url}`))
    
    expect(results.categories.performance.score * 100).toBeGreaterThan(page.minScore)
    expect(results.audits['first-contentful-paint'].numericValue).toBeLessThan(1500)
    expect(results.audits['largest-contentful-paint'].numericValue).toBeLessThan(2500)
    expect(results.audits['cumulative-layout-shift'].numericValue).toBeLessThan(0.1)
  })
})
```

## Bundle Size Monitoring

```
// tests/performance/bundle-size.js
import { readFileSync } from 'fs'
import { join } from 'path'

const MAX_SIZES = {
  'main.js': 250 * 1024,        // 250KB
  'vendor.js': 150 * 1024,      // 150KB
  'forms.chunk.js': 100 * 1024, // 100KB
  'total': 600 * 1024,          // 600KB total
}

const buildDir = join(process.cwd(), '.next/static/chunks')

Object.entries(MAX_SIZES).forEach(([file, maxSize]) => {
  if (file === 'total') return
  
  const filePath = join(buildDir, file)
  const stats = readFileSync(filePath)
  const size = stats.length
  
  if (size > maxSize) {
    throw new Error(`${file} is ${size} bytes, exceeds limit of ${maxSize} bytes`)
  }
})
```

## Memory Leak Detection

```
// tests/performance/memory-leak.test.ts
import { chromium } from 'playwright'

test('form builder should not leak memory', async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  await page.goto('/forms/builder')
  
  // Get initial memory
  const initialMetrics = await page.evaluate(() => performance.memory)
  
  // Perform actions that might leak memory
  for (let i = 0; i < 100; i++) {
    await [page.click](http://page.click)('[data-testid="add-field"]')
    await [page.click](http://page.click)('[data-testid="remove-field"]')
  }
  
  // Force garbage collection
  await page.evaluate(() => {
    if (global.gc) global.gc()
  })
  
  // Check final memory
  const finalMetrics = await page.evaluate(() => performance.memory)
  
  const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize
  const increasePercentage = (memoryIncrease / initialMetrics.usedJSHeapSize) * 100
  
  expect(increasePercentage).toBeLessThan(10) // Less than 10% increase
  
  await browser.close()
})
```

## Stress Testing Configuration

```
// tests/performance/stress-test.js
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 1000,
      stages: [
        { target: 500, duration: '10s' }, // Spike to 500 requests/sec
        { target: 500, duration: '30s' }, // Hold at 500 requests/sec
        { target: 0, duration: '10s' },   // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],      // Error rate < 5%
    http_req_duration: ['p(99)<1000'],   // 99% of requests < 1s
  },
}
```

## Performance Monitoring Script

```
#!/bin/bash
# scripts/[performance-monitor.sh](http://performance-monitor.sh)

# Run load tests
k6 run tests/performance/load-test.js

# Run Lighthouse tests
npm run test:lighthouse

# Check bundle sizes
node tests/performance/bundle-size.js

# Generate report
node scripts/generate-performance-report.js
```

## Critical Implementation Notes

- Test against staging environment with production-like data
- Run performance tests in CI/CD pipeline
- Set up alerts for performance degradation
- Monitor real user metrics with Web Vitals
- Test with realistic data volumes (1000+ clients, 100+ forms)
- Include database index performance in tests
- Test image loading and optimization