/**
 * Tests for useMobileErrorRecovery hook - Intelligent mobile error recovery with wedding-aware strategies
 * WS-198 Error Handling System - Team D Mobile & PWA Architecture
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { useMobileErrorRecovery } from '../../hooks/useMobileErrorRecovery'
// Mock the dependent hooks
vi.mock('../../hooks/useNetworkState', () => ({
  useNetworkState: vi.fn()
}))
vi.mock('../../hooks/useDeviceCapabilities', () => ({
  useDeviceCapabilities: vi.fn()
import { useNetworkState } from '../../hooks/useNetworkState'
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities'
const mockUseNetworkState = useNetworkState as ReturnType<typeof vi.fn>edFunction<typeof useNetworkState>
const mockUseDeviceCapabilities = useDeviceCapabilities as ReturnType<typeof vi.fn>edFunction<typeof useDeviceCapabilities>
// Mock console methods to avoid noise in tests
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn()
}
Object.assign(console, mockConsole)
describe('useMobileErrorRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default good network state
    mockUseNetworkState.mockReturnValue({
      networkState: {
        isOnline: true,
        type: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        quality: 'good',
        isWeddingEmergency: false
      }
    })
    // Default good device capabilities
    mockUseDeviceCapabilities.mockReturnValue({
      capabilities: {
        hasCamera: true,
        hasMicrophone: true,
        hasGPS: true,
        batteryLevel: 0.8,
        isCharging: false,
        isBatteryLow: false,
        deviceMemory: 8,
        hardwareConcurrency: 4,
        connectionType: 'wifi',
        isWeddingOptimizedDevice: true
  })
  it('should initialize with default recovery state', () => {
    const { result } = renderHook(() => useMobileErrorRecovery())
    expect(result.current.isRecovering).toBe(false)
    expect(result.current.recoveryAttempts).toBe(0)
    expect(result.current.lastError).toBe(null)
    expect(result.current.recoveryStrategy).toBe('standard')
    expect(result.current.canRetry).toBe(true)
  it('should handle API errors with standard recovery strategy', async () => {
    const mockError = new Error('API Error')
    const mockRetryFunction = vi.fn().mockResolvedValue('success')
    act(() => {
      result.current.handleError(mockError, mockRetryFunction, 'api_call')
    expect(result.current.isRecovering).toBe(true)
    expect(result.current.lastError).toBe(mockError)
    await waitFor(() => {
      expect(result.current.isRecovering).toBe(false)
      expect(mockRetryFunction).toHaveBeenCalledWith(1)
  it('should use wedding emergency strategy for critical errors on wedding day', async () => {
    // Mock wedding day emergency network
        type: 'cellular',
        effectiveType: 'slow-2g',
        downlink: 0.5,
        rtt: 2000,
        quality: 'poor',
        isWeddingEmergency: true
    const mockError = new Error('Photo upload failed')
    const mockRetryFunction = vi.fn()
      .mockRejectedValueOnce(new Error('Still failing'))
      .mockResolvedValue('success')
      result.current.handleError(mockError, mockRetryFunction, 'photo_upload')
    expect(result.current.recoveryStrategy).toBe('wedding_emergency')
      expect(mockRetryFunction).toHaveBeenCalledTimes(2)
    }, { timeout: 10000 })
  it('should use conservative strategy for low battery devices', async () => {
    // Mock low battery device
        batteryLevel: 0.1, // 10% battery
        isBatteryLow: true,
        deviceMemory: 4,
        hardwareConcurrency: 2,
        connectionType: 'cellular',
        isWeddingOptimizedDevice: false
    const mockError = new Error('Network timeout')
    expect(result.current.recoveryStrategy).toBe('conservative')
  it('should use aggressive strategy for high-end devices with good connection', () => {
    // Mock high-end device with excellent connection
        downlink: 20,
        rtt: 30,
        quality: 'excellent',
        batteryLevel: 0.9,
        isCharging: true,
        deviceMemory: 16,
        hardwareConcurrency: 8,
    const mockError = new Error('Temporary server error')
    expect(result.current.recoveryStrategy).toBe('aggressive')
  it('should respect maximum retry limits', async () => {
    const mockError = new Error('Persistent failure')
    const mockRetryFunction = vi.fn().mockRejectedValue(new Error('Still failing'))
      expect(result.current.canRetry).toBe(false)
      expect(result.current.recoveryAttempts).toBeGreaterThanOrEqual(3)
    }, { timeout: 15000 })
  it('should handle network offline scenario', async () => {
    // Mock offline state
        isOnline: false,
        type: 'none',
        downlink: 0,
        rtt: 0,
        quality: 'offline',
    const mockError = new Error('Network error')
    const mockRetryFunction = vi.fn().mockRejectedValue(new Error('Still offline'))
    expect(result.current.recoveryStrategy).toBe('offline_mode')
    }, { timeout: 5000 })
  it('should clear recovery state on successful retry', async () => {
    const mockError = new Error('Temporary error')
      expect(result.current.lastError).toBe(null)
      expect(result.current.recoveryAttempts).toBe(0)
  it('should handle different error types with appropriate strategies', async () => {
    const errorScenarios = [
      {
        type: 'photo_upload',
        error: new Error('Photo upload failed'),
        expectedStrategy: 'standard'
      },
        type: 'payment_processing',
        error: new Error('Payment failed'),
        type: 'timeline_update',
        error: new Error('Timeline sync failed'),
    ]
    for (const scenario of errorScenarios) {
      const mockRetryFunction = vi.fn().mockResolvedValue('success')
      
      act(() => {
        result.current.handleError(scenario.error, mockRetryFunction, scenario.type)
      })
      expect(result.current.recoveryStrategy).toBe(scenario.expectedStrategy)
      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false)
    }
  it('should provide clear recovery state for UI feedback', () => {
    expect(result.current).toHaveProperty('isRecovering')
    expect(result.current).toHaveProperty('recoveryAttempts')
    expect(result.current).toHaveProperty('lastError')
    expect(result.current).toHaveProperty('recoveryStrategy')
    expect(result.current).toHaveProperty('canRetry')
    expect(result.current).toHaveProperty('handleError')
    expect(result.current).toHaveProperty('clearError')
  it('should clear error state when clearError is called', () => {
    const mockError = new Error('Test error')
      result.current.clearError()
  it('should handle wedding day photo upload failures with maximum urgency', async () => {
    // Mock wedding emergency conditions
        effectiveType: '3g',
        downlink: 2,
        rtt: 500,
        quality: 'fair',
    const mockError = new Error('Critical ceremony photo upload failed')
    let attemptCount = 0
    const mockRetryFunction = vi.fn().mockImplementation(() => {
      attemptCount++
      if (attemptCount < 3) {
        return Promise.reject(new Error('Still failing'))
      return Promise.resolve('success')
      expect(mockRetryFunction).toHaveBeenCalledTimes(3)
    }, { timeout: 20000 })
})
