import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { usePWAInstall } from '../usePWAInstall';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});
// Mock analytics
const mockAnalytics = {
  track: jest.fn(),
  identify: jest.fn(),
  page: jest.fn(),
  group: jest.fn()
};
Object.defineProperty(window, 'analytics', {
  value: mockAnalytics,
  writable: true
// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
// Mock BeforeInstallPromptEvent
class MockBeforeInstallPromptEvent extends Event {
  platforms: string[] = ['web'];
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  
  constructor(outcome: 'accepted' | 'dismissed' = 'accepted') {
    super('beforeinstallprompt');
    this.userChoice = Promise.resolve({ outcome, platform: 'web' });
  }
  prompt = jest.fn().mockResolvedValue(undefined);
  preventDefault = jest.fn();
}
describe('usePWAInstall Hook', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockAnalytics.track.mockClear();
    
    // Reset user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
  });
  afterEach(() => {
    // Remove event listeners
    const events = ['beforeinstallprompt', 'appinstalled'];
    events.forEach(event => {
      window.removeEventListener(event, jest.fn() as EventListener);
  describe('Platform Detection', () => {
    it('should detect desktop platform correctly', () => {
      const { result } = renderHook(() => usePWAInstall());
      expect(result.current.platform).toBe('desktop');
    it('should detect iOS platform correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        writable: true
      });
      
      expect(result.current.platform).toBe('ios');
    it('should detect Android platform correctly', () => {
        value: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
      expect(result.current.platform).toBe('android');
  describe('Install State Management', () => {
    it('should initialize with correct default state', () => {
      expect(result.current.installState).toBe('available');
      expect(result.current.isInstallable).toBe(true);
      expect(result.current.isInstalled).toBe(false);
      expect(result.current.canShowPrompt).toBe(false);
    it('should detect already installed PWA', () => {
      window.matchMedia = jest.fn().mockReturnValue({
        matches: true,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      expect(result.current.installState).toBe('installed');
      expect(result.current.isInstalled).toBe(true);
    it('should handle dismissed state correctly', () => {
      const dismissedTime = Date.now() - (1000 * 60 * 60 * 24 * 3); // 3 days ago
      mockLocalStorage.setItem('pwa-prompt-dismissed', dismissedTime.toString());
      expect(result.current.installState).toBe('dismissed');
    it('should allow prompt after 7 days of dismissal', () => {
      const dismissedTime = Date.now() - (1000 * 60 * 60 * 24 * 8); // 8 days ago
  describe('BeforeInstallPrompt Event Handling', () => {
    it('should handle beforeinstallprompt event correctly', async () => {
      const mockEvent = new MockBeforeInstallPromptEvent();
      await act(async () => {
        window.dispatchEvent(mockEvent);
        // Wait for timeout
        await new Promise(resolve => setTimeout(resolve, 2100));
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.canShowPrompt).toBe(true);
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        'pwa_install_prompt_available',
        expect.objectContaining({
          platform: 'desktop'
        })
      );
    it('should handle appinstalled event correctly', () => {
      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
        'pwa_install_completed',
  describe('Install Prompt Actions', () => {
    it('should show install prompt successfully', async () => {
      const mockEvent = new MockBeforeInstallPromptEvent('accepted');
      // Set up the deferred prompt
      // Show install prompt
      let promptResult;
        promptResult = await result.current.showInstallPrompt('button');
      expect(promptResult).toBe(true);
      expect(mockEvent.prompt).toHaveBeenCalled();
        'pwa_install_prompt_shown',
          source: 'button'
        'pwa_install_accepted',
    it('should handle iOS install prompt correctly', async () => {
          source: 'button',
          platform: 'ios'
        'pwa_install_instructions_shown',
    it('should handle dismissed install prompt', async () => {
      const mockEvent = new MockBeforeInstallPromptEvent('dismissed');
        promptResult = await result.current.showInstallPrompt('banner');
      expect(promptResult).toBe(false);
        'pwa_install_dismissed',
          source: 'banner'
    it('should handle unavailable install prompt', async () => {
        promptResult = await result.current.showInstallPrompt('menu');
        'pwa_install_prompt_unavailable',
          source: 'menu'
  describe('Dismiss Functionality', () => {
    it('should dismiss prompt correctly', () => {
        result.current.dismissPrompt();
      expect(mockLocalStorage.getItem('pwa-prompt-dismissed')).toBeTruthy();
        'pwa_install_prompt_dismissed',
  describe('Analytics Integration', () => {
    it('should track events with correct data structure', () => {
        result.current.trackInstallEvent('custom_event', {
          source: 'dashboard',
          user_id: 'test-user-123'
        });
        'pwa_custom_event',
          platform: 'desktop',
          user_id: 'test-user-123',
          timestamp: expect.any(String)
    it('should fallback to console in development when analytics unavailable', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      // Remove analytics
      Object.defineProperty(window, 'analytics', {
        value: undefined,
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
        result.current.trackInstallEvent('test_event');
      expect(consoleSpy).toHaveBeenCalledWith(
        'PWA Event: pwa_test_event',
      // Restore
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
        value: mockAnalytics,
  describe('Platform Capability Detection', () => {
    it('should detect iOS version compatibility', () => {
      // iOS 11.3+ should support PWA
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X)',
    it('should handle unsupported platforms gracefully', () => {
        value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2)',
      expect(result.current.platform).toBe('unsupported');
      expect(result.current.installState).toBe('unsupported');
      expect(result.current.isInstallable).toBe(false);
  describe('Error Handling', () => {
    it('should handle install prompt errors gracefully', async () => {
      // Mock prompt to throw error
      mockEvent.prompt = jest.fn().mockRejectedValue(new Error('Install failed'));
        'pwa_install_error',
  describe('Memory Management', () => {
    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => usePWAInstall());
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
        'appinstalled',
      removeEventListenerSpy.mockRestore();
