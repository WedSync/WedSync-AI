/**
 * WS-173 Team D - Mobile Performance Testing Configuration
 * Configuration for mobile performance testing and validation
 */

export const MOBILE_PERFORMANCE_CONFIG = {
  // Performance thresholds based on WS-173 requirements
  thresholds: {
    // Critical success criteria
    LOAD_TIME: 3000,        // WedMe app loads < 3s on mobile networks
    TOUCH_RESPONSE: 100,    // Touch interactions < 100ms response time
    
    // Core Web Vitals for 3G
    FCP: 1800,              // First Contentful Paint < 1.8s on 3G
    LCP: 2500,              // Largest Contentful Paint < 2.5s on 3G
    FID: 100,               // First Input Delay < 100ms
    CLS: 0.1,               // Cumulative Layout Shift < 0.1
    TTI: 3000,              // Time to Interactive < 3.0s on 3G
    
    // Mobile-specific metrics
    INP: 200,               // Interaction to Next Paint < 200ms
    TBT: 300,               // Total Blocking Time < 300ms
    MEMORY_USAGE: 50 * 1024 * 1024, // Max 50MB memory usage
    
    // Network and caching
    CACHE_ACCESS_TIME: 50,  // Cache access < 50ms
    OFFLINE_SYNC_TIME: 10000, // Offline sync < 10s
  },
  
  // Test devices for cross-platform validation
  devices: [
    {
      name: 'iPhone 12',
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
    },
    {
      name: 'iPhone SE',
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
    },
    {
      name: 'Pixel 5',
      viewport: { width: 393, height: 851 },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
    },
    {
      name: 'Galaxy S21',
      viewport: { width: 384, height: 854 },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
    },
  ],
  
  // Network conditions for testing
  networkConditions: {
    '3G': {
      download: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      upload: 0.75 * 1024 * 1024 / 8,  // 0.75 Mbps
      latency: 300,                     // 300ms RTT
    },
    'Slow 3G': {
      download: 0.5 * 1024 * 1024 / 8, // 0.5 Mbps
      upload: 0.25 * 1024 * 1024 / 8,  // 0.25 Mbps
      latency: 400,                     // 400ms RTT
    },
    'Fast 3G': {
      download: 2.5 * 1024 * 1024 / 8, // 2.5 Mbps
      upload: 1.5 * 1024 * 1024 / 8,   // 1.5 Mbps
      latency: 200,                     // 200ms RTT
    },
  },
  
  // Test URLs and endpoints
  endpoints: {
    home: 'http://localhost:3000',
    dashboard: 'http://localhost:3000/dashboard',
    budget: 'http://localhost:3000/budget',
    schedule: 'http://localhost:3000/schedule',
    mobile: 'http://localhost:3000/mobile',
  },
  
  // Mobile test selectors
  selectors: {
    // Mobile performance indicators
    performanceIndicator: '[data-testid="mobile-performance-indicator"]',
    offlineIndicator: '[data-testid="offline-indicator"]',
    syncSuccess: '[data-testid="sync-success"]',
    
    // Mobile components
    expenseAddButton: '[data-testid="mobile-expense-add"]',
    expenseAmountInput: 'input[name="amount"]',
    expenseSaveButton: '[data-testid="mobile-save-expense"]',
    budgetOverviewTab: '[data-testid="mobile-budget-overview-tab"]',
    scheduleItem: '[data-testid="mobile-schedule-item"]',
    
    // Touch targets
    touchButtons: 'button, [role="button"], a[href]',
    inputFields: 'input, textarea, select',
    
    // Performance monitoring
    performanceMetrics: '[data-testid="performance-metrics"]',
    memoryUsage: '[data-testid="memory-usage"]',
  },
  
  // Accessibility requirements
  accessibility: {
    minTouchTargetSize: 44, // pixels
    minContrastRatio: 4.5,  // WCAG AA
    maxFontSize: 18,        // pixels for mobile
    minFontSize: 14,        // pixels for mobile
  },
  
  // Test scenarios
  scenarios: {
    quickEntry: {
      name: 'Quick Expense Entry on Mobile',
      steps: [
        { action: 'navigate', target: '/dashboard' },
        { action: 'tap', selector: '[data-testid="mobile-expense-add"]' },
        { action: 'fill', selector: 'input[name="amount"]', value: '250.00' },
        { action: 'fill', selector: 'input[name="description"]', value: 'Venue payment' },
        { action: 'tap', selector: '[data-testid="mobile-save-expense"]' },
      ],
      maxTime: 10000, // 10 seconds
    },
    
    scheduleCheck: {
      name: 'Schedule Check on Mobile',
      steps: [
        { action: 'navigate', target: '/schedule' },
        { action: 'scroll', direction: 'down', pixels: 300 },
        { action: 'tap', selector: '[data-testid="mobile-schedule-item"]' },
        { action: 'wait', duration: 1000 },
        { action: 'tap', selector: '[data-testid="schedule-back"]' },
      ],
      maxTime: 8000, // 8 seconds
    },
    
    offlineSync: {
      name: 'Offline to Online Sync',
      steps: [
        { action: 'navigate', target: '/dashboard' },
        { action: 'setOffline', value: true },
        { action: 'tap', selector: '[data-testid="mobile-expense-add"]' },
        { action: 'fill', selector: 'input[name="amount"]', value: '150.00' },
        { action: 'tap', selector: '[data-testid="mobile-save-expense"]' },
        { action: 'setOffline', value: false },
        { action: 'waitFor', selector: '[data-testid="sync-success"]' },
      ],
      maxTime: 15000, // 15 seconds
    },
  },
  
  // Performance monitoring queries
  performanceQueries: {
    // Core Web Vitals
    webVitals: `
      new Promise((resolve) => {
        const vitals = {};
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.FID = entry.processingStart - entry.startTime;
            }
          });
        });
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input'] });
        setTimeout(() => resolve(vitals), 5000);
      })
    `,
    
    // Memory usage
    memoryUsage: `
      performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    `,
    
    // Network information
    networkInfo: `
      navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : null
    `,
    
    // Cache status
    cacheStatus: `
      'caches' in window ? 
        caches.keys().then(names => ({ available: true, cacheNames: names })) :
        { available: false }
    `,
    
    // Service Worker status
    serviceWorkerStatus: `
      'serviceWorker' in navigator ? {
        registered: !!navigator.serviceWorker.controller,
        state: navigator.serviceWorker.controller?.state
      } : { registered: false }
    `,
  },
  
  // Test reporting
  reporting: {
    outputDir: './test-results/mobile-performance',
    screenshotDir: './test-results/mobile-performance/screenshots',
    metricsFile: './test-results/mobile-performance/metrics.json',
    reportFile: './test-results/mobile-performance/ws-173-mobile-performance-report.html',
  },
};

export default MOBILE_PERFORMANCE_CONFIG;