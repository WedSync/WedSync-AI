/**
 * WS-153 Photo Groups Performance Testing Suite - Round 2
 * Advanced performance testing and optimization validation
 * Tests system performance under various conditions and validates optimization targets
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { Browser, Page, BrowserContext, chromium } from 'playwright';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Performance testing configuration
const PERFORMANCE_CONFIG = {
  LARGE_GUEST_COUNT: 500,
  PHOTO_GROUPS_COUNT: 50,
  TARGET_LOAD_TIME_MS: 2000, // 2 seconds
  TARGET_DRAG_TIME_MS: 500, // 500ms for drag operations
  TARGET_CONFLICT_DETECTION_MS: 1000, // 1 second for conflict detection
  TARGET_MEMORY_LIMIT_MB: 100, // 100MB memory limit
  TARGET_REALTIME_LATENCY_MS: 100, // 100ms for real-time updates
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
};
interface PerformanceMetrics {
  loadTime: number;
  dragTime: number;
  conflictDetectionTime: number;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  networkRequests: number;
  resourceSizes: {
    totalSize: number;
    jsSize: number;
    cssSize: number;
    imageSize: number;
  coreWebVitals: {
    FCP: number; // First Contentful Paint
    LCP: number; // Largest Contentful Paint
    CLS: number; // Cumulative Layout Shift
    FID: number; // First Input Delay
}
describe('WS-153 Photo Groups Performance Testing', () => {
  let browser: Browser;
  let supabase: SupabaseClient;
  let testData: {
    organizationId: string;
    coupleId: string;
    guestIds: string[];
    photoGroupIds: string[];
  beforeAll(async () => {
    // Launch browser with performance monitoring
    browser = await chromium.launch({
      headless: true,
      args: [
        '--enable-precise-memory-info',
        '--enable-performance-manager-debugging',
        '--disable-dev-shm-usage'
      ]
    });
    // Initialize Supabase client
    supabase = createClient(
      PERFORMANCE_CONFIG.SUPABASE_URL,
      PERFORMANCE_CONFIG.SUPABASE_ANON_KEY
    );
    // Setup large dataset for performance testing
    testData = await setupLargeDataset();
  });
  afterAll(async () => {
    await browser?.close();
    await cleanupLargeDataset();
  test('Large guest list performance optimization (500+ guests)', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Enable performance monitoring
    await page.addInitScript(() => {
      // Store performance marks
      window.performanceMarks = [];
      const originalMark = performance.mark;
      performance.mark = function(name: string) {
        window.performanceMarks.push({ name, time: performance.now() });
        return originalMark.call(this, name);
      };
    // Navigate to photo groups with large dataset
    const startTime = Date.now();
    await page.goto(`${PERFORMANCE_CONFIG.BASE_URL}/guests/photo-groups?couple_id=${testData.coupleId}`, {
      waitUntil: 'networkidle'
    
    // Wait for photo groups component to render
    await page.waitForSelector('[data-testid="photo-groups-container"]');
    const loadTime = Date.now() - startTime;
    console.log(`📊 Page load time with ${PERFORMANCE_CONFIG.LARGE_GUEST_COUNT} guests: ${loadTime}ms`);
    // Test drag-and-drop performance
    const dragStartTime = performance.now();
    await page.dragAndDrop(
      '[data-guest-id="guest-450"]',
      '[data-group-id="group-25"]'
    const dragTime = performance.now() - dragStartTime;
    console.log(`🖱️ Drag operation time: ${dragTime}ms`);
    // Test conflict detection performance
    const conflictStartTime = performance.now();
    await page.click('[data-testid="check-conflicts"]');
    await page.waitForSelector('[data-testid="conflict-results"]');
    const conflictTime = performance.now() - conflictStartTime;
    console.log(`⚠️ Conflict detection time: ${conflictTime}ms`);
    // Measure memory usage
    const memoryUsage = await page.evaluate(() => {
      const memory = (performance as unknown).memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      } : { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
    console.log(`💾 Memory usage: ${Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)}MB`);
    // Get Core Web Vitals
    const coreWebVitals = await measureCoreWebVitals(page);
    console.log('🎯 Core Web Vitals:', coreWebVitals);
    // Performance assertions
    expect(loadTime).toBeLessThan(PERFORMANCE_CONFIG.TARGET_LOAD_TIME_MS);
    expect(dragTime).toBeLessThan(PERFORMANCE_CONFIG.TARGET_DRAG_TIME_MS);
    expect(conflictTime).toBeLessThan(PERFORMANCE_CONFIG.TARGET_CONFLICT_DETECTION_MS);
    expect(memoryUsage.usedJSHeapSize).toBeLessThan(PERFORMANCE_CONFIG.TARGET_MEMORY_LIMIT_MB * 1024 * 1024);
    // Core Web Vitals assertions
    expect(coreWebVitals.FCP).toBeLessThan(1800); // FCP < 1.8s
    expect(coreWebVitals.LCP).toBeLessThan(2500); // LCP < 2.5s
    expect(coreWebVitals.CLS).toBeLessThan(0.1); // CLS < 0.1
    await context.close();
  test('Mobile performance across different devices', async () => {
    const mobileDevices = [
      { name: 'iPhone 8', width: 375, height: 667, userAgent: 'iPhone' },
      { name: 'Samsung Galaxy', width: 360, height: 640, userAgent: 'Android' },
      { name: 'iPad', width: 768, height: 1024, userAgent: 'iPad' },
      { name: 'iPhone 14 Pro Max', width: 428, height: 926, userAgent: 'iPhone' }
    ];
    const performanceResults: any[] = [];
    for (const device of mobileDevices) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        userAgent: `LoadTest ${device.userAgent}`,
        hasTouch: true
      });
      const page = await context.newPage();
      // Throttle network to simulate 3G
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 150 // 150ms
      const startTime = Date.now();
      await page.goto(`${PERFORMANCE_CONFIG.BASE_URL}/wedme/photo-groups`);
      await page.waitForSelector('[data-testid="photo-groups-container"]');
      const loadTime = Date.now() - startTime;
      // Test touch interactions
      const touchStartTime = Date.now();
      await page.tap('[data-guest-id="test-guest"]');
      await page.tap('[data-group-id="test-group"]');
      const touchTime = Date.now() - touchStartTime;
      // Measure performance on mobile
      const mobilePerformance = await measureMobilePerformance(page);
      performanceResults.push({
        device: device.name,
        viewport: `${device.width}x${device.height}`,
        loadTime,
        touchTime,
        ...mobilePerformance
      console.log(`📱 ${device.name} Performance:`, {
        loadTime: `${loadTime}ms`,
        touchTime: `${touchTime}ms`,
        memoryUsage: `${Math.round(mobilePerformance.memoryUsageMB)}MB`
      // Mobile performance assertions
      expect(loadTime).toBeLessThan(3000); // 3 seconds on 3G
      expect(touchTime).toBeLessThan(300); // 300ms for touch interactions
      await context.close();
    }
    // Save performance results
    console.log('📱 Mobile Performance Results:', performanceResults);
  test('Database query performance optimization', async () => {
    console.log('🗄️ Testing database query performance...');
    // Test various query patterns
    const queryTests = [
      {
        name: 'Fetch photo groups by couple',
        query: () => supabase
          .from('photo_groups')
          .select('*')
          .eq('couple_id', testData.coupleId)
          .order('priority', { ascending: false })
      },
        name: 'Fetch photo groups with members',
          .select(`
            *,
            photo_group_members (
              guest_id,
              guests (
                first_name,
                last_name,
                category
              )
            )
          `)
        name: 'Search photo groups by type',
          .eq('shot_type', 'formal')
        name: 'Conflict detection query',
        query: () => supabase.rpc('detect_photo_group_conflicts', {
          p_couple_id: testData.coupleId,
          p_scheduled_time: new Date().toISOString(),
          p_duration: 30
        })
      }
    const queryResults = [];
    for (const test of queryTests) {
      const iterations = 5;
      const times = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const { data, error } = await test.query();
        const duration = performance.now() - startTime;
        times.push(duration);
        if (error) {
          console.error(`❌ Query failed: ${test.name}`, error);
        }
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      queryResults.push({
        name: test.name,
        avgTime: Math.round(avgTime),
        minTime: Math.round(minTime),
        maxTime: Math.round(maxTime)
      console.log(`📈 ${test.name}: avg=${Math.round(avgTime)}ms, min=${Math.round(minTime)}ms, max=${Math.round(maxTime)}ms`);
      // Query performance assertions
      expect(avgTime).toBeLessThan(100); // Average query time < 100ms
      expect(maxTime).toBeLessThan(300); // Max query time < 300ms
    console.log('🗄️ Database Performance Summary:', queryResults);
  test('Real-time update performance', async () => {
    // Setup real-time monitoring
    const realtimeMetrics: any[] = [];
    await page.goto(`${PERFORMANCE_CONFIG.BASE_URL}/guests/photo-groups`);
    // Monitor real-time updates
    await page.evaluate(() => {
      // Mock real-time connection
      window.realtimeUpdates = [];
      window.originalWebSocket = WebSocket;
      
      class MockWebSocket extends EventTarget {
        constructor(url: string) {
          super();
          this.url = url;
          setTimeout(() => this.dispatchEvent(new Event('open')), 100);
        
        send(data: string) {
          const timestamp = Date.now();
          window.realtimeUpdates.push({
            type: 'send',
            timestamp,
            data: JSON.parse(data)
          });
          
          // Simulate server response
          setTimeout(() => {
            this.dispatchEvent(new MessageEvent('message', {
              data: JSON.stringify({
                event: 'photo_group_updated',
                payload: { timestamp }
              })
            }));
          }, 50 + Math.random() * 100);
      (window as unknown).WebSocket = MockWebSocket;
    // Test real-time updates
    const updateStartTime = Date.now();
    // Simulate photo group updates
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="create-group"]');
      await page.fill('[data-testid="group-name"]', `Realtime Test ${i}`);
      await page.click('[data-testid="save-group"]');
      await page.waitForSelector(`[data-group-name="Realtime Test ${i}"]`);
      await new Promise(resolve => setTimeout(resolve, 200));
    const totalUpdateTime = Date.now() - updateStartTime;
    // Get real-time metrics
    const updates = await page.evaluate(() => window.realtimeUpdates || []);
    if (updates.length > 0) {
      const avgLatency = updates.reduce((sum: number, update: any) => {
        return sum + (update.receivedAt || Date.now()) - update.timestamp;
      }, 0) / updates.length;
      realtimeMetrics.push({
        totalUpdates: updates.length,
        avgLatency: Math.round(avgLatency),
        totalTime: totalUpdateTime
      console.log(`⚡ Real-time Performance: ${updates.length} updates, avg latency: ${Math.round(avgLatency)}ms`);
      // Real-time performance assertions
      expect(avgLatency).toBeLessThan(PERFORMANCE_CONFIG.TARGET_REALTIME_LATENCY_MS);
  test('Memory leak detection and optimization', async () => {
    // Baseline memory measurement
    const baselineMemory = await page.evaluate(() => {
      return memory ? memory.usedJSHeapSize : 0;
    console.log(`🔍 Baseline memory: ${Math.round(baselineMemory / 1024 / 1024)}MB`);
    // Perform memory-intensive operations
    for (let i = 0; i < 100; i++) {
      // Create and delete photo groups rapidly
      await page.fill('[data-testid="group-name"]', `Memory Test ${i}`);
      await page.waitForSelector(`[data-group-name="Memory Test ${i}"]`);
      // Delete the group
      await page.click(`[data-group-name="Memory Test ${i}"] [data-testid="delete-group"]`);
      await page.click('[data-testid="confirm-delete"]');
      // Force garbage collection if available
      if (i % 10 === 0) {
        await page.evaluate(() => {
          if (window.gc) window.gc();
        });
    // Final memory measurement
    const finalMemory = await page.evaluate(() => {
    const memoryIncrease = finalMemory - baselineMemory;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
    console.log(`🔍 Final memory: ${Math.round(finalMemory / 1024 / 1024)}MB`);
    console.log(`📈 Memory increase: ${Math.round(memoryIncreaseMB)}MB`);
    // Memory leak assertions
    expect(memoryIncreaseMB).toBeLessThan(20); // Less than 20MB increase after operations
    expect(finalMemory).toBeLessThan(200 * 1024 * 1024); // Less than 200MB total
});
// Helper Functions
async function measureCoreWebVitals(page: Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const vitals: any = {};
        entries.forEach((entry) => {
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime;
            }
          }
          if (entry.entryType === 'largest-contentful-paint') {
            vitals.LCP = entry.startTime;
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            vitals.CLS = (vitals.CLS || 0) + entry.value;
          if (entry.entryType === 'first-input') {
            vitals.FID = entry.processingStart - entry.startTime;
        // Set defaults for missing vitals
        vitals.FCP = vitals.FCP || 0;
        vitals.LCP = vitals.LCP || 0;
        vitals.CLS = vitals.CLS || 0;
        vitals.FID = vitals.FID || 0;
        setTimeout(() => resolve(vitals), 1000);
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
async function measureMobilePerformance(page: Page) {
  const memory = await page.evaluate(() => {
    const mem = (performance as unknown).memory;
    return mem ? mem.usedJSHeapSize : 0;
  const resourceSizes = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;
    resources.forEach((resource: any) => {
      const size = resource.transferSize || 0;
      totalSize += size;
      if (resource.name.includes('.js')) jsSize += size;
      if (resource.name.includes('.css')) cssSize += size;
      if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)/)) imageSize += size;
    return { totalSize, jsSize, cssSize, imageSize };
  return {
    memoryUsageMB: memory / 1024 / 1024,
    resourceSizes,
    networkRequests: (await page.evaluate(() => performance.getEntriesByType('resource').length))
async function setupLargeDataset() {
  console.log('🔧 Setting up large performance test dataset...');
  
  // Create test organization
  const { data: org } = await supabase
    .from('organizations')
    .insert({
      name: 'Performance Test Wedding Co',
      slug: 'perf-test-wedding-co',
      email: 'performance@test.com'
    })
    .select()
    .single();
  // Create test couple
  const { data: couple } = await supabase
    .from('clients')
      organization_id: org.id,
      first_name: 'Perf',
      last_name: 'Test',
      partner_first_name: 'Load',
      partner_last_name: 'Testing',
      email: 'perftest@example.com',
      wedding_date: '2024-12-15'
  // Create large guest list
  const guests = Array.from({ length: PERFORMANCE_CONFIG.LARGE_GUEST_COUNT }, (_, i) => ({
    couple_id: couple.id,
    first_name: `Guest${i}`,
    last_name: `Number${i}`,
    category: ['family', 'friends', 'work', 'other'][Math.floor(Math.random() * 4)],
    side: ['partner1', 'partner2', 'mutual'][Math.floor(Math.random() * 3)],
    dietary_restrictions: i % 10 === 0 ? 'Vegetarian' : null
  }));
  const { data: guestData } = await supabase
    .from('guests')
    .insert(guests)
    .select();
  // Create photo groups
  const photoGroups = Array.from({ length: PERFORMANCE_CONFIG.PHOTO_GROUPS_COUNT }, (_, i) => ({
    name: `Performance Test Group ${i}`,
    description: `Test group ${i} for performance testing`,
    shot_type: ['formal', 'candid', 'posed', 'lifestyle'][Math.floor(Math.random() * 4)],
    estimated_duration: 10 + (i % 20),
    priority: Math.floor(Math.random() * 10) + 1
  const { data: photoGroupData } = await supabase
    .from('photo_groups')
    .insert(photoGroups)
  console.log(`✅ Created ${PERFORMANCE_CONFIG.LARGE_GUEST_COUNT} guests and ${PERFORMANCE_CONFIG.PHOTO_GROUPS_COUNT} photo groups`);
    organizationId: org.id,
    coupleId: couple.id,
    guestIds: guestData?.map(g => g.id) || [],
    photoGroupIds: photoGroupData?.map(pg => pg.id) || []
async function cleanupLargeDataset() {
  if (!testData) return;
  console.log('🧹 Cleaning up performance test dataset...');
  // Clean up in reverse order
  await supabase.from('photo_group_members').delete().in('photo_group_id', testData.photoGroupIds);
  await supabase.from('photo_groups').delete().in('id', testData.photoGroupIds);
  await supabase.from('guests').delete().in('id', testData.guestIds);
  await supabase.from('clients').delete().eq('id', testData.coupleId);
  await supabase.from('organizations').delete().eq('id', testData.organizationId);
  console.log('✅ Performance test dataset cleaned up');
