/**
 * WS-239 Mobile AI Features Testing
 * Testing AI functionality on mobile devices with offline capabilities
 * 60% of wedding suppliers use mobile - critical for venue visits and events
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { MobileAIManager } from '@/lib/ai/mobile-ai-manager'
import { OfflineSyncService } from '@/lib/ai/offline-sync-service'
import { MobileBatteryOptimizer } from '@/lib/ai/mobile-battery-optimizer'
import { NetworkQualityDetector } from '@/lib/ai/network-quality-detector'
import { createMockWeddingVendor } from '../../setup'

// Mock mobile-specific APIs
const mockMobileAPIs = {
  navigator: {
    onLine: true,
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false
    }
  },
  battery: {
    level: 0.8,
    charging: false,
    dischargingTime: 14400 // 4 hours
  },
  geolocation: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn()
  }
}

// Mock mobile storage
const mockLocalStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock IndexedDB for offline data
const mockIndexedDB = {
  open: vi.fn(),
  transaction: vi.fn(),
  objectStore: vi.fn(),
  add: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}

describe('Mobile AI Features Testing - WS-239', () => {
  let mobileAIManager: MobileAIManager
  let offlineSyncService: OfflineSyncService
  let batteryOptimizer: MobileBatteryOptimizer
  let networkDetector: NetworkQualityDetector
  let mobilePhotographer: any
  let venueCoordinator: any
  let weddingPlanner: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock mobile environment
    Object.defineProperty(global, 'navigator', {
      value: mockMobileAPIs.navigator,
      writable: true
    })

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Setup mobile-focused wedding suppliers
    mobilePhotographer = createMockWeddingVendor({
      id: 'mobile-photographer-001',
      service_type: 'photographer',
      mobile_primary: true,
      field_work_percentage: 90, // 90% of work done on mobile
      offline_requirements: {
        photo_tagging: true,
        client_notes: true,
        timeline_updates: true
      },
      device_capabilities: {
        camera_quality: 'professional',
        storage_available: '128GB',
        processing_power: 'high'
      }
    })

    venueCoordinator = createMockWeddingVendor({
      id: 'venue-mobile-manager-002',
      service_type: 'venue',
      mobile_primary: true,
      venue_tours_monthly: 25,
      connectivity_challenges: {
        basement_areas: true,
        rural_location: false,
        wifi_reliability: 'medium'
      }
    })

    weddingPlanner = createMockWeddingVendor({
      id: 'planner-mobile-pro-003',
      service_type: 'wedding_planner',
      travels_to_venues: true,
      client_meetings_mobile: 80, // 80% of meetings on mobile
      multi_vendor_coordination: true
    })

    // Initialize mobile services
    networkDetector = new NetworkQualityDetector()
    batteryOptimizer = new MobileBatteryOptimizer()
    offlineSyncService = new OfflineSyncService(mockIndexedDB)
    mobileAIManager = new MobileAIManager(
      networkDetector,
      batteryOptimizer,
      offlineSyncService
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Network Quality Detection and Adaptation', () => {
    test('should detect network quality and adapt AI processing accordingly', async () => {
      // Test different network conditions
      const networkConditions = [
        { effectiveType: '4g', downlink: 15, rtt: 30, quality: 'excellent' },
        { effectiveType: '3g', downlink: 3, rtt: 200, quality: 'good' },
        { effectiveType: '2g', downlink: 0.5, rtt: 800, quality: 'poor' },
        { effectiveType: 'slow-2g', downlink: 0.1, rtt: 2000, quality: 'offline' }
      ]

      for (const condition of networkConditions) {
        // Mock network condition
        mockMobileAPIs.navigator.connection = condition

        const networkAdaptation = await networkDetector.adaptToNetworkQuality({
          supplierId: mobilePhotographer.id,
          requestType: 'photo_tagging',
          batchSize: 10
        })

        if (condition.quality === 'excellent') {
          expect(networkAdaptation.strategy).toBe('full_quality')
          expect(networkAdaptation.batchSize).toBe(10)
          expect(networkAdaptation.compression).toBe(false)
        } else if (condition.quality === 'poor') {
          expect(networkAdaptation.strategy).toBe('compression_mode')
          expect(networkAdaptation.batchSize).toBeLessThan(5)
          expect(networkAdaptation.compression).toBe(true)
        } else if (condition.quality === 'offline') {
          expect(networkAdaptation.strategy).toBe('offline_mode')
          expect(networkAdaptation.queueForSync).toBe(true)
        }
      }
    })

    test('should handle network connectivity transitions gracefully', async () => {
      // Start online
      mockMobileAPIs.navigator.onLine = true
      
      // Process AI request online
      const onlineRequest = mobileAIManager.processRequest({
        supplierId: mobilePhotographer.id,
        requestType: 'photo_tagging',
        content: 'Wedding ceremony photos - batch 1',
        photos: Array.from({ length: 5 }, (_, i) => ({
          id: `photo-${i}`,
          url: `https://example.com/photo-${i}.jpg`
        }))
      })

      // Simulate going offline mid-request
      setTimeout(() => {
        mockMobileAPIs.navigator.onLine = false
      }, 500)

      const result = await onlineRequest

      expect(result.handled).toBe(true)
      expect(result.strategy).toMatch(/graceful_degradation|offline_queue/)
      expect(result.dataPreserved).toBe(true)
    })

    test('should optimize data usage when on limited data plans', async () => {
      mockMobileAPIs.navigator.connection.saveData = true

      const dataOptimization = await mobileAIManager.processWithDataSaving({
        supplierId: venueCoordinator.id,
        requestType: 'venue_description',
        content: 'Generate description for garden wedding venue',
        optimizations: {
          compressionEnabled: true,
          reduceImageQuality: true,
          batchRequests: true
        }
      })

      expect(dataOptimization.dataSaved).toBeGreaterThan(0)
      expect(dataOptimization.compressionRatio).toBeGreaterThan(0.5)
      expect(dataOptimization.qualityPreserved).toBeGreaterThan(0.8) // 80%+ quality maintained
      expect(dataOptimization.requestsBatched).toBe(true)
    })
  })

  describe('Offline AI Functionality', () => {
    test('should cache AI models for offline photo tagging', async () => {
      const modelCaching = await offlineSyncService.cacheAIModels({
        supplierId: mobilePhotographer.id,
        models: [
          {
            type: 'photo_tagging',
            size: '50MB',
            accuracy: 0.92,
            offline_capable: true
          },
          {
            type: 'face_detection',
            size: '25MB',
            accuracy: 0.95,
            offline_capable: true
          }
        ],
        storage_limit: '200MB'
      })

      expect(modelCaching.success).toBe(true)
      expect(modelCaching.modelsCached).toBe(2)
      expect(modelCaching.totalSize).toBe('75MB')
      expect(modelCaching.estimatedOfflineCapability).toBeGreaterThan(0.9)

      // Verify models are stored locally
      expect(mockIndexedDB.add).toHaveBeenCalledWith({
        type: 'photo_tagging',
        data: expect.any(Object),
        timestamp: expect.any(Date)
      })
    })

    test('should process AI requests offline using cached models', async () => {
      // Mock offline state
      mockMobileAPIs.navigator.onLine = false

      // Setup cached model
      mockIndexedDB.get.mockResolvedValueOnce({
        type: 'photo_tagging',
        model: { /* cached model data */ },
        lastUpdated: new Date()
      })

      const offlineProcessing = await mobileAIManager.processOfflineRequest({
        supplierId: mobilePhotographer.id,
        requestType: 'photo_tagging',
        photos: [
          { id: 'offline-photo-1', localPath: '/storage/photo1.jpg' },
          { id: 'offline-photo-2', localPath: '/storage/photo2.jpg' }
        ]
      })

      expect(offlineProcessing.success).toBe(true)
      expect(offlineProcessing.processedOffline).toBe(true)
      expect(offlineProcessing.results).toHaveLength(2)
      expect(offlineProcessing.queuedForSync).toBe(true)

      // Verify results queued for sync when online
      expect(mockIndexedDB.add).toHaveBeenCalledWith({
        type: 'sync_queue',
        data: expect.objectContaining({
          results: expect.any(Array),
          timestamp: expect.any(Date)
        })
      })
    })

    test('should sync offline processed data when connection restored', async () => {
      // Setup offline queue data
      mockIndexedDB.getAll.mockResolvedValueOnce([
        {
          id: 'offline-batch-1',
          type: 'photo_tagging',
          results: [
            { photoId: 'photo-1', tags: ['bride', 'ceremony', 'flowers'] },
            { photoId: 'photo-2', tags: ['groom', 'ceremony', 'rings'] }
          ],
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          supplierId: mobilePhotographer.id
        },
        {
          id: 'offline-batch-2',
          type: 'venue_notes',
          results: [
            { noteId: 'note-1', content: 'Beautiful garden setup', aiEnhanced: true }
          ],
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          supplierId: venueCoordinator.id
        }
      ])

      // Restore connection
      mockMobileAPIs.navigator.onLine = true

      const syncResult = await offlineSyncService.syncOfflineData({
        priority: 'time_based', // Sync oldest first
        batchSize: 5
      })

      expect(syncResult.success).toBe(true)
      expect(syncResult.itemsSynced).toBe(2)
      expect(syncResult.conflicts).toBe(0)
      expect(syncResult.syncDuration).toBeLessThan(30000) // <30s sync time

      // Verify offline data cleared after successful sync
      expect(mockIndexedDB.delete).toHaveBeenCalledTimes(2)
    })

    test('should handle sync conflicts when data was modified online', async () => {
      const conflictScenario = await offlineSyncService.handleSyncConflicts({
        offlineData: {
          photoId: 'conflict-photo-1',
          tags: ['bride', 'ceremony'], // Offline tags
          lastModified: new Date(Date.now() - 3600000) // 1 hour ago
        },
        onlineData: {
          photoId: 'conflict-photo-1',
          tags: ['bride', 'ceremony', 'bouquet'], // Online has additional tag
          lastModified: new Date(Date.now() - 1800000) // 30 minutes ago
        },
        resolutionStrategy: 'merge_intelligent'
      })

      expect(conflictScenario.resolved).toBe(true)
      expect(conflictScenario.strategy).toBe('merge_intelligent')
      expect(conflictScenario.finalTags).toEqual(['bride', 'ceremony', 'bouquet'])
      expect(conflictScenario.preservedOfflineWork).toBe(true)
    })
  })

  describe('Battery Optimization', () => {
    test('should optimize AI processing based on battery level', async () => {
      const batteryLevels = [
        { level: 0.9, charging: true, strategy: 'full_performance' },
        { level: 0.5, charging: false, strategy: 'balanced' },
        { level: 0.2, charging: false, strategy: 'power_saving' },
        { level: 0.05, charging: false, strategy: 'emergency_only' }
      ]

      for (const battery of batteryLevels) {
        mockMobileAPIs.battery = { ...battery, dischargingTime: 3600 }

        const optimization = await batteryOptimizer.optimizeForBattery({
          supplierId: mobilePhotographer.id,
          requestType: 'photo_batch_processing',
          estimatedProcessingTime: 300000, // 5 minutes
          currentBattery: battery
        })

        expect(optimization.strategy).toBe(battery.strategy)

        if (battery.strategy === 'power_saving') {
          expect(optimization.processingReduced).toBe(true)
          expect(optimization.batchSizeReduced).toBe(true)
          expect(optimization.backgroundProcessingDisabled).toBe(true)
        } else if (battery.strategy === 'emergency_only') {
          expect(optimization.nonEssentialDisabled).toBe(true)
          expect(optimization.emergencyModeActivated).toBe(true)
        }
      }
    })

    test('should defer non-critical AI processing when battery low', async () => {
      mockMobileAPIs.battery = { level: 0.15, charging: false, dischargingTime: 1800 }

      const batteryOptimizedProcessing = await mobileAIManager.processWithBatteryOptimization({
        supplierId: venueCoordinator.id,
        requests: [
          { id: 'critical-1', type: 'venue_emergency_note', priority: 'critical' },
          { id: 'normal-1', type: 'venue_description_update', priority: 'normal' },
          { id: 'low-1', type: 'marketing_content_generation', priority: 'low' }
        ]
      })

      expect(batteryOptimizedProcessing.criticalProcessed).toBe(1)
      expect(batteryOptimizedProcessing.deferredToCharging).toBe(2)
      expect(batteryOptimizedProcessing.estimatedBatterySaved).toBeGreaterThan(30) // >30% battery saved
    })

    test('should resume deferred processing when device starts charging', async () => {
      // Setup deferred tasks
      await batteryOptimizer.deferTasks({
        supplierId: mobilePhotographer.id,
        deferredTasks: [
          { id: 'deferred-1', type: 'photo_enhancement', estimatedTime: 120000 },
          { id: 'deferred-2', type: 'batch_organization', estimatedTime: 180000 }
        ]
      })

      // Simulate device starting to charge
      mockMobileAPIs.battery = { level: 0.2, charging: true, dischargingTime: Infinity }

      const resumeResult = await batteryOptimizer.resumeDeferredTasks({
        supplierId: mobilePhotographer.id,
        chargingPower: 'fast_charging'
      })

      expect(resumeResult.tasksResumed).toBe(2)
      expect(resumeResult.estimatedCompletionTime).toBeLessThan(300000) // <5 minutes
      expect(resumeResult.chargingOptimized).toBe(true)
    })
  })

  describe('Touch Interface Optimization', () => {
    test('should optimize AI controls for touch interfaces', async () => {
      const touchOptimization = await mobileAIManager.optimizeForTouch({
        supplierId: mobilePhotographer.id,
        screenSize: { width: 390, height: 844 }, // iPhone 12 Pro
        interface: 'photo_tagging',
        handedness: 'right' // Right-handed user
      })

      expect(touchOptimization.buttonSizeOptimized).toBe(true)
      expect(touchOptimization.minTouchTarget).toBeGreaterThanOrEqual(48) // 48px minimum
      expect(touchOptimization.thumbReachOptimized).toBe(true)
      expect(touchOptimization.gestureControls).toContain('swipe')
      expect(touchOptimization.oneHandedMode).toBe(true)
    })

    test('should implement voice controls for hands-free operation', async () => {
      const voiceControls = await mobileAIManager.setupVoiceControls({
        supplierId: mobilePhotographer.id,
        context: 'wedding_photography',
        commands: [
          'tag this photo as ceremony',
          'add bride and groom tags',
          'process current batch',
          'create timeline note'
        ]
      })

      expect(voiceControls.enabled).toBe(true)
      expect(voiceControls.recognitionAccuracy).toBeGreaterThan(0.9)
      expect(voiceControls.weddingVocabularyOptimized).toBe(true)
      expect(voiceControls.backgroundNoiseFiltering).toBe(true)
    })

    test('should handle multi-touch gestures for batch operations', async () => {
      const gestureHandling = await mobileAIManager.processMultiTouchGestures({
        supplierId: venueCoordinator.id,
        gesture: 'pinch_zoom_select',
        selection: {
          photos: ['photo-1', 'photo-2', 'photo-3', 'photo-4', 'photo-5'],
          operation: 'batch_tag_venue_areas'
        }
      })

      expect(gestureHandling.recognized).toBe(true)
      expect(gestureHandling.batchOperation).toBe('batch_tag_venue_areas')
      expect(gestureHandling.selectedItems).toBe(5)
      expect(gestureHandling.processingOptimized).toBe(true)
    })
  })

  describe('Wedding Venue Connectivity Challenges', () => {
    test('should handle poor venue WiFi conditions', async () => {
      const venueConnectivity = {
        wifiStrength: 'weak',
        bandwidth: 1.5, // Mbps
        latency: 800, // ms
        reliability: 0.6, // 60% packet success
        congestion: 'high' // Many connected devices
      }

      const connectivityAdaptation = await mobileAIManager.adaptToVenueConnectivity({
        supplierId: venueCoordinator.id,
        venueConditions: venueConnectivity,
        requestType: 'venue_tour_documentation',
        tourDuration: 1800000 // 30 minute tour
      })

      expect(connectivityAdaptation.strategy).toBe('aggressive_caching')
      expect(connectivityAdaptation.offlineFallback).toBe('enabled')
      expect(connectivityAdaptation.dataCompressionLevel).toBeGreaterThan(0.7)
      expect(connectivityAdaptation.requestQueuing).toBe('intelligent')
    })

    test('should handle basement/underground venue areas with no signal', async () => {
      const undergroundScenario = await mobileAIManager.handleNoSignalArea({
        supplierId: venueCoordinator.id,
        location: 'basement_reception_hall',
        estimatedDuration: 900000, // 15 minutes
        criticalOperations: [
          'room_capacity_notes',
          'accessibility_documentation',
          'vendor_setup_requirements'
        ]
      })

      expect(undergroundScenario.offlineModeActivated).toBe(true)
      expect(undergroundScenario.criticalDataCached).toBe(true)
      expect(undergroundScenario.syncScheduled).toBe(true)
      expect(undergroundScenario.estimatedSyncTime).toBeLessThan(300000) // <5 min sync when signal returns
    })

    test('should prioritize emergency communications over AI processing', async () => {
      // Simulate emergency scenario during venue visit
      const emergencyScenario = await mobileAIManager.handleEmergencyPriority({
        supplierId: venueCoordinator.id,
        emergency: {
          type: 'vendor_accident',
          priority: 'critical',
          requiresImmediate: 'communication'
        },
        currentAITasks: [
          { id: 'ai-task-1', type: 'photo_processing', progress: 0.3 },
          { id: 'ai-task-2', type: 'note_enhancement', progress: 0.7 }
        ]
      })

      expect(emergencyScenario.aiProcessingPaused).toBe(true)
      expect(emergencyScenario.networkReservedForEmergency).toBe(true)
      expect(emergencyScenario.tasksQueuedForLater).toBe(2)
      expect(emergencyScenario.emergencyChannelOpened).toBe(true)
    })
  })

  describe('Performance and Resource Management', () => {
    test('should maintain performance on older mobile devices', async () => {
      const oldDeviceOptimization = await mobileAIManager.optimizeForDevice({
        supplierId: mobilePhotographer.id,
        device: {
          model: 'iPhone_8',
          ram: '2GB',
          processor: 'A11_Bionic',
          year: 2017,
          performanceClass: 'legacy'
        },
        requestType: 'photo_batch_processing'
      })

      expect(oldDeviceOptimization.processingReduced).toBe(true)
      expect(oldDeviceOptimization.batchSizeOptimized).toBe(true)
      expect(oldDeviceOptimization.memoryManagement).toBe('aggressive')
      expect(oldDeviceOptimization.expectedPerformance).toBe('acceptable')
      expect(oldDeviceOptimization.qualityCompromise).toBeLessThan(0.1) // <10% quality loss
    })

    test('should handle memory pressure gracefully', async () => {
      const memoryPressure = await mobileAIManager.handleMemoryPressure({
        supplierId: mobilePhotographer.id,
        currentMemoryUsage: '1.8GB', // High usage
        availableMemory: '200MB',
        activeAITasks: 3,
        pressureLevel: 'critical'
      })

      expect(memoryPressure.tasksTerminated).toBeGreaterThan(0)
      expect(memoryPressure.cacheCleared).toBe(true)
      expect(memoryPressure.memoryFreed).toBeGreaterThan('500MB')
      expect(memoryPressure.essentialTasksPreserved).toBe(true)
    })

    test('should optimize for different mobile screen sizes', async () => {
      const screenSizes = [
        { width: 375, height: 667, device: 'iPhone_SE' },      // Small
        { width: 390, height: 844, device: 'iPhone_12_Pro' },  // Standard
        { width: 428, height: 926, device: 'iPhone_14_Plus' }  // Large
      ]

      for (const screen of screenSizes) {
        const uiOptimization = await mobileAIManager.optimizeUIForScreen({
          supplierId: weddingPlanner.id,
          screenSize: screen,
          orientation: 'portrait',
          interface: 'ai_controls'
        })

        expect(uiOptimization.layoutOptimized).toBe(true)
        expect(uiOptimization.touchTargetsAppropriate).toBe(true)
        expect(uiOptimization.contentVisible).toBe(true)
        
        if (screen.device === 'iPhone_SE') {
          expect(uiOptimization.compactMode).toBe(true)
          expect(uiOptimization.scrollOptimized).toBe(true)
        }
      }
    })
  })
})