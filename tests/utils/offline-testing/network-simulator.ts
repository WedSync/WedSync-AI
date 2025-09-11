/**
 * Network Simulator for Offline Testing
 * WS-172: Comprehensive offline functionality testing
 * 
 * Simulates various network conditions for testing offline functionality
 * - Complete offline/online transitions
 * - Intermittent connectivity 
 * - Slow/fast network speeds
 * - Connection failures and recovery
 */

import { Page, BrowserContext } from '@playwright/test'

export interface NetworkCondition {
  name: string
  offline: boolean
  downloadThroughput?: number  // bytes per second
  uploadThroughput?: number    // bytes per second
  latency?: number             // milliseconds
}

export const NetworkConditions = {
  ONLINE: {
    name: 'Online',
    offline: false,
    downloadThroughput: 10000000, // 10MB/s
    uploadThroughput: 5000000,    // 5MB/s
    latency: 20
  } as NetworkCondition,

  OFFLINE: {
    name: 'Offline',
    offline: true
  } as NetworkCondition,

  SLOW_3G: {
    name: 'Slow 3G',
    offline: false,
    downloadThroughput: 400000,  // 400KB/s
    uploadThroughput: 400000,    // 400KB/s
    latency: 2000                // 2s latency
  } as NetworkCondition,

  FAST_3G: {
    name: 'Fast 3G',
    offline: false,
    downloadThroughput: 1600000, // 1.6MB/s
    uploadThroughput: 750000,    // 750KB/s
    latency: 562
  } as NetworkCondition,

  INTERMITTENT: {
    name: 'Intermittent',
    offline: false,
    downloadThroughput: 1000000,
    uploadThroughput: 500000,
    latency: 1000
  } as NetworkCondition
}

export class NetworkSimulator {
  private page: Page
  private context: BrowserContext
  private currentCondition: NetworkCondition
  private intermittentInterval: NodeJS.Timeout | null = null

  constructor(page: Page, context: BrowserContext) {
    this.page = page
    this.context = context
    this.currentCondition = NetworkConditions.ONLINE
  }

  /**
   * Set network condition immediately
   */
  async setNetworkCondition(condition: NetworkCondition): Promise<void> {
    this.currentCondition = condition
    
    if (condition.offline) {
      await this.context.setOffline(true)
    } else {
      await this.context.setOffline(false)
      
      // Set network throttling if supported
      if (condition.downloadThroughput && condition.uploadThroughput && condition.latency) {
        const client = await this.context.newCDPSession(this.page)
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: condition.downloadThroughput,
          uploadThroughput: condition.uploadThroughput,
          latency: condition.latency
        })
      }
    }

    // Dispatch network events to the page
    await this.page.evaluate((condition) => {
      const event = condition.offline ? new Event('offline') : new Event('online')
      window.dispatchEvent(event)
    }, condition)
  }

  /**
   * Simulate going offline
   */
  async goOffline(): Promise<void> {
    await this.setNetworkCondition(NetworkConditions.OFFLINE)
  }

  /**
   * Simulate coming back online
   */
  async goOnline(): Promise<void> {
    await this.setNetworkCondition(NetworkConditions.ONLINE)
  }

  /**
   * Simulate intermittent connectivity (random offline/online cycles)
   */
  async startIntermittentConnectivity(options: {
    onlineTime: number    // ms to stay online
    offlineTime: number   // ms to stay offline
    cycles?: number       // number of cycles (infinite if not specified)
  }): Promise<void> {
    this.stopIntermittentConnectivity()
    
    let cycleCount = 0
    const maxCycles = options.cycles || Infinity

    const cycle = async () => {
      if (cycleCount >= maxCycles) return

      // Go offline
      await this.goOffline()
      await this.wait(options.offlineTime)

      // Go online  
      await this.goOnline()
      await this.wait(options.onlineTime)

      cycleCount++
      if (cycleCount < maxCycles) {
        this.intermittentInterval = setTimeout(cycle, 100)
      }
    }

    cycle()
  }

  /**
   * Stop intermittent connectivity simulation
   */
  stopIntermittentConnectivity(): void {
    if (this.intermittentInterval) {
      clearTimeout(this.intermittentInterval)
      this.intermittentInterval = null
    }
  }

  /**
   * Simulate network failure during operation
   */
  async simulateNetworkFailureDuringOperation(
    operation: () => Promise<void>, 
    failAfterMs: number = 1000
  ): Promise<void> {
    // Start the operation
    const operationPromise = operation()
    
    // Wait specified time then fail network
    setTimeout(async () => {
      await this.goOffline()
    }, failAfterMs)

    try {
      await operationPromise
    } finally {
      // Always restore network after operation
      await this.goOnline()
    }
  }

  /**
   * Test network recovery scenarios
   */
  async testNetworkRecovery(
    beforeRecovery: () => Promise<void>,
    afterRecovery: () => Promise<void>,
    recoveryDelayMs: number = 2000
  ): Promise<void> {
    // Go offline
    await this.goOffline()
    
    // Execute pre-recovery operations
    await beforeRecovery()
    
    // Wait for recovery delay
    await this.wait(recoveryDelayMs)
    
    // Come back online
    await this.goOnline()
    
    // Wait for sync to complete
    await this.wait(1000)
    
    // Execute post-recovery operations
    await afterRecovery()
  }

  /**
   * Get current network condition
   */
  getCurrentCondition(): NetworkCondition {
    return this.currentCondition
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return this.currentCondition.offline
  }

  /**
   * Wait for specified milliseconds
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Simulate wedding day network conditions at remote venue
   */
  async simulateRemoteVenueNetwork(): Promise<void> {
    // Start with slow 3G (typical remote venue)
    await this.setNetworkCondition(NetworkConditions.SLOW_3G)
    await this.wait(2000)

    // Intermittent connectivity during peak usage
    await this.startIntermittentConnectivity({
      onlineTime: 3000,   // 3s online
      offlineTime: 1000,  // 1s offline  
      cycles: 3
    })

    await this.wait(15000) // 15s of intermittent

    // Complete network failure (coordinator needs offline mode)
    await this.goOffline()
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopIntermittentConnectivity()
    
    // Restore normal network
    await this.setNetworkCondition(NetworkConditions.ONLINE)
  }
}

/**
 * Wedding Coordinator Network Scenarios
 * Real-world testing scenarios for wedding day coordination
 */
export class WeddingCoordinatorNetworkScenarios {
  private networkSim: NetworkSimulator

  constructor(networkSim: NetworkSimulator) {
    this.networkSim = networkSim
  }

  /**
   * Scenario: Coordinator arrives at remote venue with poor connectivity
   */
  async remoteVenueArrival(): Promise<void> {
    // Initial slow connection
    await this.networkSim.setNetworkCondition(NetworkConditions.SLOW_3G)
    await this.wait(2000)

    // Connection drops as coordinator moves indoors
    await this.networkSim.goOffline()
  }

  /**
   * Scenario: Intermittent connectivity during wedding setup
   */
  async weddingSetupConnectivity(): Promise<void> {
    await this.networkSim.startIntermittentConnectivity({
      onlineTime: 5000,   // 5s online - enough to sync critical updates
      offlineTime: 3000,  // 3s offline - coordinator continues working
      cycles: 5
    })
  }

  /**
   * Scenario: Network recovery after ceremony (sync rush)
   */
  async postCeremonySync(): Promise<void> {
    // Offline during ceremony
    await this.networkSim.goOffline()
    await this.wait(3000)

    // Fast connection returns for photo upload and status updates
    await this.networkSim.setNetworkCondition(NetworkConditions.ONLINE)
  }

  /**
   * Scenario: Vendor check-in during poor connectivity
   */
  async vendorCheckInConnectivity(): Promise<void> {
    // Start online
    await this.networkSim.goOnline()
    await this.wait(1000)

    // Network fails during check-in process
    await this.networkSim.simulateNetworkFailureDuringOperation(
      async () => {
        await this.wait(2000) // Simulate check-in process
      },
      1500 // Network fails 1.5s into process
    )
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}