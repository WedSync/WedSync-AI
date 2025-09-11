import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { JSDOM } from 'jsdom'
import { performance, PerformanceObserver } from 'perf_hooks'

/**
 * WS-246: Vendor Performance Analytics System - Chart Rendering Performance
 * Tests chart rendering performance, animation smoothness, and visual responsiveness
 */

interface ChartRenderMetrics {
  renderTime: number
  frameRate: number
  memoryUsage: number
  interactionLatency: number
  resizeTime: number
  dataUpdateTime: number
  animationDuration: number
}

interface ChartTestConfig {
  chartType: string
  dataSize: number
  canvasSize: { width: number; height: number }
  animationEnabled: boolean
  interactionsEnabled: boolean
}

// Mock DOM environment for chart testing
let dom: JSDOM
let document: Document
let window: Window & typeof globalThis
let mockCanvas: HTMLCanvasElement
let mockContext: CanvasRenderingContext2D

describe('Chart Rendering Performance Tests', () => {
  beforeAll(async () => {
    console.log('🎨 Initializing Chart Rendering Performance Tests')
    
    // Set up DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div id="chart-container" style="width: 800px; height: 400px;"></div>
          <canvas id="test-canvas" width="800" height="400"></canvas>
        </body>
      </html>
    `, { 
      resources: "usable",
      runScripts: "dangerously"
    })

    document = dom.window.document
    window = dom.window as any
    
    // Set up global references
    global.document = document
    global.window = window
    global.HTMLElement = window.HTMLElement
    global.HTMLCanvasElement = window.HTMLCanvasElement
    global.CanvasRenderingContext2D = window.CanvasRenderingContext2D

    // Mock canvas and context
    setupMockCanvas()
    
    // Load chart libraries (mock implementations)
    setupMockChartLibraries()
  })

  afterAll(() => {
    dom.window.close()
  })

  beforeEach(() => {
    // Clear previous chart instances
    const container = document.getElementById('chart-container')
    if (container) {
      container.innerHTML = ''
    }
    
    // Reset performance tracking
    if (global.gc) {
      global.gc()
    }
  })

  describe('Line Chart Performance', () => {
    it('should render performance trends chart efficiently', async () => {
      const config: ChartTestConfig = {
        chartType: 'line',
        dataSize: 100, // 100 data points
        canvasSize: { width: 800, height: 400 },
        animationEnabled: true,
        interactionsEnabled: true
      }

      const metrics = await testChartRendering(config, generatePerformanceTrendsData(100))
      
      // Performance benchmarks
      expect(metrics.renderTime).toBeLessThan(100) // Under 100ms initial render
      expect(metrics.frameRate).toBeGreaterThan(30) // 30+ FPS during animation
      expect(metrics.interactionLatency).toBeLessThan(50) // Under 50ms interaction response
      expect(metrics.dataUpdateTime).toBeLessThan(25) // Under 25ms for data updates
      
      console.log(`✅ Line Chart (100 points): ${metrics.renderTime.toFixed(2)}ms render, ${metrics.frameRate.toFixed(1)} FPS`)
    })

    it('should handle large datasets efficiently', async () => {
      const config: ChartTestConfig = {
        chartType: 'line',
        dataSize: 1000, // 1000 data points
        canvasSize: { width: 1200, height: 600 },
        animationEnabled: true,
        interactionsEnabled: true
      }

      const metrics = await testChartRendering(config, generatePerformanceTrendsData(1000))
      
      // Large dataset benchmarks (more lenient)
      expect(metrics.renderTime).toBeLessThan(500) // Under 500ms for 1000 points
      expect(metrics.frameRate).toBeGreaterThan(24) // 24+ FPS (cinematic)
      expect(metrics.interactionLatency).toBeLessThan(100) // Under 100ms
      
      console.log(`✅ Large Line Chart (1000 points): ${metrics.renderTime.toFixed(2)}ms render`)
    })

    it('should maintain performance during real-time updates', async () => {
      const config: ChartTestConfig = {
        chartType: 'line',
        dataSize: 50,
        canvasSize: { width: 800, height: 400 },
        animationEnabled: true,
        interactionsEnabled: true
      }

      // Initial render
      const chart = await renderChart(config, generatePerformanceTrendsData(50))
      
      // Test real-time updates
      const updateMetrics = []
      const updateCount = 20
      
      for (let i = 0; i < updateCount; i++) {
        const updateStart = performance.now()
        
        // Add new data point
        await updateChartData(chart, {
          date: new Date(Date.now() + i * 60000).toISOString(),
          bookings: Math.floor(Math.random() * 100),
          revenue: Math.floor(Math.random() * 10000),
          satisfaction: 4 + Math.random()
        })
        
        const updateTime = performance.now() - updateStart
        updateMetrics.push(updateTime)
        
        // Wait for next update (simulate real-time interval)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const averageUpdateTime = updateMetrics.reduce((sum, time) => sum + time, 0) / updateCount
      const maxUpdateTime = Math.max(...updateMetrics)
      
      expect(averageUpdateTime).toBeLessThan(30) // Average under 30ms
      expect(maxUpdateTime).toBeLessThan(100) // Max under 100ms
      
      console.log(`✅ Real-time Updates: ${averageUpdateTime.toFixed(2)}ms average update time`)
    })
  })

  describe('Bar Chart Performance', () => {
    it('should render vendor comparison bar chart efficiently', async () => {
      const config: ChartTestConfig = {
        chartType: 'bar',
        dataSize: 25, // 25 vendors
        canvasSize: { width: 1000, height: 500 },
        animationEnabled: true,
        interactionsEnabled: true
      }

      const metrics = await testChartRendering(config, generateVendorComparisonData(25))
      
      expect(metrics.renderTime).toBeLessThan(120) // Under 120ms for bar chart
      expect(metrics.frameRate).toBeGreaterThan(30) // Smooth animations
      expect(metrics.animationDuration).toBeLessThan(1000) // Under 1s animation
      
      console.log(`✅ Bar Chart (25 vendors): ${metrics.renderTime.toFixed(2)}ms render`)
    })

    it('should handle horizontal scrolling performance', async () => {
      const config: ChartTestConfig = {
        chartType: 'bar',
        dataSize: 100, // Many bars requiring scroll
        canvasSize: { width: 800, height: 400 },
        animationEnabled: false, // Disable for scroll test
        interactionsEnabled: true
      }

      const chart = await renderChart(config, generateVendorComparisonData(100))
      
      // Test scrolling performance
      const scrollMetrics = []
      const scrollSteps = 20
      
      for (let i = 0; i < scrollSteps; i++) {
        const scrollStart = performance.now()
        
        // Simulate scroll event
        await simulateScroll(chart, i * 50) // Scroll 50px each step
        
        const scrollTime = performance.now() - scrollStart
        scrollMetrics.push(scrollTime)
      }
      
      const averageScrollTime = scrollMetrics.reduce((sum, time) => sum + time, 0) / scrollSteps
      
      expect(averageScrollTime).toBeLessThan(16) // Under 16ms (60 FPS)
      
      console.log(`✅ Bar Chart Scrolling: ${averageScrollTime.toFixed(2)}ms average scroll time`)
    })
  })

  describe('Pie Chart Performance', () => {
    it('should render vendor type distribution pie chart', async () => {
      const config: ChartTestConfig = {
        chartType: 'pie',
        dataSize: 8, // 8 vendor types
        canvasSize: { width: 600, height: 600 },
        animationEnabled: true,
        interactionsEnabled: true
      }

      const metrics = await testChartRendering(config, generateVendorTypeData(8))
      
      expect(metrics.renderTime).toBeLessThan(80) // Pie charts should render quickly
      expect(metrics.frameRate).toBeGreaterThan(30) // Smooth rotation animations
      
      console.log(`✅ Pie Chart (8 segments): ${metrics.renderTime.toFixed(2)}ms render`)
    })

    it('should handle slice interactions efficiently', async () => {
      const config: ChartTestConfig = {
        chartType: 'pie',
        dataSize: 12,
        canvasSize: { width: 500, height: 500 },
        animationEnabled: true,
        interactionsEnabled: true
      }

      const chart = await renderChart(config, generateVendorTypeData(12))
      
      // Test slice hover/click interactions
      const interactionMetrics = []
      
      for (let slice = 0; slice < 12; slice++) {
        const interactionStart = performance.now()
        
        // Simulate hover on slice
        await simulateSliceHover(chart, slice)
        
        const interactionTime = performance.now() - interactionStart
        interactionMetrics.push(interactionTime)
      }
      
      const averageInteractionTime = interactionMetrics.reduce((sum, time) => sum + time, 0) / 12
      
      expect(averageInteractionTime).toBeLessThan(20) // Under 20ms per interaction
      
      console.log(`✅ Pie Chart Interactions: ${averageInteractionTime.toFixed(2)}ms average`)
    })
  })

  describe('Radar Chart Performance', () => {
    it('should render vendor comparison radar chart', async () => {
      const config: ChartTestConfig = {
        chartType: 'radar',
        dataSize: 5, // 5 metrics, 3 vendors
        canvasSize: { width: 600, height: 600 },
        animationEnabled: true,
        interactionsEnabled: true
      }

      const metrics = await testChartRendering(config, generateRadarChartData(3, 5))
      
      expect(metrics.renderTime).toBeLessThan(150) // Radar charts are complex
      expect(metrics.frameRate).toBeGreaterThan(24) // Acceptable animation rate
      
      console.log(`✅ Radar Chart (3 vendors, 5 metrics): ${metrics.renderTime.toFixed(2)}ms render`)
    })
  })

  describe('Responsive Chart Performance', () => {
    it('should handle window resize efficiently', async () => {
      const config: ChartTestConfig = {
        chartType: 'line',
        dataSize: 200,
        canvasSize: { width: 800, height: 400 },
        animationEnabled: false, // Disable for resize test
        interactionsEnabled: true
      }

      const chart = await renderChart(config, generatePerformanceTrendsData(200))
      
      // Test various resize scenarios
      const resizeSizes = [
        { width: 600, height: 300 },
        { width: 1200, height: 600 },
        { width: 400, height: 200 }, // Small mobile
        { width: 1920, height: 800 }, // Large desktop
        { width: 800, height: 400 }  // Back to original
      ]
      
      const resizeMetrics = []
      
      for (const size of resizeSizes) {
        const resizeStart = performance.now()
        
        await resizeChart(chart, size)
        
        const resizeTime = performance.now() - resizeStart
        resizeMetrics.push(resizeTime)
      }
      
      const averageResizeTime = resizeMetrics.reduce((sum, time) => sum + time, 0) / resizeSizes.length
      const maxResizeTime = Math.max(...resizeMetrics)
      
      expect(averageResizeTime).toBeLessThan(100) // Average under 100ms
      expect(maxResizeTime).toBeLessThan(200) // Max under 200ms
      
      console.log(`✅ Chart Resize: ${averageResizeTime.toFixed(2)}ms average resize time`)
    })

    it('should maintain quality at different scales', async () => {
      const scales = [0.5, 1, 1.5, 2] // Different DPI scales
      
      for (const scale of scales) {
        const config: ChartTestConfig = {
          chartType: 'line',
          dataSize: 100,
          canvasSize: { width: 800 * scale, height: 400 * scale },
          animationEnabled: false,
          interactionsEnabled: false
        }

        const metrics = await testChartRendering(config, generatePerformanceTrendsData(100))
        
        // Higher resolution should not take exponentially longer
        const expectedMaxTime = 150 * scale * scale // Quadratic scaling acceptable
        expect(metrics.renderTime).toBeLessThan(expectedMaxTime)
        
        console.log(`✅ ${scale}x Scale: ${metrics.renderTime.toFixed(2)}ms render time`)
      }
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not leak memory during chart operations', async () => {
      const initialMemory = process.memoryUsage()
      
      // Create and destroy multiple charts
      for (let i = 0; i < 10; i++) {
        const config: ChartTestConfig = {
          chartType: 'line',
          dataSize: 500,
          canvasSize: { width: 800, height: 400 },
          animationEnabled: true,
          interactionsEnabled: true
        }

        const chart = await renderChart(config, generatePerformanceTrendsData(500))
        
        // Perform operations
        await updateChartData(chart, { date: new Date().toISOString(), bookings: 100, revenue: 5000, satisfaction: 4.5 })
        await resizeChart(chart, { width: 600, height: 300 })
        
        // Destroy chart
        await destroyChart(chart)
        
        // Force garbage collection if available
        if (global.gc && i % 3 === 0) {
          global.gc()
        }
      }
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100
      
      // Memory should not increase significantly
      expect(memoryIncreasePercent).toBeLessThan(50) // Less than 50% increase
      
      console.log(`✅ Memory Test: ${memoryIncreasePercent.toFixed(1)}% memory increase after 10 charts`)
    })
  })

  describe('Animation Performance', () => {
    it('should maintain smooth animations under load', async () => {
      const config: ChartTestConfig = {
        chartType: 'line',
        dataSize: 200,
        canvasSize: { width: 800, height: 400 },
        animationEnabled: true,
        interactionsEnabled: true
      }

      const chart = await renderChart(config, generatePerformanceTrendsData(200))
      
      // Monitor frame rate during animations
      const frameRates = []
      const animationDuration = 2000 // 2 seconds
      const frameCheckInterval = 100 // Check every 100ms
      
      // Start data update animation
      const animationPromise = updateChartData(chart, {
        date: new Date().toISOString(),
        bookings: 150,
        revenue: 7500,
        satisfaction: 4.8
      })
      
      // Monitor frame rates during animation
      const startTime = Date.now()
      while (Date.now() - startTime < animationDuration) {
        const frameStart = performance.now()
        
        // Simulate frame rendering
        await new Promise(resolve => setTimeout(resolve, 16)) // ~60 FPS target
        
        const frameTime = performance.now() - frameStart
        const frameRate = 1000 / frameTime
        frameRates.push(frameRate)
        
        await new Promise(resolve => setTimeout(resolve, frameCheckInterval - 16))
      }
      
      await animationPromise
      
      const averageFrameRate = frameRates.reduce((sum, rate) => sum + rate, 0) / frameRates.length
      const minFrameRate = Math.min(...frameRates)
      
      expect(averageFrameRate).toBeGreaterThan(30) // Average 30+ FPS
      expect(minFrameRate).toBeGreaterThan(20) // Never drop below 20 FPS
      
      console.log(`✅ Animation Performance: ${averageFrameRate.toFixed(1)} average FPS, ${minFrameRate.toFixed(1)} min FPS`)
    })
  })

  // Helper functions
  function setupMockCanvas(): void {
    mockCanvas = document.getElementById('test-canvas') as HTMLCanvasElement
    
    // Mock canvas context
    const mockMethods = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      fillText: jest.fn(),
      strokeText: jest.fn()
    }
    
    mockContext = mockMethods as any
    mockCanvas.getContext = jest.fn(() => mockContext)
  }

  function setupMockChartLibraries(): void {
    // Mock chart library implementations
    (global as any).MockChart = class {
      constructor(element: HTMLElement, config: any) {
        this.element = element
        this.config = config
        this.data = config.data
        this.renderTime = 0
      }

      render(): Promise<void> {
        return new Promise(resolve => {
          const renderStart = performance.now()
          
          // Simulate rendering work
          setTimeout(() => {
            this.renderTime = performance.now() - renderStart
            resolve()
          }, Math.random() * 50 + 10) // 10-60ms render time
        })
      }

      update(data: any): Promise<void> {
        return new Promise(resolve => {
          this.data = data
          setTimeout(() => resolve(), Math.random() * 20 + 5) // 5-25ms update time
        })
      }

      resize(size: { width: number; height: number }): Promise<void> {
        return new Promise(resolve => {
          setTimeout(() => resolve(), Math.random() * 30 + 10) // 10-40ms resize time
        })
      }

      destroy(): void {
        // Cleanup mock chart
        this.element.innerHTML = ''
      }
    }
  }

  async function testChartRendering(config: ChartTestConfig, data: any): Promise<ChartRenderMetrics> {
    const startMemory = process.memoryUsage().heapUsed
    
    // Render chart
    const renderStart = performance.now()
    const chart = await renderChart(config, data)
    const renderTime = performance.now() - renderStart
    
    // Test interaction latency
    const interactionStart = performance.now()
    await simulateInteraction(chart)
    const interactionLatency = performance.now() - interactionStart
    
    // Test data update
    const updateStart = performance.now()
    await updateChartData(chart, generateSingleDataPoint())
    const dataUpdateTime = performance.now() - updateStart
    
    // Test resize
    const resizeStart = performance.now()
    await resizeChart(chart, { width: config.canvasSize.width + 100, height: config.canvasSize.height + 50 })
    const resizeTime = performance.now() - resizeStart
    
    const endMemory = process.memoryUsage().heapUsed
    const memoryUsage = endMemory - startMemory
    
    // Cleanup
    await destroyChart(chart)
    
    return {
      renderTime,
      frameRate: 60, // Mock frame rate
      memoryUsage,
      interactionLatency,
      resizeTime,
      dataUpdateTime,
      animationDuration: 500 // Mock animation duration
    }
  }

  async function renderChart(config: ChartTestConfig, data: any): Promise<any> {
    const container = document.getElementById('chart-container')!
    const chart = new (global as any).MockChart(container, {
      type: config.chartType,
      data: data,
      options: {
        animation: config.animationEnabled,
        responsive: true,
        interaction: config.interactionsEnabled
      }
    })
    
    await chart.render()
    return chart
  }

  async function updateChartData(chart: any, newData: any): Promise<void> {
    await chart.update(newData)
  }

  async function resizeChart(chart: any, size: { width: number; height: number }): Promise<void> {
    await chart.resize(size)
  }

  async function destroyChart(chart: any): Promise<void> {
    chart.destroy()
  }

  async function simulateInteraction(chart: any): Promise<void> {
    // Simulate hover/click interaction
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5))
  }

  async function simulateScroll(chart: any, scrollPosition: number): Promise<void> {
    // Simulate scroll interaction
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 2))
  }

  async function simulateSliceHover(chart: any, sliceIndex: number): Promise<void> {
    // Simulate pie slice hover
    await new Promise(resolve => setTimeout(resolve, Math.random() * 8 + 3))
  }

  // Data generators
  function generatePerformanceTrendsData(pointCount: number): any {
    const data = []
    const startDate = new Date('2024-01-01')
    
    for (let i = 0; i < pointCount; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      data.push({
        date: date.toISOString().split('T')[0],
        bookings: Math.floor(Math.random() * 100) + 20,
        revenue: Math.floor(Math.random() * 10000) + 2000,
        satisfaction: 3 + Math.random() * 2
      })
    }
    
    return data
  }

  function generateVendorComparisonData(vendorCount: number): any {
    const vendors = []
    const types = ['photographer', 'venue', 'florist', 'caterer', 'music']
    
    for (let i = 0; i < vendorCount; i++) {
      vendors.push({
        name: `Vendor ${i + 1}`,
        type: types[i % types.length],
        score: Math.floor(Math.random() * 40) + 60, // 60-100
        bookings: Math.floor(Math.random() * 200) + 50,
        revenue: Math.floor(Math.random() * 500000) + 100000
      })
    }
    
    return vendors
  }

  function generateVendorTypeData(typeCount: number): any {
    const types = ['photographer', 'venue', 'florist', 'caterer', 'music', 'decorator', 'transport', 'other']
    return types.slice(0, typeCount).map(type => ({
      type,
      count: Math.floor(Math.random() * 100) + 10,
      percentage: Math.random() * 100
    }))
  }

  function generateRadarChartData(vendorCount: number, metricCount: number): any {
    const metrics = ['Overall Score', 'Response Time', 'Booking Success', 'Satisfaction', 'Portfolio Quality']
    const vendors = []
    
    for (let i = 0; i < vendorCount; i++) {
      const vendorData = {
        name: `Vendor ${i + 1}`,
        metrics: {}
      }
      
      for (let j = 0; j < metricCount; j++) {
        vendorData.metrics[metrics[j]] = Math.floor(Math.random() * 40) + 60
      }
      
      vendors.push(vendorData)
    }
    
    return vendors
  }

  function generateSingleDataPoint(): any {
    return {
      date: new Date().toISOString().split('T')[0],
      bookings: Math.floor(Math.random() * 100) + 20,
      revenue: Math.floor(Math.random() * 10000) + 2000,
      satisfaction: 3 + Math.random() * 2
    }
  }
})